// Ported verbatim from the prototype (shared.jsx Tag).
import type { ReactNode } from 'react';

export function Tag({ children, blue }: { children: ReactNode; blue?: boolean }) {
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
        color: blue ? 'var(--blue-base)' : 'var(--n-50)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}
