import { describe, expect, it } from 'vitest';
import { fillLoginTimeline, niceCeil, slotBuckets } from './chartScale';

const iso = (ms: number) => new Date(ms).toISOString();
const H = 3600 * 1000;
const D = 24 * H;
const b = (ms: number, requests = 1) => ({ bucketStart: iso(ms), requests });

// Hour-aligned `to`.
const TO_H = Date.UTC(2026, 10, 9, 12);
// Second-precise `to`, like toWindow() produces.
const TO_U = TO_H + 17 * 60 * 1000 + 5000;

const win = (to: number, ms: number) => ({ from: iso(to - ms), to: iso(to) });

describe('slotBuckets', () => {
  it('gives exact slot counts on aligned windows', () => {
    expect(slotBuckets([], win(TO_H, 24 * H)).slots).toHaveLength(24);
    expect(slotBuckets([], win(TO_H, 7 * D)).slots).toHaveLength(168);
    const d = slotBuckets([], win(Date.UTC(2026, 10, 9), 30 * D));
    expect(d.slots).toHaveLength(30);
    expect(d.daily).toBe(true);
  });

  it('gives one more slot on unaligned windows, partial first and ongoing last', () => {
    const h24 = slotBuckets([], win(TO_U, 24 * H));
    expect(h24.slots).toHaveLength(25);
    expect(h24.daily).toBe(false);
    expect(h24.slots[0].partial).toBe(true);
    expect(h24.slots[0].ongoing).toBe(false);
    expect(h24.slots[24].ongoing).toBe(true);
    expect(h24.slots.slice(1, 24).every((s) => !s.partial && !s.ongoing)).toBe(true);
    expect(slotBuckets([], win(TO_U, 7 * D)).slots).toHaveLength(169);
    const d30 = slotBuckets([], win(TO_U, 30 * D));
    expect(d30.slots).toHaveLength(31);
    expect(d30.daily).toBe(true);
  });

  it('marks no slot partial or ongoing on an aligned window', () => {
    const r = slotBuckets([], win(TO_H, 24 * H));
    expect(r.slots.some((s) => s.partial || s.ongoing)).toBe(false);
  });

  it('leaves missing slots null and keeps the buckets they match', () => {
    const w = win(TO_H, 24 * H);
    const first = TO_H - 24 * H;
    const r = slotBuckets([b(first + 3 * H, 9)], w);
    expect(r.aligned).toBe(true);
    expect(r.slots[3].point?.requests).toBe(9);
    expect(r.slots.filter((s) => s.point === null)).toHaveLength(23);
  });

  it('is not aligned for a misaligned bucket', () => {
    const pts = [b(TO_H - 5 * H + 60_000)];
    const r = slotBuckets(pts, win(TO_H, 24 * H));
    expect(r.aligned).toBe(false);
    expect(r.points).toBe(pts);
  });

  it('is not aligned for an out-of-window bucket', () => {
    const pts = [b(TO_H - 30 * H)];
    expect(slotBuckets(pts, win(TO_H, 24 * H)).aligned).toBe(false);
  });

  it('is not aligned for an invalid or reversed window', () => {
    const pts = [b(TO_H)];
    expect(slotBuckets(pts, { from: 'x', to: iso(TO_H) })).toMatchObject({ aligned: false, daily: false });
    expect(slotBuckets(pts, { from: iso(TO_H), to: iso(TO_H - H) })).toMatchObject({ aligned: false, daily: false });
  });
});

describe('niceCeil', () => {
  it('rounds up to 1, 2 or 5 times a power of ten', () => {
    expect([0, 7, 132, 1234].map(niceCeil)).toEqual([1, 10, 200, 2000]);
    expect([1, 2, 3, 5, 6].map(niceCeil)).toEqual([1, 2, 5, 5, 10]);
  });

  it('handles power-of-ten edges', () => {
    expect([10, 11, 100, 101, 1000, 1001, 500, 501].map(niceCeil)).toEqual([10, 20, 100, 200, 1000, 2000, 500, 1000]);
  });

  it('returns 1 for NaN, negative and infinite values', () => {
    expect([NaN, -5, Infinity, -Infinity, 0.3].map(niceCeil)).toEqual([1, 1, 1, 1, 1]);
  });
});

describe('fillLoginTimeline', () => {
  const lb = (ms: number) => ({ bucketStart: iso(ms), success: 2, failure: 1, locked: 0 });

  it('turns missing slots into zero buckets', () => {
    const w = win(TO_H, 24 * H);
    const first = TO_H - 24 * H;
    const r = fillLoginTimeline([lb(first + 2 * H)], w);
    expect(r.daily).toBe(false);
    expect(r.points).toHaveLength(24);
    expect(r.points[2]).toMatchObject({ success: 2, failure: 1 });
    expect(r.points[0]).toEqual({ bucketStart: iso(first), success: 0, failure: 0, locked: 0 });
  });

  it('returns the raw points for an invalid window, with daily false', () => {
    const pts = [lb(TO_H)];
    const r = fillLoginTimeline(pts, { from: iso(TO_H), to: iso(TO_H) });
    expect(r.points).toBe(pts);
    expect(r.daily).toBe(false);
  });

  it('returns the raw points for a misaligned bucket, with daily as computed', () => {
    const pts = [lb(Date.UTC(2026, 10, 1, 5))];
    const r = fillLoginTimeline(pts, win(TO_H, 30 * D));
    expect(r.points).toBe(pts);
    expect(r.daily).toBe(true);
  });

  it('returns the raw points for an out-of-window bucket', () => {
    const pts = [lb(TO_H - 40 * D)];
    const r = fillLoginTimeline(pts, win(TO_H, 30 * D));
    expect(r.points).toBe(pts);
  });
});
