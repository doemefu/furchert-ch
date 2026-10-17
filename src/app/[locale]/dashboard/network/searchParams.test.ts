import { describe, expect, it, vi } from 'vitest';

// NetworkShell is a Server Component module (next-intl, React); only its
// range list matters here.
vi.mock('./NetworkShell', () => ({ NETWORK_RANGES: ['24h', '7d', '30d'] }));

const { first, parseCursor, parseIp, parseOutcome, parsePinnedWindow, parseRange } = await import('./searchParams');

describe('first', () => {
  it('takes the first value of a repeated param', () => {
    expect(first(['a', 'b'])).toBe('a');
    expect(first('a')).toBe('a');
    expect(first(undefined)).toBeUndefined();
    expect(first([])).toBeUndefined();
  });
});

describe('parseRange', () => {
  it('accepts the known ranges and defaults to 24h', () => {
    expect(parseRange('7d')).toBe('7d');
    expect(parseRange('30d')).toBe('30d');
    for (const v of [undefined, '', '1y', '7D', ' 7d', 'constructor']) expect(parseRange(v)).toBe('24h');
  });
});

describe('parseIp', () => {
  it('treats a missing or empty value as no filter', () => {
    expect(parseIp(undefined)).toEqual({ invalid: false });
    expect(parseIp('')).toEqual({ invalid: false });
  });

  it('accepts IPv4 and IPv6 literals, trimmed', () => {
    expect(parseIp('203.0.113.7')).toEqual({ ip: '203.0.113.7', invalid: false });
    expect(parseIp(' 2001:db8::1 ')).toEqual({ ip: '2001:db8::1', invalid: false });
  });

  it('rejects zone IDs, hostnames, CIDRs and path tricks', () => {
    for (const v of ['fe80::1%eth0', 'example.com', '203.0.113.0/24', '256.0.0.1', '1.2.3', '../admin', '1.2.3.4/../x', ' ']) {
      expect(parseIp(v)).toEqual({ invalid: true });
    }
  });
});

describe('parsePinnedWindow', () => {
  it('accepts a second-precision UTC window of up to 30 days', () => {
    expect(parsePinnedWindow('2026-10-01T00:00:00Z', '2026-10-02T00:00:00Z')).toEqual({ from: '2026-10-01T00:00:00Z', to: '2026-10-02T00:00:00Z' });
    expect(parsePinnedWindow('2026-09-01T00:00:00Z', '2026-10-01T00:00:00Z')).toBeDefined();
  });

  it('rejects missing, malformed, empty, reversed and oversized windows', () => {
    const ok = '2026-10-01T00:00:00Z';
    expect(parsePinnedWindow(undefined, ok)).toBeUndefined();
    expect(parsePinnedWindow(ok, undefined)).toBeUndefined();
    expect(parsePinnedWindow('2026-10-01T00:00:00.000Z', '2026-10-02T00:00:00Z')).toBeUndefined();
    expect(parsePinnedWindow('2026-10-01T00:00:00+02:00', '2026-10-02T00:00:00Z')).toBeUndefined();
    expect(parsePinnedWindow('2026-10-01', '2026-10-02')).toBeUndefined();
    expect(parsePinnedWindow(ok, ok)).toBeUndefined();
    expect(parsePinnedWindow('2026-10-02T00:00:00Z', ok)).toBeUndefined();
    expect(parsePinnedWindow('2026-08-31T23:59:59Z', ok)).toBeUndefined(); // 30 d + 1 s
    expect(parsePinnedWindow('2026-13-01T00:00:00Z', '2026-13-02T00:00:00Z')).toBeUndefined();
  });
});

describe('parseCursor', () => {
  it('passes opaque cursors up to 512 characters', () => {
    expect(parseCursor('abc')).toBe('abc');
    expect(parseCursor('x'.repeat(512))).toHaveLength(512);
  });

  it('drops empty and oversized cursors', () => {
    expect(parseCursor(undefined)).toBeUndefined();
    expect(parseCursor('')).toBeUndefined();
    expect(parseCursor('x'.repeat(513))).toBeUndefined();
  });
});

describe('parseOutcome', () => {
  it('accepts only the three API outcomes', () => {
    expect(parseOutcome('success')).toBe('success');
    expect(parseOutcome('failure')).toBe('failure');
    expect(parseOutcome('locked')).toBe('locked');
    for (const v of [undefined, '', 'SUCCESS', 'all', 'toString']) expect(parseOutcome(v)).toBeUndefined();
  });
});
