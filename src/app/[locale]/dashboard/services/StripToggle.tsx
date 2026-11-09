'use client';
// The only client island of /dashboard/services (#47): the today bar of a
// row's 14-day strip is a button that shows or hides the hourly strip of the
// last 24 h. Everything it renders (past bars, hourly strip, texts, colours)
// is server-rendered and passed in, so it holds no data shapes and no Intl.
// The hourly panel is always in the SSR output (`hidden`), so
// `aria-controls` always resolves; without JS it stays collapsed.
import { useState, type ReactNode } from 'react';
import { DAY_GRID } from '@/lib/metrics/serviceHealth';
import type { BucketStyle } from './buckets';

export function StripToggle({
  id,
  groupLabel,
  label,
  todayStyle,
  todayTitle,
  pastBars,
  hourly,
}: {
  id: string;
  groupLabel: string;
  label: string;
  todayStyle: BucketStyle;
  todayTitle: string;
  pastBars: ReactNode;
  hourly: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // The blue ring marks today; it joins the no-data hairline when there is one.
  const ring = `0 0 0 ${open ? 2 : 1}px var(--blue-base)`;

  return (
    <>
      <div
        role="group"
        aria-label={groupLabel}
        style={{ gridArea: 'days', display: 'grid', gridTemplateColumns: DAY_GRID, gap: 2, minWidth: 0 }}
      >
        {pastBars}
        {/* No inline `outline`, so the browser's default focus ring stays visible. */}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          aria-label={label}
          title={todayTitle}
          onClick={() => setOpen((v) => !v)}
          className="svc-day"
          style={{ display: 'block', width: '100%', padding: 0, border: 0, background: 'transparent', cursor: 'pointer' }}
        >
          <span
            aria-hidden="true"
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              borderRadius: 2,
              background: todayStyle.background,
              opacity: todayStyle.opacity,
              boxShadow: todayStyle.boxShadow ? `${todayStyle.boxShadow}, ${ring}` : ring,
            }}
          />
        </button>
      </div>
      <div id={id} className="svc-hourly" hidden={!open}>
        {hourly}
      </div>
    </>
  );
}
