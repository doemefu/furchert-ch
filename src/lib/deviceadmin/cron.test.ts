import { describe, expect, it } from 'vitest';
import { buildCron, checkCronSafety, cronFromForm, describeCron, nextDailyShift, nextOffsetChange, parseTime, zurichOffsetMinutes } from './cron';

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

  it('skips a Zurich time that does not exist on the switch day', () => {
    // 02:30 on 2027-03-28 does not exist (02:00 → 03:00); the next 02:30 is CEST.
    expect(buildCron({ kind: 'daily', hour: 2, minute: 30 }, at('2027-03-27T12:00:00Z'))).toBe('0 30 0 * * *');
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
  it('names the first run after the switch and its Zurich time', () => {
    expect(nextDailyShift('0 0 7 * * *', WINTER)).toEqual({ atMs: at('2027-03-28T07:00:00Z'), hour: 9, minute: 0 });
    // 23:30 UTC on the switch day is already 01:30 on the 29th in Zurich.
    expect(nextDailyShift('0 30 23 * * *', WINTER)).toEqual({ atMs: at('2027-03-28T23:30:00Z'), hour: 1, minute: 30 });
  });

  it("does not name the switch day when that day's run still uses the old time", () => {
    // 00:30 UTC on 2027-03-28 is before the 01:00 UTC switch; the first shifted run is on the 29th.
    expect(nextDailyShift('0 30 0 * * *', WINTER)).toEqual({ atMs: at('2027-03-29T00:30:00Z'), hour: 2, minute: 30 });
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

describe('parseTime', () => {
  it('reads hh:mm', () => {
    expect(parseTime('08:05')).toEqual({ hour: 8, minute: 5 });
    expect(parseTime('23:59')).toEqual({ hour: 23, minute: 59 });
    expect(parseTime('24:00')).toBeNull();
    expect(parseTime('')).toBeNull();
  });
});

describe('cronFromForm', () => {
  const form = { mode: 'daily' as const, time: '09:00', minutes: 15 as const, custom: '' };

  // Near a daylight-saving switch, describing a stored UTC time and building it
  // back can land one hour apart; an untouched form must keep the stored value.
  it.each([
    ['0 0 7 * * *', '2027-03-27T07:30:00Z'],
    ['0 0 6 * * *', '2027-03-27T06:30:00Z'],
    ['0 30 0 * * *', '2026-10-24T05:30:00Z'],
  ])('keeps the stored expression %s untouched at %s', (initial, now) => {
    const d = describeCron(initial, at(now));
    expect(d.kind).toBe('daily');
    const shown = d.kind === 'daily' ? `${String(d.hour).padStart(2, '0')}:${String(d.minute).padStart(2, '0')}` : '';
    expect(cronFromForm({ ...form, time: shown }, at(now), initial, false)).toBe(initial);
  });

  it('rebuilds once the admin changed something', () => {
    expect(cronFromForm({ ...form, time: '08:00' }, WINTER, '0 0 6 * * *', true)).toBe('0 0 7 * * *');
    expect(cronFromForm({ ...form, mode: 'interval' }, WINTER, '0 0 6 * * *', true)).toBe('0 */15 * * * *');
    expect(cronFromForm({ ...form, mode: 'custom', custom: ' @daily ' }, WINTER, null, true)).toBe('@daily');
  });

  it('builds for a new schedule even when untouched', () => {
    expect(cronFromForm({ ...form, time: '08:00' }, WINTER, null, false)).toBe('0 0 7 * * *');
  });

  it('returns an empty expression for an invalid time', () => {
    expect(cronFromForm({ ...form, time: '' }, WINTER, null, true)).toBe('');
  });
});
