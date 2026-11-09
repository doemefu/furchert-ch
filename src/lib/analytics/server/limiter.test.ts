import { describe, expect, it } from 'vitest';
import { checkAll, clientKey, createLimiter, UNKNOWN_KEY } from './limiter';

const T0 = 1_000_000 * 60_000; // aligned to the 60 s bucket

describe('two-bucket sliding counter (§5.8, M6)', () => {
  it('admits up to the limit, then rejects; the previous bucket decays linearly', () => {
    const l = createLimiter({ limit: 20, windowMs: 60_000 });
    for (let i = 0; i < 20; i += 1) {
      expect(l.wouldExceed('k', 1, T0)).toBe(false);
      l.charge('k', 1, T0);
    }
    expect(l.wouldExceed('k', 1, T0 + 59_999)).toBe(true);
    // Next bucket, 50 % in: estimate = 20 · 0.5 = 10.
    expect(l.wouldExceed('k', 10, T0 + 90_000)).toBe(false);
    expect(l.wouldExceed('k', 11, T0 + 90_000)).toBe(true);
    // Two windows later everything is gone.
    expect(l.wouldExceed('k', 20, T0 + 120_000)).toBe(false);
  });

  it('a check never creates a key or charges', () => {
    const l = createLimiter({ limit: 1, windowMs: 60_000 });
    expect(l.wouldExceed('a', 1, T0)).toBe(false);
    expect(l.retryAfterS('a', 1, T0)).toBe(1);
    expect(l.size()).toBe(0);
  });

  it('Retry-After: until the decaying share admits the cost, at least 1 s, at most 600 s', () => {
    const l = createLimiter({ limit: 20, windowMs: 60_000 });
    l.charge('k', 20, T0);
    // Full bucket: the next bucket starts at +60 s and needs 1/20 of it decayed: +3 s.
    expect(l.retryAfterS('k', 1, T0 + 10_000)).toBe(53);
    const big = createLimiter({ limit: 200, windowMs: 600_000 });
    big.charge('k', 200, T0);
    expect(big.retryAfterS('k', 200, T0)).toBe(600);
    expect(big.retryAfterS('k', 201, T0)).toBe(600);
  });

  it('evicts the oldest key at the cap', () => {
    const l = createLimiter({ limit: 1, windowMs: 60_000, maxKeys: 2 });
    l.charge('a', 1, T0);
    l.charge('b', 1, T0);
    l.charge('c', 1, T0);
    expect(l.size()).toBe(2);
    expect(l.wouldExceed('a', 1, T0)).toBe(false);
    expect(l.wouldExceed('c', 1, T0)).toBe(true);
  });

  it('checkAll checks every window first and charges none when one would be exceeded', () => {
    const perKey = createLimiter({ limit: 20, windowMs: 60_000 });
    const global = createLimiter({ limit: 1, windowMs: 60_000 });
    global.charge('global', 1, T0);
    const r = checkAll([{ limiter: perKey, key: 'k' }, { limiter: global, key: 'global' }], T0);
    expect(r.ok).toBe(false);
    expect(perKey.size()).toBe(0);
    expect(checkAll([{ limiter: perKey, key: 'k', cost: 5 }], T0)).toEqual({ ok: true });
    expect(perKey.wouldExceed('k', 15, T0)).toBe(false);
    expect(perKey.wouldExceed('k', 16, T0)).toBe(true);
  });
});

describe('clientKey (Q1)', () => {
  const key = (v?: string) => clientKey(new Headers(v === undefined ? {} : { 'CF-Connecting-IP': v }));
  it.each([
    ['203.0.113.7', '203.0.113.7'],
    ['::ffff:203.0.113.7', '203.0.113.7'],
    ['2001:db8:1:2:3:4:5:6', '2001:db8:1:2::/64'],
    ['2001:DB8:1:2::9', '2001:db8:1:2::/64'],
    ['2001:db8:1:2:ffff::1', '2001:db8:1:2::/64'],
    ['2001:db8::', '2001:db8:0:0::/64'],
    ['::1', '0:0:0:0::/64'],
    ['64:ff9b::203.0.113.7', '64:ff9b:0:0::/64'],
    ['fe80::1%eth0', UNKNOWN_KEY],
    ['not-an-ip', UNKNOWN_KEY],
    ['', UNKNOWN_KEY],
    [undefined, UNKNOWN_KEY],
  ])('%s → %s', (input, out) => {
    expect(key(input)).toBe(out);
  });

  it('ignores X-Forwarded-For', () => {
    expect(clientKey(new Headers({ 'X-Forwarded-For': '198.51.100.1' }))).toBe(UNKNOWN_KEY);
  });
});
