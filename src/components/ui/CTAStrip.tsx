// Ported verbatim from the prototype (shared.jsx CTAStrip).
// Text is passed in by the (server) page so this stays a plain presentational
// component reusable from any tree. Optional (#145): `primary`, an internal
// link shown first in the row, and `examples`, a text link under `togsub`.
// Without them the strip renders as in the prototype.
import { Link } from '@/i18n/navigation';
import { Icon } from './Icon';
import { ContactEmail } from './ContactEmail';

interface StripLink {
  href: string;
  label: string;
}

export function CTAStrip({
  together,
  togsub,
  primary,
  examples,
}: {
  together: string;
  togsub: string;
  primary?: StripLink;
  examples?: StripLink;
}) {
  const linkStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '.5rem',
    fontFamily: 'var(--mono)',
    fontSize: '.8125rem',
    letterSpacing: '.02em',
    textTransform: 'uppercase' as const,
    textDecoration: 'none',
    border: '1px solid rgba(255,255,255,.25)',
    borderRadius: '2px',
    padding: '.875rem 1.375rem',
    color: 'var(--white)',
    transition: 'background .15s, border-color .15s',
  };
  return (
    <div style={{ background: 'var(--n-90)', padding: '3rem 0' }}>
      <div
        className="container border-x"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
        }}
      >
        <div>
          <h3
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 'clamp(1.4rem, 2.5vw, 2.25rem)',
              fontWeight: 500,
              letterSpacing: '-.03em',
              color: 'var(--white)',
            }}
          >
            {together}
          </h3>
          <p style={{ color: 'var(--n-40)', marginTop: '.5rem', fontSize: '1rem' }}>{togsub}</p>
          {examples && (
            <Link
              href={examples.href}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                minHeight: 44,
                fontFamily: 'var(--mono)',
                fontSize: '.75rem',
                letterSpacing: '.04em',
                textTransform: 'uppercase',
                color: 'var(--white)',
                textDecoration: 'underline',
                textUnderlineOffset: '.25em',
              }}
            >
              {examples.label}
            </Link>
          )}
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {primary && (
            <Link href={primary.href} style={linkStyle}>
              {primary.label} <Icon name="arrow" size={12} />
            </Link>
          )}
          {/* The address is rendered only in the browser (#147). */}
          <ContactEmail style={linkStyle}>
            {' '}
            <Icon name="arrow" size={12} />
          </ContactEmail>
          <a
            href="https://github.com/doemefu"
            target="_blank"
            rel="noopener noreferrer"
            style={linkStyle}
          >
            <Icon name="github" size={14} /> github/doemefu
          </a>
        </div>
      </div>
    </div>
  );
}
