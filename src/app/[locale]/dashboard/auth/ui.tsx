// Presentational primitives for /dashboard/auth, ported from the prototype
// `auth-admin.jsx` (MonoLabel, Pill, MetaCard and the inline button/field
// styles). No hooks and no server-only APIs, so both the Server Components
// and the client panels of this route use them.
import type { CSSProperties, ReactNode } from 'react';
import { StatusDot } from '@/components/ui/StatusDot';

export const BORDER = '1px solid rgba(162,167,176,.22)';

export const cardStyle: CSSProperties = {
  background: 'var(--white)',
  border: BORDER,
  borderRadius: '2px',
};

export function MonoLabel({ children, mt = 0, mb = 0 }: { children: ReactNode; mt?: string | number; mb?: string | number }) {
  return (
    <p
      style={{
        fontFamily: 'var(--mono)',
        fontSize: '.72rem',
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        color: 'var(--n-50)',
        marginTop: mt,
        marginBottom: mb,
      }}
    >
      {children}
    </p>
  );
}

export type PillTone = 'ok' | 'warn' | 'err' | 'info' | 'mute';

const PILL: Record<PillTone, { bg: string; bd: string; fg: string }> = {
  ok: { bg: 'rgba(34,197,94,.1)', bd: 'rgba(34,197,94,.3)', fg: '#15803d' },
  warn: { bg: 'rgba(245,158,11,.1)', bd: 'rgba(245,158,11,.3)', fg: '#a16207' },
  err: { bg: 'rgba(239,68,68,.1)', bd: 'rgba(239,68,68,.3)', fg: '#b91c1c' },
  info: { bg: 'var(--blue-wash)', bd: 'rgba(14,60,166,.2)', fg: 'var(--blue-base)' },
  mute: { bg: 'var(--n-10)', bd: 'rgba(162,167,176,.3)', fg: 'var(--n-60)' },
};

export function Pill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  const p = PILL[tone];
  return (
    <span
      style={{
        fontFamily: 'var(--mono)',
        fontSize: '.62rem',
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        padding: '.15rem .5rem',
        borderRadius: '2px',
        background: p.bg,
        border: `1px solid ${p.bd}`,
        color: p.fg,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

export function MetaCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  tone?: 'ok' | 'warn' | 'unknown';
}) {
  return (
    <div style={{ ...cardStyle, padding: '1rem 1.1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.55rem' }}>
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '.62rem',
            letterSpacing: '.06em',
            textTransform: 'uppercase',
            color: 'var(--n-50)',
          }}
        >
          {label}
        </span>
        {tone && <StatusDot status={tone === 'ok' ? 'online' : tone === 'warn' ? 'wip' : 'unknown'} />}
      </div>
      <div
        style={{
          fontFamily: 'var(--sans)',
          fontSize: '1.5rem',
          fontWeight: 500,
          letterSpacing: '-.02em',
          color: 'var(--n-100)',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: '.65rem', letterSpacing: '.04em', color: 'var(--n-50)', marginTop: '.4rem' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

const btnBase: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '.7rem',
  letterSpacing: '.04em',
  textTransform: 'uppercase',
  borderRadius: '2px',
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '.4rem',
};

export const btnPrimary: CSSProperties = {
  ...btnBase,
  padding: '.55rem .9rem',
  background: 'var(--n-100)',
  color: 'var(--white)',
  border: 'none',
};

export const btnSecondary: CSSProperties = {
  ...btnBase,
  padding: '.5rem .85rem',
  background: 'transparent',
  color: 'var(--n-70)',
  border: '1px solid rgba(162,167,176,.35)',
};

export const btnDanger: CSSProperties = {
  ...btnBase,
  padding: '.5rem .85rem',
  background: 'transparent',
  color: '#b91c1c',
  border: '1px solid rgba(239,68,68,.4)',
};

export const btnSmall: CSSProperties = {
  ...btnBase,
  fontSize: '.62rem',
  padding: '.3rem .55rem',
  background: 'transparent',
  color: 'var(--n-70)',
  border: '1px solid rgba(162,167,176,.35)',
};

export const fieldStyle: CSSProperties = {
  width: '100%',
  padding: '.55rem .75rem',
  border: '1px solid rgba(162,167,176,.35)',
  borderRadius: '2px',
  background: 'var(--white)',
  fontFamily: 'var(--mono)',
  fontSize: '.8rem',
  color: 'var(--n-100)',
};

export const hintStyle: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '.62rem',
  color: 'var(--n-50)',
  marginTop: '.3rem',
};

export const errorTextStyle: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '.68rem',
  color: '#b91c1c',
  marginTop: '.3rem',
};

/** Honest placeholder for a surface auth-service has no API for (never mock data). */
export function UnavailableCard({ title, body }: { title: string; body: ReactNode }) {
  return (
    <div style={{ ...cardStyle, padding: '1.5rem', borderStyle: 'dashed' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.5rem' }}>
        <Pill tone="mute">n/a</Pill>
        <span style={{ fontFamily: 'var(--mono)', fontSize: '.72rem', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--n-80)' }}>
          {title}
        </span>
      </div>
      <p style={{ fontSize: '.85rem', color: 'var(--n-60)', lineHeight: 1.55 }}>{body}</p>
    </div>
  );
}
