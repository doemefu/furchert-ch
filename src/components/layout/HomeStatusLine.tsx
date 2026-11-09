'use client';

// Home status line (#178): one static row on a dark band instead of the old
// ticker. Fetches /api/homelab-status once on mount; until then, and whenever
// there is no usable data, it says so and never claims "all up".
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { StatusLabel, type DotStatus } from '@/components/ui/StatusDot';
import { NODE_HARDWARE } from '@/data/cluster-nodes';
import { LAB_SERVICE_IDS } from '@/data/homelab-lab';
import { countLab, parseLabStatus, type LabSummary } from '@/lib/lab/parseStatus';

type Counts = { summary: LabSummary; up: number; down: number; total: number };

const LED: Record<LabSummary, DotStatus> = {
  allUp: 'online',
  someDown: 'offline',
  partial: 'wip',
  unknown: 'unknown',
};

export function HomeStatusLine() {
  const t = useTranslations('pages.home.status');
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch('/api/homelab-status', { signal: ctrl.signal });
        const json: unknown = res.ok ? await res.json() : null;
        if (!ctrl.signal.aborted) setCounts(countLab(parseLabStatus(json)));
      } catch {
        if (!ctrl.signal.aborted) setCounts(countLab(new Map()));
      }
    })();
    return () => ctrl.abort();
  }, []);

  const values = {
    total: counts?.total ?? LAB_SERVICE_IDS.length,
    up: counts?.up ?? 0,
    down: counts?.down ?? 0,
  };
  const summary: LabSummary | null = counts ? counts.summary : null;
  const text = summary === null ? t('checking') : t(summary, values);
  const led: DotStatus = summary === null ? 'unknown' : LED[summary];

  return (
    <div style={{ borderTop: '1px solid rgba(162,167,176,.22)', background: 'var(--n-100)' }}>
      <div
        className="container"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '.5rem 1.5rem',
          minHeight: '3.25rem',
          padding: '.75rem 0',
        }}
      >
        <span aria-live="polite" aria-atomic="true">
          <StatusLabel status={led} onDark>
            {text}
          </StatusLabel>
        </span>
        <span
          className="home-status-facts"
          style={{ fontFamily: 'var(--mono)', fontSize: 'var(--fs-12)', color: 'var(--n-20)' }}
        >
          {t('facts', { nodes: Object.keys(NODE_HARDWARE).length })}
        </span>
        <Link
          href="/projects/homelab"
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 'var(--fs-12)',
            color: 'var(--white)',
            textDecoration: 'underline',
            textUnderlineOffset: '.2em',
          }}
        >
          {t('link')}
        </Link>
      </div>
    </div>
  );
}
