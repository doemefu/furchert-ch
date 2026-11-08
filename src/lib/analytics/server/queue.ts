// Ordered in-memory forward queue to data-service (spec 100 §5.10, C12, C17;
// WA-2b #154). One per process on `globalThis`, shared by `/api/v` and the
// contact Server Action (verified in a production build, worklog A4).
// Delivery is at-most-once: events are lost on a pod restart or when the
// queue gives up (documented, accepted).
//
// - Capacity 2 000 analytics events (overflow counted); goal and enquiry are
//   always taken (bounded by the contact form's own limits).
// - Batches: ≤ 200 events and ≤ 48 KiB of the serialised envelope; a timer
//   flushes every 5 s; one request in flight; 10 s timeout.
// - `edgeDrops` (nine keys, each ≤ 1 000 000) ride on a batch's first attempt
//   only; a retry sends them zeroed. With no events, a drops-only batch goes
//   out at most once a minute.
// - 413: split in halves and retry, order kept; a single event that still
//   gets 413 is dropped and counted `invalid`. 400: drop the batch (logged).
//   401: drop the token and retry once; a second 401 drops the batch. 403:
//   drop and log a configuration hint. Network, timeout, 5xx or a failed token
//   request: keep the events; the circuit opens for 60 s after 3 consecutive
//   failures. Events older than 60 min are dropped (`expired`) before each
//   attempt.
// - Logging: at most one `[analytics]` summary line a minute, counts only;
//   never a body, IP, UA, visitor id, referrer, URL with query or an error text.
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

export interface QueueDeps {
  fetch: typeof fetch;
  now: () => number;
  getToken: () => Promise<string>;
  invalidateToken: () => void;
  eventsUrl: () => string;
  log: (line: string) => void;
  timeoutMs?: number;
}

interface Item {
  event: ForwardEvent;
  json: string;
  bytes: number;
  enqueuedAt: number;
  priority: boolean;
  attempts: number;
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
  size(): number;
  pendingDrops(): EdgeDrops;
}

const byteLength = (s: string) => new TextEncoder().encode(s).byteLength;

export function createForwardQueue(deps: QueueDeps): ForwardQueue {
  const items: Item[] = [];
  let analyticsCount = 0;
  let drops = zeroDrops();
  let inFlight: Promise<boolean> | null = null;
  let failures = 0;
  let circuitUntil = 0;
  let lastDropsOnly = -Infinity;
  let lastLog = -Infinity;
  let splits: number[] = [];
  let stats = zeroStats();

  const countDrop = (reason: EdgeDropReason, n = 1) => {
    drops[reason] = Math.min(EDGE_DROP_MAX, drops[reason] + Math.max(0, Math.floor(n)));
  };
  const hasDrops = () => EDGE_DROP_REASONS.some((r) => drops[r] > 0);

  const removeHead = (n: number) => {
    for (const it of items.splice(0, n)) if (!it.priority) analyticsCount -= 1;
  };

  const expire = () => {
    const cutoff = deps.now() - MAX_AGE_MS;
    let i = 0;
    while (i < items.length) {
      if (items[i].enqueuedAt < cutoff) {
        if (!items[i].priority) analyticsCount -= 1;
        items.splice(i, 1);
        countDrop('expired');
      } else i += 1;
    }
  };

  const maybeLog = () => {
    const now = deps.now();
    if (now - lastLog < LOG_EVERY_MS) return;
    const parts = Object.entries(stats).filter(([, v]) => v > 0);
    if (parts.length === 0 && failures === 0) return;
    lastLog = now;
    deps.log(
      `[analytics] forward summary: ${parts.map(([k, v]) => `${k}=${v}`).join(' ')} queued=${items.length} circuit=${now < circuitUntil ? 'open' : 'closed'}`.replace('  ', ' '),
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

  // Picks the head batch: ≤ the current split size, ≤ 200 events, ≤ 48 KiB.
  function pickBatch(edgeDrops: EdgeDrops): { n: number; body: string } {
    const limit = Math.min(splits[0] ?? MAX_EVENTS, MAX_EVENTS);
    const tail = `],"edgeDrops":${JSON.stringify(edgeDrops)}}`;
    let size = byteLength('{"events":[') + byteLength(tail);
    let n = 0;
    while (n < items.length && n < limit) {
      const add = items[n].bytes + (n > 0 ? 1 : 0);
      if (n > 0 && size + add > MAX_BYTES) break;
      size += add;
      n += 1;
    }
    return { n, body: `{"events":[${items.slice(0, n).map((it) => it.json).join(',')}${tail}` };
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

  // One attempt; resolves true when it made progress (sent or dropped a batch).
  async function attempt(): Promise<boolean> {
    try {
      const now = deps.now();
      if (now < circuitUntil) return false;
      expire();
      if (items.length === 0 && !(hasDrops() && now - lastDropsOnly >= DROPS_ONLY_EVERY_MS)) return false;

      const retry = items.length > 0 && items[0].attempts > 0;
      const edgeDrops = retry ? zeroDrops() : drops;
      const { n, body } = pickBatch(edgeDrops);
      if (!retry) drops = zeroDrops();
      if (n === 0) lastDropsOnly = now;
      for (let i = 0; i < n; i += 1) items[i].attempts += 1;

      let res: Response;
      try {
        res = await post(body, await deps.getToken());
        if (res.status === 401) {
          deps.invalidateToken();
          res = await post(body, await deps.getToken());
          if (res.status === 401) {
            stats.dropped401 += n;
            removeHead(n);
            splits.shift();
            return true;
          }
        }
      } catch {
        fail(); // network, timeout or token failure: keep the events
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
        removeHead(n);
        splits.shift();
        return true;
      }
      if (res.status === 413) {
        if (n <= 1) {
          removeHead(n);
          splits.shift();
          countDrop('invalid', n);
        } else {
          splits = [Math.ceil(n / 2), Math.floor(n / 2), ...splits.slice(1)];
        }
        return true;
      }
      if (res.status === 400 || res.status === 403) {
        stats[res.status === 400 ? 'dropped400' : 'dropped403'] += n;
        removeHead(n);
        splits.shift();
        return true;
      }
      fail(); // 5xx and anything else: retry later
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
    });
    return inFlight;
  };

  return {
    enqueue(events, opts = {}) {
      const priority = opts.priority === true;
      for (const event of events) {
        if (!priority && analyticsCount >= QUEUE_CAPACITY) {
          countDrop('overflow');
          continue;
        }
        const json = JSON.stringify(event);
        items.push({ event, json, bytes: byteLength(json), enqueuedAt: deps.now(), priority, attempts: 0 });
        if (!priority) analyticsCount += 1;
      }
    },
    countDrop,
    async flush() {
      await flushOnce();
    },
    async flushAll() {
      for (let i = 0; i < 1_000 && (await flushOnce()) && items.length > 0; i += 1);
    },
    size: () => items.length,
    pendingDrops: () => ({ ...drops }),
  };
}
