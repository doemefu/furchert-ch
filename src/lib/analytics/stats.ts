// Derived numbers for /dashboard/analytics (spec 100 §8.3, §8.6; WA-4a
// #155). The read API returns counts only; every rate, interval, delta,
// median and small-number rule is computed here, pure and tested.

export type Rate =
  | { kind: 'none' }
  | { kind: 'fraction'; x: number; n: number }
  | { kind: 'interval'; p: number; lo: number; hi: number; x: number; n: number }
  | { kind: 'percent'; p: number; x: number; n: number };

const Z = 1.96;

/** Wilson 95 % interval for x of n. */
export function wilson(x: number, n: number): [number, number] {
  const p = x / n;
  const z2 = Z * Z;
  const centre = p + z2 / (2 * n);
  const margin = Z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  const denom = 1 + z2 / n;
  return [Math.max(0, (centre - margin) / denom), Math.min(1, (centre + margin) / denom)];
}

/** "x of n" below 30; p with a Wilson interval for 30 ≤ n < 200; p from 200. */
export function rate(x: number, n: number): Rate {
  if (!(n > 0)) return { kind: 'none' };
  const xs = Math.min(Math.max(x, 0), n);
  if (n < 30) return { kind: 'fraction', x: xs, n };
  const p = xs / n;
  if (n < 200) {
    const [lo, hi] = wilson(xs, n);
    return { kind: 'interval', p, lo, hi, x: xs, n };
  }
  return { kind: 'percent', p, x: xs, n };
}

export type CountDelta = { kind: 'small' } | { kind: 'flat' } | { kind: 'change'; diff: number };

/** A change only when both counts are ≥ 20 and |a − b| ≥ 2·√(a + b). */
export function countDelta(current: number, previous: number): CountDelta {
  if (current < 20 || previous < 20) return { kind: 'small' };
  const diff = current - previous;
  return Math.abs(diff) >= 2 * Math.sqrt(current + previous) ? { kind: 'change', diff } : { kind: 'flat' };
}

export type RateDelta = { kind: 'small' } | { kind: 'change'; pp: number };

/** Percentage-point change only when both n ≥ 30; otherwise show both as "x of n". */
export function rateDelta(x1: number, n1: number, x2: number, n2: number): RateDelta {
  if (n1 < 30 || n2 < 30) return { kind: 'small' };
  return { kind: 'change', pp: Math.round((x1 / n1 - x2 / n2) * 1000) / 10 };
}

/**
 * Rows below 3 fold into one "other (n)" row, together with the API's own
 * `(other)` row; n = the sum of the folded rows' values. `other` is null when
 * nothing was folded.
 */
export function foldRows<T>(rows: T[], value: (r: T) => number, isOther: (r: T) => boolean, min = 3): { kept: T[]; other: number | null } {
  const kept: T[] = [];
  let other = 0;
  let folded = false;
  for (const r of rows) {
    if (isOther(r) || value(r) < min) {
      other += value(r);
      folded = true;
    } else kept.push(r);
  }
  return { kept, other: folded ? other : null };
}

export const HISTOGRAM_BUCKETS = ['0–5 s', '5–10 s', '10–30 s', '30–60 s', '1–2 min', '2–5 min', '5–10 min', '> 10 min'] as const;

export type Median = { kind: 'few'; n: number } | { kind: 'bucket'; index: number; n: number };

/** Median bucket: the first where the running total reaches ceil(n/2); "–" + n below 10 samples. */
export function medianBucket(histogram: number[], samples: number): Median {
  if (samples < 10) return { kind: 'few', n: Math.max(0, samples) };
  const half = Math.ceil(samples / 2);
  let run = 0;
  for (let i = 0; i < histogram.length; i += 1) {
    run += histogram[i];
    if (run >= half) return { kind: 'bucket', index: i, n: samples };
  }
  return { kind: 'bucket', index: histogram.length - 1, n: samples };
}

/** Index of the winner (leader ≥ 5 and ≥ 2× the runner-up), or null. */
export function winner(values: number[]): number | null {
  if (values.length === 0) return null;
  let lead = 0;
  for (let i = 1; i < values.length; i += 1) if (values[i] > values[lead]) lead = i;
  const runner = Math.max(0, ...values.filter((_, i) => i !== lead));
  return values[lead] >= 5 && values[lead] >= 2 * runner ? lead : null;
}

export interface Bucket {
  start: string;
  values: Record<string, number>;
  /** The bucket is not fully covered by the range (first/last week or month, L5). */
  partial: boolean;
}

const DAY = 86_400_000;
const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Daily up to 31 days, weekly (ISO weeks) up to 183, monthly beyond; sums only. */
export function bucketSeries<T extends { day: string }>(daily: T[], keys: (keyof T & string)[]): { unit: 'day' | 'week' | 'month'; buckets: Bucket[] } {
  const unit = daily.length <= 31 ? 'day' : daily.length <= 183 ? 'week' : 'month';
  const startOf = (d: string): string => {
    if (unit === 'day') return d;
    if (unit === 'month') return `${d.slice(0, 7)}-01`;
    const t = ms(d);
    const dow = (new Date(t).getUTCDay() + 6) % 7; // Monday = 0
    return iso(t - dow * DAY);
  };
  const lengthOf = (start: string): number => {
    if (unit === 'day') return 1;
    if (unit === 'week') return 7;
    const [y, m] = start.split('-').map(Number);
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
  };
  const order: string[] = [];
  const map = new Map<string, { values: Record<string, number>; days: number }>();
  for (const p of daily) {
    const s = startOf(p.day);
    let b = map.get(s);
    if (!b) {
      b = { values: Object.fromEntries(keys.map((k) => [k, 0])), days: 0 };
      map.set(s, b);
      order.push(s);
    }
    b.days += 1;
    for (const k of keys) b.values[k] += Number(p[k]) || 0;
  }
  return { unit, buckets: order.map((s) => ({ start: s, values: map.get(s)!.values, partial: map.get(s)!.days < lengthOf(s) })) };
}

// ── §8.3 metric helpers (counts in, Rate out) ──────────────────────────────

export const bounce = (entries: number, landingEngaged: number): Rate => rate(Math.max(entries - landingEngaged, 0), entries);
export const exitRate = (exits: number, visitsViewed: number): Rate => rate(exits, visitsViewed);
export const ctr = (visits: number, pageVisits: number | null): Rate => (pageVisits === null ? { kind: 'none' } : rate(visits, pageVisits));
export const scrollReach = (reached: number, samples: number): Rate => rate(reached, samples);
