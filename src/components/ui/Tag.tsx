// Ported verbatim from the prototype (shared.jsx Tag).
// `contrast`: grey text in --n-60 instead of --n-50 (AA for this small text);
// used on /automation only (#145).
import type { ReactNode } from 'react';

export function Tag({
  children,
  blue,
  contrast,
}: {
  children: ReactNode;
  blue?: boolean;
  contrast?: boolean;
}) {
  return (
    <span
      style={{
        fontFamily: 'var(--mono)',
        fontSize: '.6875rem',
        letterSpacing: '.03em',
        textTransform: 'uppercase',
        padding: '.2rem .55rem',
        background: blue ? 'var(--blue-wash)' : 'var(--n-10)',
        border: `1px solid ${blue ? 'rgba(14,60,166,.2)' : 'rgba(162,167,176,.3)'}`,
        borderRadius: '2px',
        color: blue ? 'var(--blue-base)' : contrast ? 'var(--n-60)' : 'var(--n-60)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}
