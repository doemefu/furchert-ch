'use client';

// Live status block of the public homelab section. The rows (labels,
// descriptions) are rendered by the server, so the page is complete without
// JavaScript apart from the live values; this island only fetches
// `/api/homelab-status` and fills in "Running / Not running / Unknown" plus
// the availability. It polls about once a minute while the tab is visible,
// stops when hidden or unmounted, and treats any failure as "Unknown" (no
// error text). The status is always text next to the dot, never colour alone.
import { useEffect, useState } from 'react';
import { StatusDot, type DotStatus } from '@/components/ui/StatusDot';
import type { LabServiceId } from '@/data/homelab-lab';
import { LOCALE_TAG } from '@/app/[locale]/dashboard/datetime';
import type { Locale } from '@/i18n/routing';
import { parseLabStatus, summarize, type LiveRow, type LiveStatus } from '@/lib/lab/parseStatus';

export interface LabLiveStatusProps {
  locale: Locale;
  rows: Array<{ id: LabServiceId; label: string; desc: string }>;
  windowDays: number;
  showUptime: boolean;
  strings: {
    summaryChecking: string;
    summaryAllUp: string;
    summaryDown: string;
    summaryPartial: string;
    summaryUnknown: string;
    up: string;
    down: string;
    unknown: string;
    checking: string;
    /** Contains {pct} and {days}. */
    uptimeTemplate: string;
    noscript: string;
  };
}

const POLL_MS = 60_000;
const DOT: Record<LiveStatus, DotStatus> = { up: 'online', down: 'offline', unknown: 'unknown' };
const mono = {
  fontFamily: 'var(--mono)',
  letterSpacing: '.05em',
  textTransform: 'uppercase' as const,
};

export function LabLiveStatus({ locale, rows, windowDays, showUptime, strings }: LabLiveStatusProps) {
  // null = not loaded yet ("checking"); an empty map = loaded but nothing usable.
  const [live, setLive] = useState<Map<LabServiceId, LiveRow> | null>(null);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let ctrl: AbortController | undefined;

    async function tick() {
      if (stopped) return;
      // Never two loops: a tick that starts while another is pending or in
      // flight (tab shown again, slow fetch) replaces it.
      if (timer) clearTimeout(timer);
      timer = undefined;
      ctrl?.abort();
      ctrl = new AbortController();
      const { signal } = ctrl;
      try {
        const res = await fetch('/api/homelab-status', { signal });
        const json: unknown = res.ok ? await res.json() : null;
        if (!stopped && !signal.aborted) setLive(parseLabStatus(json));
      } catch {
        if (!stopped && !signal.aborted) setLive(new Map());
      }
      if (!stopped && !signal.aborted && !document.hidden) timer = setTimeout(tick, POLL_MS);
    }

    function onVisibility() {
      if (timer) clearTimeout(timer);
      timer = undefined;
      if (document.hidden) {
        ctrl?.abort();
      } else {
        void tick();
      }
    }

    document.addEventListener('visibilitychange', onVisibility);
    void tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      ctrl?.abort();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const summary = live === null ? null : summarize(live);
  const summaryText =
    summary === null
      ? strings.summaryChecking
      : summary === 'allUp'
        ? strings.summaryAllUp
        : summary === 'someDown'
          ? strings.summaryDown
          : summary === 'partial'
            ? strings.summaryPartial
            : strings.summaryUnknown;
  const pct = new Intl.NumberFormat(LOCALE_TAG[locale], { maximumFractionDigits: 1 });

  return (
    <div>
      <p
        aria-live="polite"
        style={{
          fontFamily: 'var(--sans)',
          fontSize: 'var(--fs-18)',
          fontWeight: 500,
          letterSpacing: 0,
          color: 'var(--n-100)',
          marginBottom: '1.25rem',
        }}
      >
        {summaryText}
      </p>
      <noscript>
        <p style={{ fontSize: 'var(--fs-14)', color: 'var(--n-60)', marginBottom: '1rem' }}>{strings.noscript}</p>
      </noscript>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          border: '1px solid rgba(162,167,176,.22)',
          borderRadius: '2px',
        }}
      >
        {rows.map((row, i) => {
          const entry = live?.get(row.id);
          const status: LiveStatus = live === null ? 'unknown' : (entry?.status ?? 'unknown');
          const statusText = live === null ? strings.checking : strings[status];
          const uptime = showUptime && entry?.uptime != null
            ? strings.uptimeTemplate
                .replace('{pct}', pct.format(entry.uptime))
                .replace('{days}', String(windowDays))
            : null;
          return (
            <li
              key={row.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
                padding: '1rem 1.25rem',
                borderTop: i === 0 ? 'none' : '1px solid rgba(162,167,176,.22)',
              }}
            >
              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--sans)',
                    fontSize: 'var(--fs-16)',
                    fontWeight: 500,
                    letterSpacing: 0,
                    color: 'var(--n-100)',
                  }}
                >
                  {row.label}
                </div>
                <div style={{ fontSize: 'var(--fs-14)', color: 'var(--n-60)', lineHeight: 1.5 }}>{row.desc}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}>
                  <StatusDot status={live === null ? 'unknown' : DOT[status]} />
                  <span style={{ ...mono, fontSize: 'var(--fs-12)', color: 'var(--n-80)' }}>
                    {statusText}
                  </span>
                </span>
                {uptime && (
                  <span style={{ ...mono, textTransform: 'none', letterSpacing: 0, fontSize: 'var(--fs-12)', color: 'var(--n-60)', fontVariantNumeric: 'tabular-nums' }}>{uptime}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
