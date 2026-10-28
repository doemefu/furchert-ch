'use client';
// The only client island of /dashboard/services (#47): the today bar of a
// row's 14-day strip is a button that shows or hides the hourly strip of the
// last 24 h. Everything it renders (past bars, hourly strip, texts, colours)
// is server-rendered and passed in, so it holds no data shapes and no Intl.
// The hourly panel is always in the SSR output (`hidden`), so
// `aria-controls` always resolves; without JS it stays collapsed.
import { useState, type ReactNode } from 'react';

export function StripToggle({
  id,
  groupLabel,
  label,
  todayColor,
  todayOpacity,
  todayTitle,
  pastBars,
  hourly,
}: {
  id: string;
  groupLabel: string;
  label: string;
  todayColor: string;
  todayOpacity: number;
  todayTitle: string;
  pastBars: ReactNode;
  hourly: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div role="group" aria-label={groupLabel} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        {pastBars}
        {/* Vertical padding only (offset by the negative margin) for a larger
            hit area without widening the 3px bar gap. No inline `outline`,
            so the browser's default focus ring stays visible. */}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          aria-label={label}
          title={todayTitle}
          onClick={() => setOpen((v) => !v)}
          style={{
            display: 'block',
            flex: '0 0 7px',
            width: 7,
            padding: '6px 0',
            margin: '-6px 0',
            border: 0,
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: 'block',
              width: 7,
              height: 12,
              borderRadius: 1,
              background: todayColor,
              opacity: todayOpacity,
              boxShadow: `0 0 0 ${open ? 2 : 1}px var(--blue-base)`,
            }}
          />
        </button>
      </div>
      <div id={id} hidden={!open} style={{ marginTop: '.4rem' }}>
        {hourly}
      </div>
    </>
  );
}
