import { describe, expect, it } from 'vitest';
import { ENGAGED_CAP_MS, EngagementClock, scrollStep } from './engagement';

describe('EngagementClock (§3.5)', () => {
  it('counts visible + focused time, the start counting as activity', () => {
    const c = new EngagementClock(0, true, true);
    expect(c.value(10_000)).toBe(10_000);
  });

  it('stops 60 s after the last activity and resumes on activity', () => {
    const c = new EngagementClock(0, true, true);
    expect(c.value(90_000)).toBe(60_000);
    c.activity(100_000);
    expect(c.value(110_000)).toBe(70_000);
  });

  it('pauses while hidden or blurred', () => {
    const c = new EngagementClock(0, true, true);
    c.visibility(false, 5_000);
    c.activity(20_000);
    expect(c.value(30_000)).toBe(5_000);
    c.visibility(true, 30_000);
    c.focus(false, 40_000);
    expect(c.value(50_000)).toBe(15_000);
    c.focus(true, 50_000);
    expect(c.engaged(50_000)).toBe(true);
    expect(c.value(55_000)).toBe(20_000);
  });

  it('starts at 0 when the page opens hidden, and caps at 30 min', () => {
    expect(new EngagementClock(0, false, true).value(10_000)).toBe(0);
    const c = new EngagementClock(0, true, true);
    for (let t = 50_000; t <= 2_000_000; t += 50_000) c.activity(t);
    expect(c.value(2_000_000)).toBe(ENGAGED_CAP_MS);
  });
});

describe('scrollStep', () => {
  it('maps the share of <main> seen to the highest step reached', () => {
    expect(scrollStep(64, 3000, 800)).toBe(0);
    expect(scrollStep(-700, 3000, 800)).toBe(50);
    expect(scrollStep(-2200, 3000, 800)).toBe(100);
    expect(scrollStep(-1900, 3000, 800)).toBe(90);
    expect(scrollStep(0, 0, 800)).toBe(0);
  });
});
