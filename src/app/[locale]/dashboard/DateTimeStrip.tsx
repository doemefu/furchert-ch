'use client';

// Client island for the dashboard header's date/time string.
//
// SSR initial paint comes from DashboardShell, pinned to Europe/Zurich
// (so no-JS users and SEO output see Zurich-correct values). After
// hydration, useEffect re-formats the *same server instant*
// (`initialEpoch`) with the browser's local time zone, using the active
// page locale's language tag — only the timeZone changes, never the
// instant or the language, so there is no time jump and the format stays
// consistent with the surrounding UI.
//
// The parent must pass `key={locale}` to force a remount on DE↔EN
// switch; otherwise React preserves the existing state across the
// re-render and the stale text lingers until useEffect runs.
import { useEffect, useState, type CSSProperties } from 'react';
import type { Locale } from '@/i18n/routing';

const style: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '.75rem',
  color: 'var(--n-50)',
  letterSpacing: '.02em',
};

export function DateTimeStrip({
  initial,
  initialEpoch,
  locale,
}: {
  initial: string;
  initialEpoch: number;
  locale: Locale;
}) {
  const [text, setText] = useState(initial);

  useEffect(() => {
    const tag = locale === 'de' ? 'de-CH' : 'en-GB';
    const when = new Date(initialEpoch);
    const date = new Intl.DateTimeFormat(tag, { dateStyle: 'full' }).format(when);
    const time = new Intl.DateTimeFormat(tag, { timeStyle: 'short' }).format(when);
    setText(`${date} · ${time}`);
  }, [locale, initialEpoch]);

  return <p style={style}>{text}</p>;
}
