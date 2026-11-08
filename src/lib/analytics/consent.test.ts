import { describe, expect, it, vi } from 'vitest';
import {
  ANALYTICS_CONSENT_VERSION,
  CONSENT_KEY,
  consentExpired,
  parseConsent,
  readConsent,
  readFlag,
  serializeConsent,
  utcDay,
  type StorageLike,
} from './consent';
import { isBarSuppressedPath } from './paths';

const record = (over: Record<string, unknown> = {}) =>
  JSON.stringify({ v: ANALYTICS_CONSENT_VERSION, choice: 'granted', by: 'user', at: '2026-11-08', ...over });

const recordingStorage = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));
  const storage: StorageLike = {
    getItem: vi.fn((k: string) => data.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => void data.set(k, v)),
    removeItem: vi.fn((k: string) => void data.delete(k)),
  };
  return storage;
};

describe('utcDay', () => {
  it('formats the UTC calendar day', () => {
    expect(utcDay(new Date('2026-11-08T23:30:00+01:00'))).toBe('2026-11-08');
    expect(utcDay(new Date('2026-11-09T00:30:00+01:00'))).toBe('2026-11-08');
  });
});

describe('consentExpired (consentDate + 365 days, shared with WA-2b)', () => {
  it('is valid up to day 364 and expired from day 365', () => {
    expect(consentExpired('2026-11-08', '2026-11-08')).toBe(false);
    expect(consentExpired('2026-11-08', '2027-11-07')).toBe(false);
    expect(consentExpired('2026-11-08', '2027-11-08')).toBe(true);
  });

  it('counts days, not calendar months, across a leap day', () => {
    // 2028-02-29 lies in the span: 365 days after 2027-11-08 is 2028-11-07.
    expect(consentExpired('2027-11-08', '2028-11-06')).toBe(false);
    expect(consentExpired('2027-11-08', '2028-11-07')).toBe(true);
  });

  it('tolerates one day of clock skew into the future, not more', () => {
    expect(consentExpired('2026-11-09', '2026-11-08')).toBe(false);
    expect(consentExpired('2026-11-10', '2026-11-08')).toBe(true);
  });

  it('treats malformed dates as expired', () => {
    for (const at of ['2026-02-30', '2026-13-01', '26-11-08', '2026-11-08T00:00:00Z', '']) {
      expect(consentExpired(at, '2026-11-08'), at).toBe(true);
    }
  });
});

describe('parseConsent', () => {
  const today = '2026-11-08';

  it('accepts a valid record', () => {
    expect(parseConsent(record(), today)).toEqual({
      v: ANALYTICS_CONSENT_VERSION,
      choice: 'granted',
      by: 'user',
      at: '2026-11-08',
    });
    expect(parseConsent(record({ choice: 'denied', by: 'signal' }), today)?.choice).toBe('denied');
  });

  it('rejects another consent version, so a version bump asks again', () => {
    expect(parseConsent(record({ v: ANALYTICS_CONSENT_VERSION - 1 }), today)).toBeNull();
    expect(parseConsent(record({ v: ANALYTICS_CONSENT_VERSION + 1 }), today)).toBeNull();
    expect(parseConsent(record({ v: '1' }), today)).toBeNull();
  });

  it('rejects malformed records', () => {
    const bad = [
      null,
      '',
      'not json',
      '[]',
      '"granted"',
      record({ choice: 'yes' }),
      record({ by: 'admin' }),
      record({ at: '2026-02-30' }),
      record({ extra: 1 }),
      JSON.stringify({ v: ANALYTICS_CONSENT_VERSION, choice: 'granted', by: 'user' }),
    ];
    for (const raw of bad) expect(parseConsent(raw, today), String(raw)).toBeNull();
  });

  it('rejects an expired record (12 months fixed, no sliding)', () => {
    expect(parseConsent(record({ at: '2025-11-08' }), today)).toBeNull();
    expect(parseConsent(record({ at: '2025-11-09' }), today)).not.toBeNull();
  });
});

describe('readConsent / readFlag', () => {
  const now = () => new Date('2026-11-08T12:00:00Z');

  it('reads without writing', () => {
    const storage = recordingStorage({ [CONSENT_KEY]: record({ v: 0 }) });
    expect(readConsent(storage, now())).toBeNull();
    expect(readConsent(recordingStorage({ [CONSENT_KEY]: record() }), now())?.choice).toBe('granted');
    expect(readFlag(storage, 'fa_forget_pending')).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it('treats blocked or missing storage as "no choice"', () => {
    const throwing: StorageLike = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {},
      removeItem: () => {},
    };
    expect(readConsent(throwing, now())).toBeNull();
    expect(readFlag(throwing, 'fa_forget_pending')).toBe(false);
    expect(readConsent(null, now())).toBeNull();
    expect(readFlag(null, 'fa_optout')).toBe(false);
  });

  it('reads a flag only when it is exactly "1"', () => {
    expect(readFlag(recordingStorage({ fa_optout: '1' }), 'fa_optout')).toBe(true);
    expect(readFlag(recordingStorage({ fa_optout: 'true' }), 'fa_optout')).toBe(false);
  });
});

describe('serializeConsent', () => {
  it('writes the four-field record with the UTC day', () => {
    expect(JSON.parse(serializeConsent('denied', 'user', new Date('2026-11-08T23:59:00Z')))).toEqual({
      v: ANALYTICS_CONSENT_VERSION,
      choice: 'denied',
      by: 'user',
      at: '2026-11-08',
    });
  });
});

describe('isBarSuppressedPath', () => {
  it('suppresses the dashboard and everything below it', () => {
    expect(isBarSuppressedPath('/dashboard')).toBe(true);
    expect(isBarSuppressedPath('/dashboard/network')).toBe(true);
    expect(isBarSuppressedPath('/')).toBe(false);
    expect(isBarSuppressedPath('/dashboards')).toBe(false);
    expect(isBarSuppressedPath('/automation')).toBe(false);
  });
});
