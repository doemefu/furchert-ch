import { describe, expect, it } from 'vitest';
import { STALE_AFTER_MS, canControl, freshness, isDeviceField, parseServiceTime, switchState } from './fields';

describe('switchState', () => {
  it.each([
    ['1', 'on'],
    ['on', 'on'],
    ['ON', 'on'],
    ['0', 'off'],
    ['off', 'off'],
    [null, 'unknown'],
    ['2', 'unknown'],
    ['', 'unknown'],
  ] as const)('%s → %s', (raw, expected) => {
    expect(switchState(raw)).toBe(expected);
  });
});

describe('isDeviceField', () => {
  it('accepts only the three actuators', () => {
    expect(isDeviceField('light')).toBe(true);
    expect(isDeviceField('nightLight')).toBe(true);
    expect(isDeviceField('rain')).toBe(true);
    expect(isDeviceField('Light')).toBe(false);
    expect(isDeviceField(null)).toBe(false);
  });
});

describe('parseServiceTime', () => {
  const at = (iso: string) => Date.parse(iso);

  it('reads an offset-less LocalDateTime as UTC (device-service runs in UTC)', () => {
    expect(parseServiceTime('2026-08-31T14:03:12.123456789')).toBe(at('2026-08-31T14:03:12.123Z'));
    expect(parseServiceTime('2026-08-31T14:03:12.123456')).toBe(at('2026-08-31T14:03:12.123Z'));
    expect(parseServiceTime('2026-08-31T14:03:12.5')).toBe(at('2026-08-31T14:03:12.500Z'));
    expect(parseServiceTime('2026-08-31T14:03:12')).toBe(at('2026-08-31T14:03:12Z'));
  });

  it('reads LocalDateTime.toString() without seconds', () => {
    expect(parseServiceTime('2026-08-31T14:03')).toBe(at('2026-08-31T14:03:00Z'));
  });

  it('keeps an explicit offset', () => {
    expect(parseServiceTime('2026-11-04T08:00:00Z')).toBe(at('2026-11-04T08:00:00Z'));
    expect(parseServiceTime('2026-11-04T09:00:00+01:00')).toBe(at('2026-11-04T08:00:00Z'));
  });

  it.each([null, '', 'yesterday', '2026-13-45T99:99', 42])('returns null for %o', (raw) => {
    expect(parseServiceTime(raw as string | null)).toBeNull();
  });
});

describe('freshness', () => {
  const now = Date.parse('2026-11-03T20:00:00Z');

  it('is never when no message was ever seen', () => {
    expect(freshness(true, null, now)).toBe('never');
    expect(freshness(null, null, now)).toBe('never');
  });

  it('is offline when the broker flag is not true', () => {
    expect(freshness(false, now - 1000, now)).toBe('offline');
    expect(freshness(null, now - 1000, now)).toBe('offline');
  });

  it('is live while messages are recent', () => {
    expect(freshness(true, now - 30_000, now)).toBe('live');
    expect(freshness(true, now - STALE_AFTER_MS + 1, now)).toBe('live');
  });

  it('is stale when the flag says online but nothing arrived for a while (broker restart without LWT)', () => {
    expect(freshness(true, now - STALE_AFTER_MS, now)).toBe('stale');
    expect(freshness(true, Date.parse('2026-08-31T14:03:00Z'), now)).toBe('stale');
  });

  it('treats a timestamp in the future as just seen', () => {
    expect(freshness(true, now + 60_000, now)).toBe('live');
  });
});

describe('canControl', () => {
  it('only allows commands to devices that are reporting', () => {
    expect(canControl('live')).toBe(true);
    expect(canControl('stale')).toBe(false);
    expect(canControl('offline')).toBe(false);
    expect(canControl('never')).toBe(false);
  });
});
