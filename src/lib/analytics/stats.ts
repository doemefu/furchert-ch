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

// ── WA-4b (#156) ───────────────────────────────────────────────────────────

/** §8.6 small cell: fewer than 3. */
export const isSmall = (n: number) => n < 3;

export interface StepView {
  index: number;
  key: string | null;
  visits: number;
  small: boolean;
  /** Share of the previous step; null for the first step or when either side is small. */
  ofPrevious: Rate | null;
  /** Share of the first step; null when either side is small. */
  ofFirst: Rate | null;
}

/** Funnel steps in order with step and overall rates; small cells drop the rates that touch them (Q1, Q3). */
export function funnelSteps(steps: { index: number; key: string | null; visits: number }[]): StepView[] {
  const sorted = [...steps].sort((a, b) => a.index - b.index);
  const first = sorted[0];
  return sorted.map((s, i) => {
    const prev = i > 0 ? sorted[i - 1] : null;
    const small = isSmall(s.visits);
    return {
      index: s.index,
      key: s.key,
      visits: s.visits,
      small,
      ofPrevious: prev && !small && !isSmall(prev.visits) ? rate(s.visits, prev.visits) : null,
      ofFirst: i > 0 && first && !small && !isSmall(first.visits) ? rate(s.visits, first.visits) : null,
    };
  });
}

const DAYS = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;

/** A comparison is fair only when the previous span has as many days as the range (H3). */
export function spansMatch<R extends { days: number; previous: { from: string; to: string } | null }>(range: R): boolean {
  return range.previous !== null && DAYS(range.previous.from, range.previous.to) === range.days;
}

export type CoverageBand =
  | { kind: 'small'; excludedDays: number }
  | { kind: 'band'; lo: number; hi: number; excludedDays: number }
  | { kind: 'atLeast100'; excludedDays: number };

/**
 * Indicative coverage band (§8.3, M4): the last 28 days of the range, only
 * days with Cloudflare requests in both sums, both sums ≥ 50, a 10-point band
 * in integer maths (lo = floor(10·c/f)·10, hi = lo + 10); c ≥ f → "≥ 100 %".
 */
export function coverageBand(daily: { consentedPageviews: number; cloudflareRequests: number }[]): CoverageBand {
  const window = daily.slice(-28);
  let c = 0;
  let f = 0;
  let excludedDays = 0;
  for (const d of window) {
    if (d.cloudflareRequests > 0) {
      c += d.consentedPageviews;
      f += d.cloudflareRequests;
    } else excludedDays += 1;
  }
  if (c < 50 || f < 50) return { kind: 'small', excludedDays };
  if (c >= f) return { kind: 'atLeast100', excludedDays };
  const tenths = (10 * c - ((10 * c) % f)) / f; // exact integer floor(10·c/f)
  return { kind: 'band', lo: tenths * 10, hi: tenths * 10 + 10, excludedDays };
}
