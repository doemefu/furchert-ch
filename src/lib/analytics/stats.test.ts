import { describe, expect, it } from 'vitest';
import { bucketSeries, countDelta, foldRows, medianBucket, rate, rateDelta, wilson, winner } from './stats';

describe('rate (§8.6 percentage + interval)', () => {
  it('shows "x of n" below 30, a Wilson interval from 30 to 199, a percentage from 200', () => {
    expect(rate(5, 29)).toEqual({ kind: 'fraction', x: 5, n: 29 });
    expect(rate(15, 30)).toMatchObject({ kind: 'interval', p: 0.5 });
    expect(rate(100, 199).kind).toBe('interval');
    expect(rate(100, 200)).toEqual({ kind: 'percent', p: 0.5, x: 100, n: 200 });
    expect(rate(0, 0)).toEqual({ kind: 'none' });
  });
  it('Wilson 95 % matches reference values', () => {
    const [lo, hi] = wilson(15, 30);
    expect(lo).toBeCloseTo(0.3315, 3);
    expect(hi).toBeCloseTo(0.6685, 3);
    const [lo2, hi2] = wilson(3, 50);
    expect(lo2).toBeCloseTo(0.0206, 3);
    expect(hi2).toBeCloseTo(0.1622, 3);
  });
});

describe('countDelta / rateDelta', () => {
  it('needs both ≥ 20 and |a − b| ≥ 2·√(a + b)', () => {
    expect(countDelta(19, 40)).toEqual({ kind: 'small' });
    expect(countDelta(40, 30)).toEqual({ kind: 'flat' }); // 10 < 2·√70 ≈ 16.7
    expect(countDelta(60, 30)).toEqual({ kind: 'change', diff: 30 }); // 30 ≥ 2·√90 ≈ 19
    expect(countDelta(20, 40)).toEqual({ kind: 'change', diff: -20 }); // 20 ≥ 2·√60 ≈ 15.5
  });
  it('rate delta only with both n ≥ 30', () => {
    expect(rateDelta(10, 29, 10, 40)).toEqual({ kind: 'small' });
    expect(rateDelta(15, 30, 10, 40)).toEqual({ kind: 'change', pp: 25 });
  });
});

describe('foldRows (§8.6 rows ≥ 3, M3)', () => {
  it('folds rows below 3 and the API (other) row into one "other (n)"', () => {
    const rows = [
      { key: 'a', v: 10 },
      { key: 'b', v: 3 },
      { key: 'c', v: 2 },
      { key: '(other)', v: 4 },
      { key: 'd', v: 1 },
    ];
    const r = foldRows(rows, (x) => x.v, (x) => x.key === '(other)');
    expect(r.kept.map((x) => x.key)).toEqual(['a', 'b']);
    expect(r.other).toBe(7);
  });
  it('gives null when nothing is folded', () => {
    expect(foldRows([{ v: 5 }], (x) => x.v, () => false).other).toBeNull();
  });
});

describe('medianBucket (§8.3, L4)', () => {
  it('first bucket where the running total reaches ceil(n/2)', () => {
    expect(medianBucket([1, 1, 2, 2, 2, 1, 1, 0], 10)).toEqual({ kind: 'bucket', index: 3, n: 10 }); // ceil(5): 1,2,4,6 → index 3
    expect(medianBucket([5, 5, 0, 0, 0, 0, 0, 0], 10)).toEqual({ kind: 'bucket', index: 0, n: 10 });
    expect(medianBucket([0, 0, 0, 0, 0, 0, 0, 11], 11)).toEqual({ kind: 'bucket', index: 7, n: 11 });
  });
  it('shows "–" + n below 10 samples, and "–" for none', () => {
    expect(medianBucket([9, 0, 0, 0, 0, 0, 0, 0], 9)).toEqual({ kind: 'few', n: 9 });
    expect(medianBucket([0, 0, 0, 0, 0, 0, 0, 0], 0)).toEqual({ kind: 'few', n: 0 });
  });
});

describe('winner', () => {
  it('needs leader ≥ 5 and ≥ 2× the runner-up', () => {
    expect(winner([10, 5, 1])).toBe(0);
    expect(winner([10, 6])).toBeNull();
    expect(winner([4, 1])).toBeNull();
    expect(winner([6])).toBe(0);
    expect(winner([])).toBeNull();
  });
});

describe('bucketSeries (§8.6 charts, L5)', () => {
  const days = (from: string, n: number) =>
    Array.from({ length: n }, (_, i) => ({ day: new Date(Date.parse(`${from}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10), v: 1 }));
  it('daily up to 31 days', () => {
    const b = bucketSeries(days('2026-10-09', 31), ['v']);
    expect(b.unit).toBe('day');
    expect(b.buckets).toHaveLength(31);
  });
  it('weekly (ISO weeks) up to 183 days, partial edges marked', () => {
    const b = bucketSeries(days('2026-10-08', 32), ['v']); // Thu 8 Oct .. Sun 8 Nov
    expect(b.unit).toBe('week');
    expect(b.buckets[0]).toMatchObject({ start: '2026-10-05', values: { v: 4 }, partial: true });
    expect(b.buckets.at(-1)).toMatchObject({ start: '2026-11-02', values: { v: 7 }, partial: false });
    expect(bucketSeries(days('2026-01-01', 183), ['v']).unit).toBe('week');
  });
  it('monthly beyond 183 days, across a year end', () => {
    const b = bucketSeries(days('2025-11-15', 184), ['v']);
    expect(b.unit).toBe('month');
    expect(b.buckets[0]).toMatchObject({ start: '2025-11-01', values: { v: 16 }, partial: true });
    expect(b.buckets[1]).toMatchObject({ start: '2025-12-01', values: { v: 31 }, partial: false });
    expect(b.buckets[2].start).toBe('2026-01-01');
  });
});
