// Section styles shared by the /automation page and its section components.
// Values are the page's existing ones (prototype section header: mono label,
// h2, short lead); kept in one place so the new sections match the old.
import type { CSSProperties } from 'react';

export const HAIRLINE = '1px solid rgba(162,167,176,.22)';

export const sectionStyle: CSSProperties = {
  padding: '4rem 0',
  borderBottom: HAIRLINE,
};

export const labelMono: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '.8125rem',
  letterSpacing: '.06em',
  textTransform: 'uppercase',
  color: 'var(--n-50)',
  marginBottom: '1rem',
};

export const h2Style: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'clamp(1.5rem,3vw,2.25rem)',
  fontWeight: 500,
  letterSpacing: '-.03em',
  color: 'var(--n-100)',
  marginBottom: '1rem',
};

// Short direct answer under a question heading (GEO: quotable by AI search).
export const leadStyle: CSSProperties = {
  fontSize: '1rem',
  color: 'var(--n-70)',
  lineHeight: 1.55,
  maxWidth: '62ch',
  marginBottom: '2.5rem',
};

// Card title (h3): the prototype's process-step title.
export const cardTitle: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: '1.125rem',
  fontWeight: 500,
  letterSpacing: '-.02em',
  color: 'var(--n-100)',
};

// Small mono field label (dt). n-60 instead of the label grey for AA contrast.
export const fieldLabel: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '.72rem',
  letterSpacing: '.04em',
  textTransform: 'uppercase',
  color: 'var(--n-60)',
};

export const bodyText: CSSProperties = {
  fontSize: '.9375rem',
  color: 'var(--n-70)',
  lineHeight: 1.55,
};

export const footnoteStyle: CSSProperties = {
  marginTop: '1.5rem',
  fontSize: '.875rem',
  color: 'var(--n-60)',
  lineHeight: 1.55,
  maxWidth: '68ch',
};
