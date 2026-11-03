// Date/time labels for /dashboard/devices, always in Europe/Zurich. Pure, so
// the server page (initial render) and the client panels (labels built in
// event handlers, never during render) produce the same strings.
import type { Locale } from '@/i18n/routing';
import { LOCALE_TAG } from '../datetime';

const ZONE = 'Europe/Zurich';

export interface Formatters {
  /** "31.08.2026, 16:03" — or "—" for null. */
  abs: (ms: number | null) => string;
  /** "vor 64 Tagen" / "in 13 Stunden" relative to `nowMs` — or "—" for null. */
  rel: (ms: number | null) => string;
  /** "28.03.2027". */
  date: (ms: number) => string;
  /** "08:05" from hour and minute. */
  hm: (hour: number, minute: number) => string;
}

export function makeFormatters(locale: Locale, nowMs: number): Formatters {
  const tag = LOCALE_TAG[locale];
  const absFmt = new Intl.DateTimeFormat(tag, { dateStyle: 'medium', timeStyle: 'short', timeZone: ZONE });
  const dateFmt = new Intl.DateTimeFormat(tag, { dateStyle: 'medium', timeZone: ZONE });
  const relFmt = new Intl.RelativeTimeFormat(tag, { numeric: 'auto', style: 'long' });
  const unit = (seconds: number): [number, Intl.RelativeTimeFormatUnit] => {
    const a = Math.abs(seconds);
    if (a < 60) return [seconds, 'second'];
    if (a < 3600) return [Math.round(seconds / 60), 'minute'];
    if (a < 86400) return [Math.round(seconds / 3600), 'hour'];
    return [Math.round(seconds / 86400), 'day'];
  };
  const rel = (ms: number | null) => {
    if (ms === null || !Number.isFinite(ms)) return '—';
    const [v, u] = unit(Math.round((ms - nowMs) / 1000));
    return relFmt.format(v, u);
  };
  return {
    abs: (ms) => (ms === null || !Number.isFinite(ms) ? '—' : absFmt.format(new Date(ms))),
    rel,
    date: (ms) => dateFmt.format(new Date(ms)),
    hm: (hour, minute) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  };
}
