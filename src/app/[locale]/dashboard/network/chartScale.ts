// Pure time-slot and axis helpers for the /dashboard/network charts (#179).
// No React, no fetch, no next-intl. Only types are imported from the netmon
// client (a server-only module), so nothing of it reaches this module at
// runtime (and the unit tests load without it).
import type { LoginTimelineBucket, TimeWindow } from '@/lib/netmon/client';

export const HOUR_MS = 3600 * 1000;
export const DAY_MS = 24 * HOUR_MS;

export interface Slot<T> {
  /** Slot start, epoch ms (UTC hour or UTC day boundary). */
  start: number;
  /** The API bucket for this slot; null when the API returned none (no data, not "zero"). */
  point: T | null;
  /** The slot starts before the window: only part of it lies inside. */
  partial: boolean;
  /** The slot ends after the window end: it is still filling up. */
  ongoing: boolean;
}

export interface SlotResult<T> {
  /** True when every bucket sits on a slot boundary inside the window; then `slots` is complete. */
  aligned: boolean;
  /** 1-day slots (UTC) iff the window is longer than 7 d, else 1 h; false for an invalid window. */
  daily: boolean;
  slots: Slot<T>[];
  /** The raw buckets, as passed in. */
  points: T[];
}

// The API returns buckets with data only (1 h iff to − from ≤ 7 d, else 1 d,
// UTC). Slots run from floor(from / step) · step while < to, so an unaligned
// window (second-precise `to`) has one more slot than window / step: the first
// is partial, the last ongoing. A misaligned or out-of-window bucket (or an
// invalid window) gives aligned:false, and the caller shows the raw buckets.
export function slotBuckets<T extends { bucketStart: string }>(points: T[], window: TimeWindow): SlotResult<T> {
  const from = Date.parse(window.from);
  const to = Date.parse(window.to);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
    return { aligned: false, daily: false, slots: [], points };
  }
  const step = to - from <= 7 * DAY_MS ? HOUR_MS : DAY_MS;
  const daily = step === DAY_MS;
  const byStart = new Map<number, T>();
  for (const p of points) {
    const ms = Date.parse(p.bucketStart);
    if (!Number.isFinite(ms) || ms % step !== 0) return { aligned: false, daily, slots: [], points };
    byStart.set(ms, p);
  }
  const slots: Slot<T>[] = [];
  for (let ms = Math.floor(from / step) * step; ms < to; ms += step) {
    slots.push({ start: ms, point: byStart.get(ms) ?? null, partial: ms < from, ongoing: ms + step > to });
    byStart.delete(ms);
  }
  // A bucket outside the window (clock skew) would silently vanish.
  if (byStart.size > 0) return { aligned: false, daily, slots: [], points };
  return { aligned: true, daily, slots, points };
}

// Smallest 1, 2 or 5 × 10^n that is ≥ max (minimum 1); 1 for NaN, negative
// or infinite input.
export function niceCeil(max: number): number {
  if (!Number.isFinite(max) || max <= 1) return 1;
  let pow = 1;
  while (pow * 10 <= max) pow *= 10;
  const f = max / pow;
  return pow * (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10);
}

// Logins are sparse, so the missing slots are deliberately filled with zeros
// (absence means no events) to keep the x axis proportional to time. If the
// window is invalid or a bucket does not sit on a slot boundary of the window,
// the raw buckets are returned.
export function fillLoginTimeline(
  points: LoginTimelineBucket[],
  window: TimeWindow,
): { points: LoginTimelineBucket[]; daily: boolean } {
  const r = slotBuckets(points, window);
  if (!r.aligned) return { points, daily: r.daily };
  return {
    points: r.slots.map(
      (s) => s.point ?? { bucketStart: new Date(s.start).toISOString(), success: 0, failure: 0, locked: 0 },
    ),
    daily: r.daily,
  };
}
