// Ported verbatim from the prototype (shared.jsx CTAStrip).
// Text is passed in by the (server) page so this stays a plain presentational
// component reusable from any tree. Optional (#145): `primary`, an internal
// link shown first in the row, and `examples`, a text link under `togsub`.
// Without them the strip renders as in the prototype.
import { Link } from '@/i18n/navigation';
import { Icon } from './Icon';
import { Btn } from './Btn';
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
            <Link href={examples.href} className="text-link text-link-block">
              {examples.label}
            </Link>
          )}
        </div>
        <div className="cta-actions" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {primary && (
            <Btn href={primary.href} variant="inverse" track={primary.track}>
              {primary.label}
            </Btn>
          )}
          {/* The address is rendered only in the browser (#147). */}
          <ContactEmail btn />
          <a
            href="https://github.com/doemefu"
            target="_blank"
            rel="noopener noreferrer"
            className="cta-text text-link text-link-block"
            style={{ gap: '.5rem' }}
          >
            <Icon name="github" size={14} /> github/doemefu
          </a>
        </div>
      </div>
    </div>
  );
}
