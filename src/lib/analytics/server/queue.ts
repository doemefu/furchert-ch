// In-memory forward queue to data-service (spec 100 §5.10, C12, C17; WA-2b
// #154, two lanes and erasure support WA-5 #157). One per process on
// `globalThis`, shared by `/api/v` and the contact Server Action. Delivery is
// at-most-once: events are lost on a pod restart or when the queue gives up
// (documented, accepted).
//
// - Two lanes (WA-5 review H1): `priority` (goal, enquiry; always taken) and
//   `analytics` (capacity 2 000, overflow counted). A fresh batch takes the
//   priority lane first, then the analytics lane, each in arrival order.
//   Order across lanes does not matter (data-service dedupes by eventId).
// - Batches are objects that hold their own item references; removal is by
//   identity, never by queue position. ≤ 200 events and ≤ 48 KiB of the
//   serialised envelope; a timer flushes every 5 s; one request in flight;
//   10 s timeout.
// - `edgeDrops` (nine keys, each ≤ 1 000 000) ride on a batch's first attempt
//   only; a retried batch sends them zeroed. After a 413, a failed token
//   request or a capped 429 (nothing counted) they go back into the pending
//   counts; after a network error, timeout or 5xx they do not (accepted
//   residual).
// - 413: the batch is split in halves (order kept) and each half is retried;
//   a single event that still gets 413 is dropped and counted `invalid`.
//   400: drop the batch. 401: drop the token and retry once; a second 401
//   drops the batch. 403: drop and log a configuration hint. Network, timeout,
//   5xx or a failed token request: the same batch is retried next (review N5);
//   the circuit opens for 60 s after 3 consecutive failures. Events older
//   than 60 min are dropped (`expired`) before each attempt.
// - Capped 429 (§5.10, §6.3; WA-5): data-service's daily or hourly cap.
//   Until `retryAt` (clamped to now + 1 s … now + 25 h) only the priority
//   lane is sent; analytics events wait and age out. Split and retry batches
//   are discarded (their items stay in their lanes, review N1). A 429 on a
//   priority-only batch, or without a valid body, counts as a failure.
// - Erasure (§5.4; WA-5 review M3): `purgeVisitors` removes an erased id's
//   events that are not in flight, waits (bounded) for the in-flight attempt
//   and removes what is left; the id stays in an erased set for 2 h, so its
//   events are never enqueued or resent.
// - Logging: at most one `[analytics] forward summary` line a minute, counts
//   only; never a body, IP, UA, visitor id, referrer, URL or error text.
import {
  EDGE_DROP_MAX,
  EDGE_DROP_REASONS,
  zeroDrops,
  type EdgeDropReason,
  type EdgeDrops,
  type ForwardEvent,
} from './forwardModel';

export const QUEUE_CAPACITY = 2_000;
const MAX_EVENTS = 200;
const MAX_BYTES = 48 * 1024;
const MAX_AGE_MS = 60 * 60_000;
const CIRCUIT_MS = 60_000;
const FAILURES_TO_OPEN = 3;
const DROPS_ONLY_EVERY_MS = 60_000;
const LOG_EVERY_MS = 60_000;
const TIMEOUT_MS = 10_000;
const PAUSE_MIN_MS = 1_000;
const PAUSE_MAX_MS = 25 * 60 * 60_000;
export const ERASED_TTL_MS = 2 * 60 * 60_000;
export const ERASED_CAP = 10_000;
export const PURGE_WAIT_MS = 10_500;
// A1 (WA-5 plan): verified against data-service PR #66 — a capped 429 rolls
// the batch back and counts none of its edgeDrops (IngestController; test
// hourCapAnswers429WithTheExactBodyAndStoresAndCountsNothing), so they are put
// back.
const RESTORE_DROPS_ON_CAPPED = true;

export interface QueueDeps {
  fetch: typeof fetch;
  now: () => number;
  getToken: () => Promise<string>;
  invalidateToken: () => void;
  eventsUrl: () => string;
  log: (line: string) => void;
  timeoutMs?: number;
  /** Bounded wait in `purgeVisitors`, cancelled through `signal` (review S4); tests inject a fake. */
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
}

interface Item {
  event: ForwardEvent;
  json: string;
  bytes: number;
  enqueuedAt: number;
  priority: boolean;
}

/** A batch keeps its own items; `retry` = it was attempted before (edgeDrops zeroed). */
interface Batch {
  items: Item[];
  retry: boolean;
}

type Stats = Record<'sent' | 'accepted' | 'duplicates' | 'rejected' | 'dropped400' | 'dropped401' | 'dropped403' | 'failures', number>;
const zeroStats = (): Stats => ({ sent: 0, accepted: 0, duplicates: 0, rejected: 0, dropped400: 0, dropped401: 0, dropped403: 0, failures: 0 });

export interface ForwardQueue {
  enqueue(events: ForwardEvent[], opts?: { priority?: boolean }): void;
  countDrop(reason: EdgeDropReason, n?: number): void;
  /** One attempt (or none while the circuit is open); shares an attempt in flight. */
  flush(): Promise<void>;
  /** Flushes until the queue is empty or an attempt fails (tests, shutdown). */
  flushAll(): Promise<void>;
  /**
   * §5.4 erasure: marks the ids erased (2 h), removes their events that are not
   * in flight, waits for the in-flight attempt (at most `maxWaitMs`) and
   * removes what is left. `settled` is false when the wait timed out.
   */
  purgeVisitors(ids: string[], maxWaitMs?: number): Promise<{ settled: boolean }>;
  /** Runs `cb` once the current attempt has settled (at once when none is in flight). */
  onInFlightSettled(cb: () => void): void;
  size(): number;
  pendingDrops(): EdgeDrops;
}

const byteLength = (s: string) => new TextEncoder().encode(s).byteLength;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function createForwardQueue(deps: QueueDeps): ForwardQueue {
  const priority: Item[] = [];
  const analytics: Item[] = [];
  const queued = new Set<Item>();
  let pendingSplits: Batch[] = [];
  let retryBatch: Batch | null = null;
  let drops = zeroDrops();
  let inFlight: Promise<boolean> | null = null;
  let inFlightItems = new Set<Item>();
  let failures = 0;
  let circuitUntil = 0;
  let pausedUntil = 0;
  let pausedScope = '';
  let lastDropsOnly = -Infinity;
  let lastLog = -Infinity;
  let stats = zeroStats();
  const erased = new Map<string, number>();
  const sleep =
    deps.sleep ??
    ((ms: number, signal: AbortSignal) =>
      new Promise<void>((resolve) => {
        const h = setTimeout(resolve, ms);
        signal.addEventListener('abort', () => (clearTimeout(h), resolve()), { once: true });
      }));

  const countDrop = (reason: EdgeDropReason, n = 1) => {
    drops[reason] = Math.min(EDGE_DROP_MAX, drops[reason] + Math.max(0, Math.floor(n)));
  };
  const hasDrops = () => EDGE_DROP_REASONS.some((r) => drops[r] > 0);

  const isErased = (visitorId: unknown): boolean => {
    if (typeof visitorId !== 'string') return false;
    const until = erased.get(visitorId);
    if (until === undefined) return false;
    if (until > deps.now()) return true;
    erased.delete(visitorId);
    return false;
  };

  /** Removes the given items from their lanes (identity). */
  const removeWhere = (match: (it: Item) => boolean) => {
    for (const lane of [priority, analytics]) {
      let w = 0;
      for (const it of lane) {
        if (match(it)) queued.delete(it);
        else lane[w++] = it;
      }
      lane.length = w;
    }
  };
  const removeItems = (items: Item[]) => {
    const set = new Set(items);
    removeWhere((it) => set.has(it));
  };

  /** Drops expired items and the items of erased ids from the lanes. */
  const prune = () => {
    const cutoff = deps.now() - MAX_AGE_MS;
    removeWhere((it) => {
      if (inFlightItems.has(it)) return false;
      if (it.enqueuedAt < cutoff) {
        countDrop('expired');
        return true;
      }
      return isErased(it.event.visitorId);
    });
  };

  /** A kept batch without the items that left their lane (erased, expired; review N1). */
  const live = (b: Batch): Batch | null => {
    const items = b.items.filter((it) => queued.has(it));
    return items.length > 0 ? { items, retry: b.retry } : null;
  };

  const paused = () => deps.now() < pausedUntil;

  const maybeLog = () => {
    const now = deps.now();
    if (now - lastLog < LOG_EVERY_MS) return;
    const parts = Object.entries(stats).filter(([, v]) => v > 0);
    if (parts.length === 0 && failures === 0 && !paused()) return;
    lastLog = now;
    // §5.10: a 403 means configuration, not data (N6).
    const hint = stats.dropped403 > 0 ? ' hint=check-analytics-write-scope-and-webanalytics.api.write-clients' : '';
    const cap = paused() ? ` capped=${pausedScope} pausedFor=${Math.ceil((pausedUntil - now) / 1000)}` : '';
    deps.log(
      `[analytics] forward summary: ${parts.map(([k, v]) => `${k}=${v}`).join(' ')} queued=${queued.size} circuit=${now < circuitUntil ? 'open' : 'closed'}${cap}${hint}`.replace('  ', ' '),
    );
    stats = zeroStats();
  };

  const fail = () => {
    stats.failures += 1;
    failures += 1;
    if (failures >= FAILURES_TO_OPEN) {
      circuitUntil = deps.now() + CIRCUIT_MS;
      failures = 0;
    }
  };

  const bodyOf = (items: Item[], edgeDrops: EdgeDrops) =>
    `{"events":[${items.map((it) => it.json).join(',')}],"edgeDrops":${JSON.stringify(edgeDrops)}}`;

  /** A fresh batch: priority lane first, then (unless paused) analytics; ≤ 200 events, ≤ 48 KiB. */
  function freshBatch(edgeDrops: EdgeDrops): Batch {
    const tail = `],"edgeDrops":${JSON.stringify(edgeDrops)}}`;
    let size = byteLength('{"events":[') + byteLength(tail);
    const items: Item[] = [];
    for (const lane of paused() ? [priority] : [priority, analytics]) {
      for (const it of lane) {
        if (items.length >= MAX_EVENTS) break;
        const add = it.bytes + (items.length > 0 ? 1 : 0);
        if (items.length > 0 && size + add > MAX_BYTES) break;
        size += add;
        items.push(it);
      }
    }
    return { items, retry: false };
  }

  type Source = 'retry' | 'split' | 'fresh';

  /** The next batch: a kept retry batch, then pending split halves, then a fresh one. */
  function nextBatch(): { batch: Batch; source: Source } {
    if (retryBatch) {
      retryBatch = live(retryBatch);
      if (retryBatch) return { batch: retryBatch, source: 'retry' };
    }
    while (pendingSplits.length > 0) {
      const head = live(pendingSplits[0]);
      if (head) {
        pendingSplits[0] = head;
        return { batch: head, source: 'split' };
      }
      pendingSplits.shift();
    }
    return { batch: freshBatch(hasDrops() ? drops : zeroDrops()), source: 'fresh' };
  }

  async function post(body: string, token: string): Promise<Response> {
    return deps.fetch(deps.eventsUrl(), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(deps.timeoutMs ?? TIMEOUT_MS),
    });
  }

  /** A valid capped-429 body (§6.3), or null. */
  async function cappedBody(res: Response): Promise<{ scope: string; retryAt: number } | null> {
    try {
      const b: unknown = await res.json();
      if (!isRecord(b) || b.capped !== true || (b.capScope !== 'hour' && b.capScope !== 'day') || typeof b.retryAt !== 'string') return null;
      const t = Date.parse(b.retryAt);
      return Number.isNaN(t) ? null : { scope: b.capScope, retryAt: t };
    } catch {
      return null;
    }
  }

  // One attempt; resolves true when it made progress (sent or dropped a batch).
  async function attempt(): Promise<boolean> {
    try {
      const now = deps.now();
      if (now < circuitUntil) return false;
      prune();
      const { batch, source } = nextBatch();
      const n = batch.items.length;
      if (n === 0 && !(hasDrops() && now - lastDropsOnly >= DROPS_ONLY_EVERY_MS)) return false;

      const edgeDrops = batch.retry ? zeroDrops() : drops;
      if (!batch.retry) drops = zeroDrops();
      // Put the counts back when data-service provably counted nothing (N5).
      const restoreDrops = () => {
        if (!batch.retry) for (const r of EDGE_DROP_REASONS) countDrop(r, edgeDrops[r]);
      };
      const body = bodyOf(batch.items, edgeDrops);
      if (n === 0) lastDropsOnly = now;
      inFlightItems = new Set(batch.items);

      // The batch is done (sent or dropped): its items leave their lanes.
      const done = () => {
        removeItems(batch.items);
        if (source === 'split') pendingSplits.shift();
        if (source === 'retry') retryBatch = null;
      };
      // Keep the same batch as the next one (review N5).
      const keep = () => {
        batch.retry = true;
        if (source === 'fresh' && n > 0) retryBatch = batch;
      };

      let res: Response;
      let token: string;
      try {
        token = await deps.getToken();
      } catch {
        restoreDrops(); // nothing was sent
        batch.retry = false;
        if (source === 'fresh' && n > 0) retryBatch = batch;
        fail();
        return false;
      }
      try {
        res = await post(body, token);
        if (res.status === 401) {
          deps.invalidateToken();
          res = await post(body, await deps.getToken());
          if (res.status === 401) {
            stats.dropped401 += n;
            done();
            return true;
          }
        }
      } catch {
        // Network or timeout: keep the batch. The request may have been
        // counted, so its edgeDrops are not re-sent (§5.10, accepted residual).
        keep();
        fail();
        return false;
      }

      if (res.ok) {
        failures = 0;
        stats.sent += n;
        try {
          const r = (await res.json()) as { accepted?: unknown; duplicates?: unknown; rejected?: unknown };
          for (const k of ['accepted', 'duplicates', 'rejected'] as const) {
            if (typeof r[k] === 'number') stats[k] += r[k] as number;
          }
        } catch {
          // body not needed for delivery
        }
        done();
        return true;
      }
      if (res.status === 413) {
        restoreDrops(); // a 413 is never processed
        if (n <= 1) {
          done();
          countDrop('invalid', n);
        } else {
          const half = Math.ceil(n / 2);
          const halves: Batch[] = [
            { items: batch.items.slice(0, half), retry: true },
            { items: batch.items.slice(half), retry: true },
          ];
          if (source === 'split') pendingSplits.shift();
          if (source === 'retry') retryBatch = null;
          pendingSplits = [...halves, ...pendingSplits];
        }
        return true;
      }
      if (res.status === 429) {
        const capped = await cappedBody(res);
        // Review W1: a valid capped body means nothing of the batch was counted (A1), whatever it held.
        if (capped && RESTORE_DROPS_ON_CAPPED) restoreDrops();
        if (capped && batch.items.some((it) => !it.priority)) {
          const at = deps.now(); // review S5: clamp against the response time
          pausedUntil = Math.min(Math.max(capped.retryAt, at + PAUSE_MIN_MS), at + PAUSE_MAX_MS);
          pausedScope = capped.scope;
          // Review N1: split and retry batches go; their items stay in their lanes.
          pendingSplits = [];
          retryBatch = null;
          failures = 0;
          return false; // no hot loop in flushAll (review M2)
        }
        keep(); // malformed body, or a priority-only / drops-only batch (exempt): a failure
        fail();
        return false;
      }
      if (res.status === 400 || res.status === 403) {
        stats[res.status === 400 ? 'dropped400' : 'dropped403'] += n;
        done();
        return true;
      }
      keep(); // 5xx and anything else: retry the same batch later
      fail();
      return false;
    } catch {
      return false;
    } finally {
      maybeLog();
    }
  }

  const flushOnce = (): Promise<boolean> => {
    inFlight ??= attempt().finally(() => {
      inFlight = null;
      inFlightItems = new Set();
    });
    return inFlight;
  };

  const markErased = (id: string) => {
    erased.delete(id);
    if (erased.size >= ERASED_CAP) {
      const oldest = erased.keys().next().value;
      if (oldest !== undefined) erased.delete(oldest);
    }
    erased.set(id, deps.now() + ERASED_TTL_MS);
  };

  return {
    enqueue(events, opts = {}) {
      const isPriority = opts.priority === true;
      for (const event of events) {
        if (isErased(event.visitorId)) continue; // never re-collect an erased id (M3)
        if (!isPriority && analytics.length >= QUEUE_CAPACITY) {
          countDrop('overflow');
          continue;
        }
        const json = JSON.stringify(event);
        const it: Item = { event, json, bytes: byteLength(json), enqueuedAt: deps.now(), priority: isPriority };
        (isPriority ? priority : analytics).push(it);
        queued.add(it);
      }
    },
    countDrop,
    async flush() {
      await flushOnce();
    },
    async flushAll() {
      for (let i = 0; i < 1_000 && (await flushOnce()) && queued.size > 0; i += 1);
    },
    async purgeVisitors(ids, maxWaitMs = PURGE_WAIT_MS) {
      const set = new Set(ids);
      for (const id of set) markErased(id);
      const match = (it: Item) => typeof it.event.visitorId === 'string' && set.has(it.event.visitorId);
      removeWhere((it) => match(it) && !inFlightItems.has(it));
      let settled = true;
      if (inFlight) {
        const stop = new AbortController();
        const current = inFlight.then(() => 'settled' as const);
        settled = (await Promise.race([current, sleep(maxWaitMs, stop.signal).then(() => 'timeout' as const)])) === 'settled';
        stop.abort(); // review S4: no timer left behind when the attempt settled first
      }
      removeWhere((it) => match(it) && !inFlightItems.has(it));
      return { settled };
    },
    onInFlightSettled(cb) {
      if (!inFlight) cb();
      else void inFlight.then(cb, cb);
    },
    size: () => queued.size,
    pendingDrops: () => ({ ...drops }),
  };
}
