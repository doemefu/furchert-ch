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
import { formatDashboardDateTime } from './datetime';

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
    // No timeZone arg → formats in the browser's local zone.
    setText(formatDashboardDateTime(locale, new Date(initialEpoch)));
  }, [locale, initialEpoch]);

  return <p style={style}>{text}</p>;
}
