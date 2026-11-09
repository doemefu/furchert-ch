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
  // `submit` is needed for real forms (e.g. the contact form); the prototype
  // relied on a button's default in-form submit. Default stays `button` so
  // existing call sites are unchanged.
  type?: 'button' | 'submit';
  disabled?: boolean;
  /** Analytics click id, rendered as `data-track` (`trackAttr(kind, id)`; spec 100 §3.6). */
  track?: string;
  children: ReactNode;
}

export function Btn({
  onClick,
  href,
  dark,
  outline,
  small,
  type = 'button',
  disabled,
  track,
  children,
}: BtnProps) {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '.5rem',
    fontFamily: 'var(--mono)',
    fontSize: small ? 'var(--fs-12)' : 'var(--fs-13)',
    fontWeight: 400,
    letterSpacing: small ? '.05em' : '.04em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    borderRadius: '2px',
    cursor: 'pointer',
    padding: small ? '0 1rem' : '0 1.5rem',
    minHeight: small ? 36 : 48,
    whiteSpace: 'nowrap',
    transition: 'background-color .15s, color .15s, border-color .15s',
    border: dark
      ? '1px solid var(--n-90)'
      : outline
        ? '1px solid var(--blue-base)'
        : '1px solid rgba(162,167,176,.35)',
    background: dark ? 'var(--n-90)' : 'transparent',
    color: dark ? 'var(--white)' : outline ? 'var(--blue-base)' : 'var(--n-100)',
  };

  const variant = dark ? 'dark' : outline ? 'outline' : 'default'; // hover styles in globals.css (#151)

  if (href) {
    const external = /^(https?:|mailto:|tel:)/.test(href);
    if (external) {
      // `rel` only applies to the new-tab (`http`) case; mailto/tel open in
      // the same context where it has no effect.
      const newTab = href.startsWith('http');
      return (
        <a
          href={href}
          className="btn"
          data-variant={variant}
          data-track={track}
          style={base}
          target={newTab ? '_blank' : undefined}
          rel={newTab ? 'noopener noreferrer' : undefined}
        >
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className="btn" data-variant={variant} data-track={track} style={base}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className="btn"
      data-variant={variant}
      data-track={track}
      onClick={onClick}
      disabled={disabled}
      style={{ ...base, ...(disabled ? { opacity: 0.6, cursor: 'not-allowed' } : null) }}
    >
      {children}
    </button>
  );
}
