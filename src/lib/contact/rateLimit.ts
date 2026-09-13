// In-process, in-memory sliding-window rate limiter for the contact form
// (issue #46). This is a single-process limiter with no persistence: all
// state lives in the two module-level variables below and is lost whenever
// the pod restarts. That is an accepted, honest trade-off specifically
// because `k8s/deployment.yaml` runs `replicas: 1` for this app, so there is
// only ever one process holding this state. If replicas are ever increased,
// this limiter stops being effective (each replica would enforce its own,
// independent limits) and must be replaced by a shared store (e.g. Redis)
// before that change ships.

/** Maximum allowed submissions per client key within `PER_KEY_WINDOW_MS`. */
export const PER_KEY_LIMIT = 3;

/** Sliding window for the per-key limit: 10 minutes. */
export const PER_KEY_WINDOW_MS = 10 * 60 * 1000;

/** Maximum allowed submissions across all clients within `GLOBAL_WINDOW_MS`. */
export const GLOBAL_LIMIT = 20;

/** Sliding window for the global limit: 1 hour. */
export const GLOBAL_WINDOW_MS = 60 * 60 * 1000;

// Cap on the number of distinct client keys tracked at once. Without this, a
// flood of requests using many distinct keys (e.g. spoofed/rotating
// IP-derived values) could grow this map without bound. When the cap is
// reached, the oldest-inserted key (by Map iteration order) is evicted
// before adding a new one.
const MAX_TRACKED_KEYS = 10_000;

// Per-key submission timestamps (ms since epoch), keyed by an IP-derived
// client key. Only timestamps are kept — no names, e-mail addresses, or
// message content ever pass through this module.
const perKeyTimestamps = new Map<string, number[]>();

// Global submission timestamps (ms since epoch) across all client keys.
const globalTimestamps: number[] = [];

/**
 * Checks whether a contact-form submission from `clientKey` is within both
 * the per-key and global sliding-window limits. Returns `true` and records
 * the attempt if allowed; returns `false` without recording it otherwise.
 */
export function checkContactRateLimit(clientKey: string): boolean {
  const now = Date.now();

  pruneInPlace(globalTimestamps, now - GLOBAL_WINDOW_MS);
  if (globalTimestamps.length >= GLOBAL_LIMIT) {
    return false;
  }

  const existing = perKeyTimestamps.get(clientKey) ?? [];
  const pruned = pruneInPlace(existing, now - PER_KEY_WINDOW_MS);

  if (pruned.length >= PER_KEY_LIMIT) {
    perKeyTimestamps.set(clientKey, pruned);
    return false;
  }

  pruned.push(now);
  if (!perKeyTimestamps.has(clientKey)) {
    evictOldestIfAtCapacity();
  }
  perKeyTimestamps.set(clientKey, pruned);
  globalTimestamps.push(now);
  return true;
}

/** Removes timestamps at or before `cutoff` from `timestamps`, in place. */
function pruneInPlace(timestamps: number[], cutoff: number): number[] {
  let writeIndex = 0;
  for (let readIndex = 0; readIndex < timestamps.length; readIndex += 1) {
    if (timestamps[readIndex] > cutoff) {
      timestamps[writeIndex] = timestamps[readIndex];
      writeIndex += 1;
    }
  }
  timestamps.length = writeIndex;
  return timestamps;
}

/** Evicts the oldest-inserted tracked key if the map is at its size cap. */
function evictOldestIfAtCapacity(): void {
  if (perKeyTimestamps.size < MAX_TRACKED_KEYS) {
    return;
  }
  const oldestKey = perKeyTimestamps.keys().next().value;
  if (oldestKey !== undefined) {
    perKeyTimestamps.delete(oldestKey);
  }
}
