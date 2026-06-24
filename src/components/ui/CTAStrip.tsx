// Ported verbatim from the prototype (shared.jsx CTAStrip).
// Text is passed in by the (server) page so this stays a plain presentational
// component reusable from any tree.
import { Icon } from './Icon';

export function CTAStrip({ together, togsub }: { together: string; togsub: string }) {
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
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <a href="mailto:dominic@furchert.ch" style={linkStyle}>
            dominic@furchert.ch <Icon name="arrow" size={12} />
          </a>
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
