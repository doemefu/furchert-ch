'use client';

// Client island for the dashboard header's date/time string.
//
// SSR initial paint comes from DashboardShell, pinned to Europe/Zurich
// (so no-JS users and SEO output see Zurich-correct values). After
// hydration, useEffect re-formats with the browser's local time zone
// using the active page locale's language tag — only the timeZone
// changes, never the language, so the format stays consistent with the
// surrounding UI.
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

export function DateTimeStrip({ initial, locale }: { initial: string; locale: Locale }) {
  const [text, setText] = useState(initial);

  useEffect(() => {
    const tag = locale === 'de' ? 'de-CH' : 'en-GB';
    const now = new Date();
    const date = new Intl.DateTimeFormat(tag, { dateStyle: 'full' }).format(now);
    const time = new Intl.DateTimeFormat(tag, { timeStyle: 'short' }).format(now);
    setText(`${date} · ${time}`);
  }, [locale]);

  return <p style={style}>{text}</p>;
}
