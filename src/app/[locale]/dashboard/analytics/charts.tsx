// Inline-SVG/div charts for /dashboard/analytics (spec 100 §9.1; dataviz
// skill). Server-rendered: each mark carries a native <title> tooltip and
// every chart has a table view, so no value depends on hovering. One accent
// (--blue-base) plus one context grey (--n-50); validated with the dataviz
// palette checker (CVD ΔE 23.7, contrast ≥ 3:1). No dual axis, no chart
// library, text only (values never become markup).
import type { ReactNode } from 'react';
import type { Bucket } from '@/lib/analytics/stats';
import { cardStyle, monoLabel, noteStyle, numTd, tdStyle, thStyle, type Formatters, type Translate } from './ui';

const ACCENT = 'var(--blue-base)';
const CONTEXT = 'var(--n-50)';

/**
 * Emphasis column chart: the context series as full-width grey columns, the
 * subject series as a narrower accent column inside them (white gap between,
 * L6). Partial first/last buckets are drawn lighter and marked (L5).
 */
export function EmphasisColumns({
  title,
  buckets,
  context,
  subject,
  labels,
  t,
  fmt,
}: {
  title: string;
  buckets: Bucket[];
  context: string;
  subject: string;
  labels: { context: string; subject: string; start: string; partial: string };
  t: Translate;
  fmt: Formatters;
}) {
  const max = buckets.reduce((m, b) => Math.max(m, b.values[context] ?? 0, b.values[subject] ?? 0), 0);
  const w = 12;
  const h = 96;
  const hasPartial = buckets.some((b) => b.partial);
  return (
    <figure style={cardStyle}>
      <figcaption style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '.75rem' }}>
        <span style={{ ...monoLabel }}>{title}</span>
        <Legend color={CONTEXT} text={labels.context} />
        <Legend color={ACCENT} text={labels.subject} />
      </figcaption>
      <svg role="img" aria-label={title} viewBox={`0 0 ${Math.max(buckets.length, 1) * w} ${h}`} preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: h }}>
        {buckets.map((b, i) => {
          const cv = b.values[context] ?? 0;
          const sv = b.values[subject] ?? 0;
          const ch = max > 0 ? Math.max((cv / max) * h, cv > 0 ? 1 : 0) : 0;
          const sh = max > 0 ? Math.max((sv / max) * h, sv > 0 ? 1 : 0) : 0;
          const op = b.partial ? 0.45 : 1;
          return (
            <g key={b.start} opacity={op}>
              <title>{`${fmt.day(b.start)}${b.partial ? ` (${labels.partial})` : ''}: ${labels.context} ${fmt.num(cv)}, ${labels.subject} ${fmt.num(sv)}`}</title>
              <rect x={i * w + 1} y={h - ch} width={w - 2} height={ch} fill={CONTEXT} />
              <rect x={i * w + 3} y={h - sh} width={w - 6} height={sh} fill={ACCENT} stroke="var(--white)" strokeWidth={1} />
            </g>
          );
        })}
      </svg>
      {buckets.length > 0 && (
        <div style={{ ...noteStyle, display: 'flex', justifyContent: 'space-between', marginTop: '.35rem' }}>
          <span>{fmt.day(buckets[0].start)}</span>
          <span>{fmt.day(buckets[buckets.length - 1].start)}</span>
        </div>
      )}
      {hasPartial && <p style={{ ...noteStyle, marginTop: '.35rem' }}>{labels.partial}</p>}
      <TableView
        summary={t('table')}
        caption={title}
        head={[labels.start, labels.context, labels.subject]}
        rows={buckets.map((b) => [`${fmt.day(b.start)}${b.partial ? ' *' : ''}`, fmt.num(b.values[context] ?? 0), fmt.num(b.values[subject] ?? 0)])}
      />
    </figure>
  );
}

function Legend({ color, text }: { color: string; text: string }) {
  return (
    <span style={{ ...noteStyle, display: 'inline-flex', alignItems: 'center', gap: '.35rem' }}>
      {/* #191: a 12×2 line key, as on /dashboard/network. */}
      <span aria-hidden="true" style={{ width: 12, height: 2, background: color, display: 'inline-block' }} />
      {text}
    </span>
  );
}

/** Table view of a chart: a native disclosure with a caption (L6). */
export function TableView({ summary, caption, head, rows }: { summary: string; caption: string; head: string[]; rows: string[][] }) {
  return (
    <details style={{ marginTop: '.5rem' }}>
      <summary style={{ ...noteStyle, cursor: 'pointer' }}>{summary}</summary>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '.35rem' }}>
        <caption style={{ ...noteStyle, textAlign: 'left' }}>{caption}</caption>
        <thead>
          <tr>
            {head.map((x, i) => (
              <th key={x} scope="col" style={{ ...thStyle, textAlign: i === 0 ? 'left' : 'right' }}>
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.join('|')}>
              {r.map((c, i) => (
                <td key={i} style={i === 0 ? tdStyle : numTd}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export interface RankedRow {
  key: string;
  label: ReactNode;
  value: number;
  note?: string;
  /** A fixed-category value below 3: shown as "< 3", no bar length (§8.6, WA-4b H1). */
  small?: boolean;
}

/** Ranked horizontal bars, one hue, largest first (dataviz part-to-whole). */
export function RankedBars({
  title,
  rows,
  fmt,
  emptyText,
  badge,
  small,
}: {
  title: string;
  rows: RankedRow[];
  fmt: Formatters;
  emptyText: string;
  badge?: { index: number | null; text: string };
  /** Texts for a small cell: shown and announced (L9). */
  small?: { shown: string; spoken: string };
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.small ? 0 : r.value), 0);
  return (
    <div style={cardStyle}>
      <p style={{ ...monoLabel, marginBottom: '.75rem' }}>{title}</p>
      {rows.length === 0 ? (
        <p style={noteStyle}>{emptyText}</p>
      ) : (
        <ul style={{ listStyle: 'none', display: 'grid', gap: '.5rem' }}>
          {rows.map((r, i) => {
            const pct = max > 0 && !r.small ? (r.value / max) * 100 : 0;
            return (
              <li key={r.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', fontFamily: 'var(--mono)', fontSize: 'var(--fs-12)', color: 'var(--n-70)', marginBottom: '.2rem' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.label}
                    {badge && badge.index === i && <span style={{ marginLeft: '.4rem', color: 'var(--n-90)' }}>· {badge.text}</span>}
                  </span>
                  <span style={{ color: 'var(--n-60)', flexShrink: 0 }}>
                    {r.small && small ? <span aria-label={small.spoken}>{small.shown}</span> : fmt.num(r.value)}
                    {r.note ? ` · ${r.note}` : ''}
                  </span>
                </div>
                <div aria-hidden="true" style={{ height: 4, background: 'var(--n-20)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: ACCENT, borderRadius: '2px' }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * Two counts per bucket on one axis, side by side (WA-4b coverage, L3): the
 * subject series in the accent, the reference series in grey, never drawn
 * as a subset of each other. Buckets follow §8.6 (bucketSeries). Sampled
 * buckets are marked in the tooltip and the table; partial buckets are faded
 * and starred like the section 1 chart.
 */
export function SideBySideColumns({
  title,
  days,
  labels,
  t,
  fmt,
}: {
  title: string;
  days: { day: string; subject: number; reference: number; sampled: boolean; partial?: boolean }[];
  labels: { subject: string; reference: string; start: string; sampled: string; partial: string };
  t: Translate;
  fmt: Formatters;
}) {
  const max = days.reduce((m, d) => Math.max(m, d.subject, d.reference), 0);
  const hasPartial = days.some((d) => d.partial);
  const w = 12;
  const h = 96;
  const col = (v: number) => (max > 0 ? Math.max((v / max) * h, v > 0 ? 1 : 0) : 0);
  return (
    <figure style={cardStyle}>
      <figcaption style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '.75rem' }}>
        <span style={{ ...monoLabel }}>{title}</span>
        <Legend color={ACCENT} text={labels.subject} />
        <Legend color={CONTEXT} text={labels.reference} />
      </figcaption>
      <svg role="img" aria-label={title} viewBox={`0 0 ${Math.max(days.length, 1) * w} ${h}`} preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: h }}>
        {days.map((d, i) => (
          <g key={d.day} opacity={d.partial ? 0.45 : 1}>
            <title>{`${fmt.day(d.day)}${d.partial ? ` (${labels.partial})` : ''}${d.sampled ? ` (${labels.sampled})` : ''}: ${labels.subject} ${fmt.num(d.subject)}, ${labels.reference} ${fmt.num(d.reference)}`}</title>
            <rect x={i * w + 1} y={h - col(d.subject)} width={(w - 3) / 2} height={col(d.subject)} fill={ACCENT} />
            <rect x={i * w + 1 + (w - 3) / 2 + 1} y={h - col(d.reference)} width={(w - 3) / 2} height={col(d.reference)} fill={CONTEXT} opacity={d.sampled ? 0.5 : 1} />
          </g>
        ))}
      </svg>
      {days.length > 0 && (
        <div style={{ ...noteStyle, display: 'flex', justifyContent: 'space-between', marginTop: '.35rem' }}>
          <span>{fmt.day(days[0].day)}</span>
          <span>{fmt.day(days[days.length - 1].day)}</span>
        </div>
      )}
      {hasPartial && <p style={{ ...noteStyle, marginTop: '.35rem' }}>{labels.partial}</p>}
      <TableView
        summary={t('table')}
        caption={title}
        head={[labels.start, labels.subject, labels.reference]}
        rows={days.map((d) => [`${fmt.day(d.day)}${d.partial ? ' *' : ''}`, fmt.num(d.subject), `${d.sampled ? '≈ ' : ''}${fmt.num(d.reference)}`])}
      />
    </figure>
  );
}
