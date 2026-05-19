// Ported from the prototype (shared.jsx Btn). Navigation uses the locale-aware
// next-intl Link for internal paths; external/mailto use a plain anchor.
import type { CSSProperties, ReactNode } from 'react';
import { Link } from '@/i18n/navigation';

interface BtnProps {
  onClick?: () => void;
  href?: string;
  dark?: boolean;
  outline?: boolean;
  small?: boolean;
  children: ReactNode;
}

export function Btn({ onClick, href, dark, outline, small, children }: BtnProps) {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '.45rem',
    fontFamily: 'var(--mono)',
    fontSize: small ? '.75rem' : '.8125rem',
    fontWeight: 400,
    letterSpacing: '.02em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    borderRadius: '2px',
    cursor: 'pointer',
    padding: small ? '.5rem 1rem' : '.875rem 1.375rem',
    whiteSpace: 'nowrap',
    transition: 'background .15s, color .15s, border-color .15s',
    border: dark
      ? '1px solid var(--n-90)'
      : outline
        ? '1px solid var(--blue-base)'
        : '1px solid rgba(162,167,176,.35)',
    background: dark ? 'var(--n-90)' : 'transparent',
    color: dark ? 'var(--white)' : outline ? 'var(--blue-base)' : 'var(--n-100)',
  };

  if (href) {
    const external = /^(https?:|mailto:|tel:)/.test(href);
    if (external) {
      return (
        <a
          href={href}
          style={base}
          target={href.startsWith('http') ? '_blank' : undefined}
          rel="noopener"
        >
          {children}
        </a>
      );
    }
    return (
      <Link href={href} style={base}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} style={base}>
      {children}
    </button>
  );
}
