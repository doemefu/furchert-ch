import type { Locale } from '@/i18n/routing';

// Single source for the dashboard header's date/time string, shared by the
// server shell (DashboardShell, pinned to Europe/Zurich for the SSR paint)
// and the client island (DateTimeStrip, browser-local TZ after hydration).
// Keeping one formatter guarantees the SSR and hydrated strings only ever
// differ by time zone — never by language tag or format options.
export function formatDashboardDateTime(locale: Locale, when: Date, timeZone?: string): string {
  const tag = locale === 'de' ? 'de-CH' : 'en-GB';
  const date = new Intl.DateTimeFormat(tag, { dateStyle: 'full', timeZone }).format(when);
  const time = new Intl.DateTimeFormat(tag, { timeStyle: 'short', timeZone }).format(when);
  return `${date} · ${time}`;
}
