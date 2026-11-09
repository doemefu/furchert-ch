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
  /** Analytics click id, rendered as `data-track` (spec 100 §3.6). */
  track?: string;
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
    fontSize: 'var(--fs-13)',
    letterSpacing: '.04em',
    textTransform: 'uppercase' as const,
    textDecoration: 'none',
    minHeight: 48,
    borderRadius: '2px',
    padding: '0 1.5rem',
    transition: 'background-color .15s, border-color .15s, opacity var(--dur-fast) var(--ease)',
  };
  const textLinkStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '.5rem',
    minHeight: 44,
    fontFamily: 'var(--mono)',
    fontSize: 'var(--fs-12)',
    color: 'var(--white)',
    textDecoration: 'underline',
    textUnderlineOffset: '.25em',
  };
  // #167: primary is the filled button; the e-mail link is the outline one.
  const primaryStyle = {
    ...linkStyle,
    background: 'var(--white)',
    color: 'var(--n-100)',
    border: '1px solid var(--white)',
  };
  const secondaryStyle = {
    ...linkStyle,
    border: '1px solid rgba(255,255,255,.25)',
    color: 'var(--white)',
  };
  return (
    <div className="on-dark" style={{ background: 'var(--n-90)' }}>
      <div
        className="container border-x"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
          paddingBlock: '3rem',
        }}
      >
        <div>
          <h3
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 'var(--fs-h2)',
              fontWeight: 500,
              letterSpacing: '-.02em',
              color: 'var(--white)',
            }}
          >
            {together}
          </h3>
          <p style={{ color: 'var(--n-40)', marginTop: '.5rem', fontSize: 'var(--fs-16)' }}>{togsub}</p>
          {examples && (
            <Link
              href={examples.href}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                minHeight: 44,
                fontFamily: 'var(--mono)',
                fontSize: 'var(--fs-12)',
                color: 'var(--white)',
                textDecoration: 'underline',
                textUnderlineOffset: '.25em',
              }}
            >
              {examples.label}
            </Link>
          )}
        </div>
        <div className="cta-actions" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {primary && (
            <Link href={primary.href} className="btn cta-primary" style={primaryStyle} data-track={primary.track}>
              {primary.label} <Icon name="arrow" size={12} />
            </Link>
          )}
          {/* The address is rendered only in the browser (#147). */}
          <ContactEmail className="btn" style={secondaryStyle}>
            {' '}
            <Icon name="arrow" size={12} />
          </ContactEmail>
          <a
            href="https://github.com/doemefu"
            target="_blank"
            rel="noopener noreferrer"
            className="cta-text"
            style={textLinkStyle}
          >
            <Icon name="github" size={14} /> github/doemefu
          </a>
        </div>
      </div>
    </div>
  );
}
