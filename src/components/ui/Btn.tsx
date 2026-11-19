// Button (redesign «Formular», PR 2). Looks live in globals.css (`.btn`),
// keyed by `data-variant` and `data-size`. Navigation uses the locale-aware
// next-intl Link for internal paths; external/mailto use a plain anchor.
// No arrows or icons that point somewhere: the label says what happens.
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';

export type BtnVariant = 'primary' | 'secondary' | 'inverse';

interface BtnProps {
  onClick?: () => void;
  href?: string;
  /** primary: ink fill; secondary (default): ink outline; inverse: light fill for the dark band. */
  variant?: BtnVariant;
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
  variant = 'secondary',
  small,
  type = 'button',
  disabled,
  track,
  children,
}: BtnProps) {
  const common = {
    className: 'btn',
    'data-variant': variant,
    'data-size': small ? 'small' : undefined,
    'data-track': track,
  };

  if (href) {
    const external = /^(https?:|mailto:|tel:)/.test(href);
    if (external) {
      // `rel` only applies to the new-tab (`http`) case; mailto/tel open in
      // the same context where it has no effect.
      const newTab = href.startsWith('http');
      return (
        <a
          href={href}
          {...common}
          target={newTab ? '_blank' : undefined}
          rel={newTab ? 'noopener noreferrer' : undefined}
        >
          {children}
        </a>
      );
    }
    return (
      <Link href={href} {...common}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} {...common} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
