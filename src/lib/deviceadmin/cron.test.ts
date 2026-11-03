import { describe, expect, it } from 'vitest';
import { buildCron, checkCronSafety, describeCron, nextDailyShift, nextOffsetChange, zurichOffsetMinutes } from './cron';

const at = (iso: string) => Date.parse(iso);
const WINTER = at('2026-11-03T19:00:00Z'); // CET, +01:00
const SUMMER = at('2026-07-01T10:00:00Z'); // CEST, +02:00

describe('zurichOffsetMinutes', () => {
  it('knows winter and summer time', () => {
    expect(zurichOffsetMinutes(WINTER)).toBe(60);
    expect(zurichOffsetMinutes(SUMMER)).toBe(120);
  });

  it('handles midnight Zurich time (no hour "24")', () => {
    expect(zurichOffsetMinutes(at('2026-11-03T23:00:00Z'))).toBe(60);
    expect(zurichOffsetMinutes(at('2026-07-01T22:00:00Z'))).toBe(120);
  });
});

describe('buildCron', () => {
  it('converts a daily Zurich time to the UTC cron device-service runs (winter)', () => {
    expect(buildCron({ kind: 'daily', hour: 8, minute: 0 }, WINTER)).toBe('0 0 7 * * *');
  });

  it('converts a daily Zurich time to UTC (summer)', () => {
    expect(buildCron({ kind: 'daily', hour: 8, minute: 15 }, SUMMER)).toBe('0 15 6 * * *');
  });

  it('uses the offset of the next occurrence, not of today', () => {
    // Saturday before the spring switch: the next 08:00 is already summer time.
    expect(buildCron({ kind: 'daily', hour: 8, minute: 0 }, at('2027-03-27T12:00:00Z'))).toBe('0 0 6 * * *');
  });

  it('wraps across midnight', () => {
    expect(buildCron({ kind: 'daily', hour: 0, minute: 30 }, WINTER)).toBe('0 30 23 * * *');
  });

  it('builds interval schedules', () => {
    expect(buildCron({ kind: 'interval', minutes: 15 }, WINTER)).toBe('0 */15 * * * *');
    expect(buildCron({ kind: 'interval', minutes: 60 }, WINTER)).toBe('0 0 * * * *');
  });

  it('passes a custom expression through, trimmed', () => {
    expect(buildCron({ kind: 'custom', expr: '  0 30 6 * * MON-FRI ' }, WINTER)).toBe('0 30 6 * * MON-FRI');
  });
});

describe('describeCron', () => {
  it('recognises a daily UTC schedule and shows it in Zurich time', () => {
    expect(describeCron('0 0 7 * * *', WINTER)).toEqual({ kind: 'daily', hour: 8, minute: 0 });
    expect(describeCron('0 0 7 * * *', SUMMER)).toEqual({ kind: 'daily', hour: 9, minute: 0 });
    expect(describeCron('0 30 23 * * *', WINTER)).toEqual({ kind: 'daily', hour: 0, minute: 30 });
  });

  it('round-trips with buildCron', () => {
    for (const now of [WINTER, SUMMER]) {
      for (const [hour, minute] of [[0, 0], [6, 45], [12, 5], [23, 59]]) {
        const expr = buildCron({ kind: 'daily', hour, minute }, now);
        expect(describeCron(expr, now)).toEqual({ kind: 'daily', hour, minute });
      }
    }
  });

  it('recognises interval schedules', () => {
    expect(describeCron('0 */10 * * * *', WINTER)).toEqual({ kind: 'interval', minutes: 10 });
    expect(describeCron('0 0 * * * *', WINTER)).toEqual({ kind: 'interval', minutes: 60 });
  });

  it('treats everything else as custom', () => {
    for (const expr of ['0 */7 * * * *', '0 30 6 * * MON-FRI', '@daily', '0 0 8 1 * *', '30 0 8 * * *', '0 61 8 * * *']) {
      expect(describeCron(expr, WINTER)).toEqual({ kind: 'custom', expr });
    }
  });
});

describe('nextOffsetChange', () => {
  it('finds the spring switch from winter time', () => {
    const c = nextOffsetChange(WINTER);
    expect(c).not.toBeNull();
    expect(new Date(c!.atMs).toISOString()).toBe('2027-03-28T01:00:00.000Z');
    expect(c!.offsetAfter).toBe(120);
  });

  it('finds the autumn switch from summer time', () => {
    const c = nextOffsetChange(SUMMER);
    expect(new Date(c!.atMs).toISOString()).toBe('2026-10-25T01:00:00.000Z');
    expect(c!.offsetAfter).toBe(60);
  });
});

describe('nextDailyShift', () => {
  it('says when and to which Zurich time a daily UTC schedule moves', () => {
    expect(nextDailyShift('0 0 7 * * *', WINTER)).toEqual({ atMs: at('2027-03-28T01:00:00Z'), hour: 9, minute: 0 });
    expect(nextDailyShift('0 30 23 * * *', WINTER)).toEqual({ atMs: at('2027-03-28T01:00:00Z'), hour: 1, minute: 30 });
  });

  it('is null for non-daily schedules', () => {
    expect(nextDailyShift('0 */15 * * * *', WINTER)).toBeNull();
    expect(nextDailyShift('0 30 6 * * MON-FRI', WINTER)).toBeNull();
  });
});

describe('checkCronSafety', () => {
  it.each(['0 0 8 * * *', '0 */15 * * * *', '30 0 8 * * MON-FRI', '0 0 3 1 1 *', '@daily', '@hourly', '  0 0 8 * * *  '])(
    'accepts %s',
    (expr) => {
      expect(checkCronSafety(expr)).toBeNull();
    },
  );

  it.each(['* * * * * *', '*/5 * * * * *', '0-30 * * * * *', '0,30 0 8 * * *', '60 0 8 * * *'])(
    'rejects per-second schedules: %s',
    (expr) => {
      expect(checkCronSafety(expr)).toBe('cronSeconds');
    },
  );

  it.each(['0 8 * * *', '0 0 8 * * * 2027', ''])('rejects a wrong field count: %o', (expr) => {
    expect(checkCronSafety(expr)).toBe('cronFields');
  });
});
