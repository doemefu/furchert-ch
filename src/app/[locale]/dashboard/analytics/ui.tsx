// Presentation primitives for /dashboard/analytics, copied from the
// /dashboard/network shell on purpose (review L8: copy, don't extract), so the
// network page stays untouched. Server-safe, no hooks.
import type { CSSProperties, ReactNode } from 'react';
import type { AnalyticsFailure } from '@/lib/analytics/read';
import type { Rate } from '@/lib/analytics/stats';

/** Translator for `dashboard.analytics.*` keys, injected so sections render in tests. */
export type Translate = (key: string, values?: Record<string, string | number>) => string;

export interface Formatters {
  num: (n: number) => string;
  pct: (p: number) => string;
  day: (isoDay: string) => string;
  time: (instant: string) => string;
}

export function makeFormatters(locale: string): Formatters {
  const tag = locale === 'de' ? 'de-CH' : 'en-GB';
  const num = new Intl.NumberFormat(tag);
  const pct = new Intl.NumberFormat(tag, { style: 'percent', maximumFractionDigits: 1 });
  const day = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const time = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' });
  return {
    num: (n) => num.format(n),
    pct: (p) => pct.format(p),
    day: (d) => day.format(new Date(`${d}T00:00:00Z`)),
    time: (i) => time.format(new Date(i)),
  };
}

/** §8.6 display of a rate: "x of n", p with a 95 % range, or p. */
export function rateText(r: Rate, t: Translate, fmt: Formatters): string {
  switch (r.kind) {
    case 'none':
      return t('none');
    case 'fraction':
      return t('fraction', { x: fmt.num(r.x), n: fmt.num(r.n) });
    case 'interval':
      return t('interval', { p: fmt.pct(r.p), lo: fmt.pct(r.lo), hi: fmt.pct(r.hi) });
    case 'percent':
      return fmt.pct(r.p);
  }
}

export const monoLabel: CSSProperties = { fontFamily: 'var(--mono)', fontSize: '.72rem', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--n-60)' };
export const cardStyle: CSSProperties = { padding: '1rem', background: 'var(--white)', border: '1px solid rgba(162,167,176,.22)', borderRadius: '2px', minWidth: 0 };
export const noteStyle: CSSProperties = { fontFamily: 'var(--mono)', fontSize: '.68rem', letterSpacing: '.03em', color: 'var(--n-60)' };
export const sectionStyle: CSSProperties = { borderBottom: '1px solid rgba(162,167,176,.22)', padding: '1.5rem 0' };
export const thStyle: CSSProperties = { ...monoLabel, fontSize: '.62rem', textAlign: 'left', fontWeight: 400, padding: '.5rem .75rem', borderBottom: '1px solid rgba(162,167,176,.3)', whiteSpace: 'nowrap' };
export const tdStyle: CSSProperties = { fontFamily: 'var(--mono)', fontSize: '.72rem', color: 'var(--n-80)', padding: '.45rem .75rem', borderBottom: '1px solid rgba(162,167,176,.15)', verticalAlign: 'top' };
export const numTd: CSSProperties = { ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
export const linkStyle: CSSProperties = { color: 'var(--blue-base)', textDecoration: 'none' };
export const chipBase: CSSProperties = {
  fontFamily: 'var(--mono)', fontSize: '.72rem', letterSpacing: '.04em', textTransform: 'uppercase', textDecoration: 'none',
  border: '1px solid rgba(162,167,176,.3)', borderRadius: '2px', padding: '.35rem .75rem', color: 'var(--n-70)', background: 'var(--white)',
};
export const chipActive: CSSProperties = { ...chipBase, background: 'var(--n-90)', borderColor: 'var(--n-90)', color: 'var(--white)' };

export function Section({ id, title, aside, children }: { id: string; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} style={sectionStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <h2 id={id} style={{ ...monoLabel, fontWeight: 400 }}>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Failure({ result, t }: { result: AnalyticsFailure; t: Translate }) {
  const text =
    result.kind === 'disabled' ? t('disabled') : result.kind === 'problem' ? t('problem', { status: result.status, code: result.code }) : result.kind === 'malformed' ? t('malformed') : t('unavailable');
  return <p style={noteStyle}>{text}</p>;
}

// Static server-rendered text: no live region (review N4).
export function Note({ children }: { children: ReactNode }) {
  return <p style={noteStyle}>{children}</p>;
}

export function StatTile({ label, value, sub }: { label: string; value: string; sub?: ReactNode }) {
  return (
    <div style={cardStyle}>
      <p style={{ ...monoLabel, fontSize: '.62rem', marginBottom: '.35rem' }}>{label}</p>
      <p style={{ fontFamily: 'var(--sans)', fontSize: '1.5rem', fontWeight: 500, letterSpacing: '-.03em', color: 'var(--n-100)', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      {sub && <div style={{ ...noteStyle, marginTop: '.35rem' }}>{sub}</div>}
    </div>
  );
}

export function TableWrap({ caption, children }: { caption?: string; children: ReactNode }) {
  return (
    <div style={{ ...cardStyle, padding: 0, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        {caption && <caption style={{ ...noteStyle, textAlign: 'left', padding: '.5rem .75rem' }}>{caption}</caption>}
        {children}
      </table>
    </div>
  );
}
