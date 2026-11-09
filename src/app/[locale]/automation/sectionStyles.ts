// Section styles shared by the /automation page and its section components.
// Values are the page's existing ones (prototype section header: mono label,
// h2, short lead); kept in one place so the new sections match the old.
import type { CSSProperties } from 'react';

export const HAIRLINE = '1px solid rgba(162,167,176,.22)';

// Phone spacing: the clamp() values equal the prototype's from about 800 px
// wide and keep /automation within its screen budget on phones (#145).
export const sectionStyle: CSSProperties = {
  padding: 'clamp(2.5rem, 8vw, 4rem) 0',
  borderBottom: HAIRLINE,
};

// n-60 instead of the prototype's label grey for AA contrast (#145).
export const labelMono: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 'var(--fs-13)',
  letterSpacing: '.04em',
  textTransform: 'uppercase',
  color: 'var(--n-60)',
  marginBottom: '1rem',
};

export const h2Style: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'var(--fs-h2)',
  fontWeight: 500,
  letterSpacing: '-.02em',
  color: 'var(--n-100)',
  marginBottom: '1rem',
};

// Short direct answer under a question heading (GEO: quotable by AI search).
export const leadStyle: CSSProperties = {
  fontSize: 'var(--fs-16)',
  color: 'var(--n-70)',
  lineHeight: 1.55,
  maxWidth: '62ch',
  marginBottom: 'clamp(1.5rem, 5vw, 2.5rem)',
};

// Card title (h3): the prototype's process-step title.
export const cardTitle: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'var(--fs-18)',
  fontWeight: 500,
  letterSpacing: 0,
  color: 'var(--n-100)',
};

// Small mono field label (dt). n-60 instead of the label grey for AA contrast.
export const fieldLabel: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 'var(--fs-12)',
  letterSpacing: '.05em',
  textTransform: 'uppercase',
  color: 'var(--n-60)',
};

export const bodyText: CSSProperties = {
  fontSize: 'var(--fs-15)',
  color: 'var(--n-70)',
  lineHeight: 1.55,
};

export const footnoteStyle: CSSProperties = {
  marginTop: 'clamp(1rem, 3vw, 1.5rem)',
  fontSize: 'var(--fs-14)',
  color: 'var(--n-60)',
  lineHeight: 1.55,
  maxWidth: '68ch',
};

// Standalone mono text link with a 44 px target (tile links, calc link,
// "Mehr über mich").
export const textLink: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '.4rem',
  minHeight: 44,
  fontFamily: 'var(--mono)',
  fontSize: 'var(--fs-12)',
  color: 'var(--blue-base)',
  textDecoration: 'none',
};
