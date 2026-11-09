// Client transport of the tracker (spec 100 §3.9, K1; review H3). JSON over
// `fetch` with `keepalive` for every flush, one AbortController per request
// (withdrawal aborts them all), one request in flight per tab, the first
// flush of a start serialised across tabs with the Web Locks API
// (`fa-first-flush`) so only one tab can mint `fa_vid`. Without Web Locks it
// runs unserialised (documented R13 limit). Nothing is ever persisted.
//
// `allowed()` is asked right before every fetch; `stop()` clears every timer
// and aborts a waiting lock request, so a stopped tracker sends nothing.

export type ClientEvent = Record<string, string | number | boolean | null>;

export interface LocksLike {
  request(name: string, options: { signal: AbortSignal }, callback: () => Promise<void>): Promise<unknown>;
}

export interface TransportDeps {
  fetch: typeof fetch;
  now: () => number;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
  locks: LocksLike | null;
  allowed: () => boolean;
  /** Envelope fields at send time; null = do not send. */
  envelope: () => { cv: number; consentDate: string; viewport: string | null } | null;
}

const MAX_QUEUE = 100;
const MAX_BODY = 7_680;
const FLUSH_AT = 20;
const FLUSH_AFTER_MS = 10_000;
const RETRY_MS = [5_000, 30_000];
const PAUSE_429_MS = 60_000;
export const COLLECT_URL = '/api/v';
const FIRST_FLUSH_LOCK = 'fa-first-flush';

interface Item {
  event: ClientEvent;
  attempts: number;
}

export class Transport {
  private queue: Item[] = [];
  private busy = false;
  private stopped = true;
  private controllers = new Set<AbortController>();
  private lockAbort: AbortController | null = null;
  private timers = new Set<unknown>();
  private flushTimer: unknown = null;
  private pausedUntil = 0;
  // A scheduled retry's back-off: nothing goes out before it (review N4).
  private retryUntil = 0;
  private firstPending = false;
  private resolveFirst: () => void = () => {};
  private first: Promise<void> = Promise.resolve();

  constructor(private deps: TransportDeps) {}

  /** Starts a new run: the next flush is the first one (serialised, flushed at once). */
  restart() {
    this.stopped = false;
    this.firstPending = true;
    this.first = new Promise((r) => (this.resolveFirst = r));
    this.retryUntil = 0; // the retried batch was dropped by stop()
    const pause = this.pausedUntil - this.deps.now();
    if (pause > 0) this.later(() => void this.flush(), pause); // a 429 pause still runs
  }

  private later(fn: () => void, ms: number) {
    const h = this.deps.setTimeout(() => {
      this.timers.delete(h);
      fn();
    }, ms);
    this.timers.add(h);
    return h;
  }

  push(event: ClientEvent, immediate = false) {
    if (this.stopped || this.queue.length >= MAX_QUEUE) return;
    this.queue.push({ event, attempts: 0 });
    if (immediate || this.queue.length >= FLUSH_AT) void this.flush();
    else if (this.flushTimer === null) {
      this.flushTimer = this.later(() => {
        this.flushTimer = null;
        void this.flush();
      }, FLUSH_AFTER_MS);
    }
  }

  /** Resolves once the first flush of this run answered, or after `maxMs`. */
  awaitFirstFlush(maxMs: number): Promise<void> {
    if (!this.firstPending) return Promise.resolve();
    return Promise.race([this.first, new Promise<void>((r) => this.later(r, maxMs))]);
  }

  async flush(): Promise<void> {
    if (this.stopped || this.busy || this.queue.length === 0) return;
    const now = this.deps.now();
    if (now < this.pausedUntil || now < this.retryUntil) return;
    if (this.flushTimer !== null) {
      this.deps.clearTimeout(this.flushTimer);
      this.timers.delete(this.flushTimer);
      this.flushTimer = null;
    }
    this.busy = true;
    try {
      while (!this.stopped && this.queue.length > 0 && this.deps.now() >= Math.max(this.pausedUntil, this.retryUntil)) {
        const batch = this.take();
        if (!batch) break;
        let goOn = false;
        if (this.firstPending && this.deps.locks) {
          this.lockAbort = new AbortController();
          try {
            await this.deps.locks.request(FIRST_FLUSH_LOCK, { signal: this.lockAbort.signal }, async () => {
              goOn = await this.send(batch);
            });
          } catch {
            // aborted by stop(), or Web Locks failed: nothing sent
          } finally {
            this.lockAbort = null;
          }
        } else {
          goOn = await this.send(batch);
        }
        if (this.firstPending) {
          this.firstPending = false;
          this.resolveFirst();
        }
        if (!goOn) break; // waiting for a retry or the 429 pause
      }
    } finally {
      this.busy = false;
    }
  }

  // Head of the queue that fits the 7 680-byte body; order kept.
  private take(): { items: Item[]; body: (sentAt: number) => string | null } | null {
    const env = this.deps.envelope();
    if (!env) {
      this.queue = [];
      return null;
    }
    const make = (items: Item[], sentAt: number) =>
      JSON.stringify({ v: 1, cv: env.cv, consentDate: env.consentDate, sentAt, viewport: env.viewport, events: items.map((i) => i.event) });
    // UTF-8 bytes, as the server counts them (review N3).
    const bytes = (text: string) => new TextEncoder().encode(text).byteLength;
    let n = 0;
    while (n < this.queue.length && (n === 0 || bytes(make(this.queue.slice(0, n + 1), 0)) <= MAX_BODY)) n += 1;
    const items = this.queue.splice(0, n);
    return {
      items,
      body: (sentAt) => {
        const text = make(items, sentAt);
        return bytes(text) <= MAX_BODY ? text : null;
      },
    };
  }

  // true = carry on with the next batch; false = stop until a timer fires.
  private async send(batch: { items: Item[]; body: (sentAt: number) => string | null }): Promise<boolean> {
    // H3: the last check before anything leaves the browser.
    if (this.stopped || !this.deps.allowed()) {
      this.queue = [];
      return false;
    }
    const body = batch.body(this.deps.now());
    if (body === null) return true; // a single event too large: dropped
    const controller = new AbortController();
    this.controllers.add(controller);
    try {
      const res = await this.deps.fetch(COLLECT_URL, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body,
        signal: controller.signal,
      });
      if (res.status === 429) {
        // WA-5: the server's Retry-After (1..600 s), else 60 s (spec deviation D1).
        const ra = res.headers.get('Retry-After');
        const pause = ra && /^\d+$/.test(ra) && +ra >= 1 && +ra <= 600 ? +ra * 1000 : PAUSE_429_MS;
        this.pausedUntil = this.deps.now() + pause;
        this.queue.unshift(...batch.items);
        this.later(() => void this.flush(), pause);
        return false;
      }
      if (res.status >= 500) return this.retry(batch.items);
      return true; // 2xx, or another 4xx: dropped, never retried
    } catch {
      return controller.signal.aborted ? true : this.retry(batch.items);
    } finally {
      this.controllers.delete(controller);
    }
  }

  private retry(items: Item[]): boolean {
    const attempt = items[0]?.attempts ?? 0;
    if (attempt >= RETRY_MS.length || this.stopped) return true; // 5 s, then 30 s, then drop
    for (const i of items) i.attempts = attempt + 1;
    this.queue.unshift(...items);
    this.retryUntil = this.deps.now() + RETRY_MS[attempt];
    this.later(() => void this.flush(), RETRY_MS[attempt]);
    return false;
  }

  abortInFlight() {
    for (const c of this.controllers) c.abort();
    this.controllers.clear();
  }

  stop() {
    this.stopped = true;
    this.queue = [];
    for (const h of this.timers) this.deps.clearTimeout(h);
    this.timers.clear();
    this.flushTimer = null;
    this.lockAbort?.abort();
    this.firstPending = false;
    this.resolveFirst();
  }
}
