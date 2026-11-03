// Cron presets for the schedules form of /dashboard/devices (#45). Pure, no
// dependency, safe in client components.
//
// device-service evaluates Spring cron expressions (6 fields, seconds first)
// in its own time zone, which is UTC (device-service README "Schedules").
// The admin thinks in Zurich time, so the "daily at hh:mm" preset converts
// the Zurich wall time to UTC with the offset of the NEXT occurrence. Because
// the stored expression stays in UTC, the run moves by one hour at every
// daylight-saving switch; `nextDailyShift` says when and to which time, and
// the API's `nextRun` after saving confirms what the expression means.

export const INTERVAL_MINUTES = [5, 10, 15, 20, 30, 60] as const;
export type IntervalMinutes = (typeof INTERVAL_MINUTES)[number];

export type CronPreset =
  /** Daily at a Zurich wall time. */
  | { kind: 'daily'; hour: number; minute: number }
  | { kind: 'interval'; minutes: IntervalMinutes }
  | { kind: 'custom'; expr: string };

const ZONE = 'Europe/Zurich';
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const partsFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

interface WallTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function zurichWall(ms: number): WallTime {
  const p: Record<string, number> = {};
  for (const { type, value } of partsFormat.formatToParts(new Date(ms))) {
    if (type !== 'literal') p[type] = Number(value);
  }
  return { year: p.year, month: p.month, day: p.day, hour: p.hour % 24, minute: p.minute, second: p.second };
}

/** Zurich's UTC offset in minutes at instant `ms` (+60 in winter, +120 in summer). */
export function zurichOffsetMinutes(ms: number): number {
  const w = zurichWall(ms);
  const wallAsUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return Math.round((wallAsUtc - Math.floor(ms / 1000) * 1000) / MINUTE_MS);
}

/** The instant at which Zurich's clock shows the given wall time (wall time expressed as a UTC-epoch). */
function wallToInstant(wallAsUtc: number): number {
  let instant = wallAsUtc - zurichOffsetMinutes(wallAsUtc) * MINUTE_MS;
  const offset = zurichOffsetMinutes(instant);
  instant = wallAsUtc - offset * MINUTE_MS;
  return instant;
}

/**
 * Next instant (strictly after `nowMs`) at which Zurich shows hh:mm. A day on
 * which that wall time does not exist (02:xx on the spring switch) is skipped.
 */
function nextZurichOccurrence(hour: number, minute: number, nowMs: number): number {
  const today = zurichWall(nowMs);
  for (let addDays = 0; addDays < 4; addDays++) {
    const instant = wallToInstant(Date.UTC(today.year, today.month - 1, today.day + addDays, hour, minute));
    const w = zurichWall(instant);
    if (instant > nowMs && w.hour === hour && w.minute === minute) return instant;
  }
  return wallToInstant(Date.UTC(today.year, today.month - 1, today.day + 1, hour, minute));
}

/** Next instant (strictly after `nowMs`) at which UTC shows hh:mm. */
function nextUtcOccurrence(hour: number, minute: number, nowMs: number): number {
  const d = new Date(nowMs);
  const today = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour, minute);
  return today > nowMs ? today : today + DAY_MS;
}

export function buildCron(preset: CronPreset, nowMs: number): string {
  switch (preset.kind) {
    case 'daily': {
      const instant = new Date(nextZurichOccurrence(preset.hour, preset.minute, nowMs));
      return `0 ${instant.getUTCMinutes()} ${instant.getUTCHours()} * * *`;
    }
    case 'interval':
      return preset.minutes === 60 ? '0 0 * * * *' : `0 */${preset.minutes} * * * *`;
    default:
      return preset.expr.trim();
  }
}

const DAILY = /^0 (\d{1,2}) (\d{1,2}) \* \* \*$/;
const INTERVAL = /^0 \*\/(\d{1,2}) \* \* \* \*$/;

/** UTC hh:mm of a `0 m h * * *` expression, or null. */
function dailyUtc(expr: string): { hour: number; minute: number } | null {
  const m = DAILY.exec(expr.trim());
  if (!m) return null;
  const minute = Number(m[1]);
  const hour = Number(m[2]);
  return minute <= 59 && hour <= 23 ? { hour, minute } : null;
}

/** Inverse of {@link buildCron} for the two preset shapes; anything else is `custom`. */
export function describeCron(expr: string, nowMs: number): CronPreset {
  const trimmed = expr.trim();
  const daily = dailyUtc(trimmed);
  if (daily) {
    const w = zurichWall(nextUtcOccurrence(daily.hour, daily.minute, nowMs));
    return { kind: 'daily', hour: w.hour, minute: w.minute };
  }
  if (trimmed === '0 0 * * * *') return { kind: 'interval', minutes: 60 };
  const iv = INTERVAL.exec(trimmed);
  if (iv && (INTERVAL_MINUTES as readonly number[]).includes(Number(iv[1]))) {
    return { kind: 'interval', minutes: Number(iv[1]) as IntervalMinutes };
  }
  return { kind: 'custom', expr };
}

/**
 * The next daylight-saving switch in Zurich after `fromMs` (within ~1 year),
 * to the hour: sampled daily, then narrowed hour by hour.
 */
export function nextOffsetChange(fromMs: number): { atMs: number; offsetAfter: number } | null {
  const base = zurichOffsetMinutes(fromMs);
  for (let day = 1; day <= 370; day++) {
    const t = fromMs + day * DAY_MS;
    if (zurichOffsetMinutes(t) === base) continue;
    // The switch lies in (t - 1 day, t]; find the first whole UTC hour with the new offset.
    let h = Math.floor((t - DAY_MS) / HOUR_MS) * HOUR_MS + HOUR_MS;
    while (zurichOffsetMinutes(h) === base) h += HOUR_MS;
    return { atMs: h, offsetAfter: zurichOffsetMinutes(h) };
  }
  return null;
}

/**
 * For a daily UTC schedule: the first run after the next daylight-saving
 * switch (`atMs`, so its Zurich date is the day the new time starts) and the
 * Zurich time it fires at from then on. Null for other shapes.
 */
export function nextDailyShift(expr: string, nowMs: number): { atMs: number; hour: number; minute: number } | null {
  const daily = dailyUtc(expr);
  if (!daily) return null;
  // Measured from the next run: if a switch falls before it, the time shown
  // for that run is already the new one, and the shift that matters is the next.
  const change = nextOffsetChange(nextUtcOccurrence(daily.hour, daily.minute, nowMs));
  if (!change) return null;
  const firstRun = nextUtcOccurrence(daily.hour, daily.minute, change.atMs - 1);
  const w = zurichWall(firstRun);
  return { atMs: firstRun, hour: w.hour, minute: w.minute };
}

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "08:05" → { hour: 8, minute: 5 }, or null. */
export function parseTime(v: string): { hour: number; minute: number } | null {
  const m = TIME.exec(v);
  return m ? { hour: Number(m[1]), minute: Number(m[2]) } : null;
}

export interface CronFormState {
  mode: 'daily' | 'interval' | 'custom';
  /** "hh:mm", Zurich time. */
  time: string;
  minutes: IntervalMinutes;
  custom: string;
}

/**
 * The expression the schedule form submits. An untouched form keeps the stored
 * expression as it is: near a daylight-saving switch, showing a stored UTC time
 * in Zurich time and converting it back can land one hour apart, and a save
 * that only changes the device, target state or `active` must not move the run.
 */
export function cronFromForm(form: CronFormState, nowMs: number, initial: string | null, touched: boolean): string {
  if (!touched && initial !== null) return initial.trim();
  if (form.mode === 'daily') {
    const t = parseTime(form.time);
    return t ? buildCron({ kind: 'daily', ...t }, nowMs) : '';
  }
  if (form.mode === 'interval') return buildCron({ kind: 'interval', minutes: form.minutes }, nowMs);
  return form.custom.trim();
}

/**
 * Local guard before device-service sees an expression: every schedule
 * publishes to `terraGeneral/<field>/schedule`, which reaches every terrarium,
 * so a seconds wildcard would command all of them every second. Macros
 * (`@daily`, …) fire at second 0. device-service validates the rest.
 */
export function checkCronSafety(expr: string): null | 'cronFields' | 'cronSeconds' {
  const trimmed = expr.trim();
  if (trimmed.startsWith('@')) return null;
  const fields = trimmed.split(/\s+/).filter(Boolean);
  if (fields.length !== 6) return 'cronFields';
  const seconds = fields[0];
  return /^\d{1,2}$/.test(seconds) && Number(seconds) <= 59 ? null : 'cronSeconds';
}
