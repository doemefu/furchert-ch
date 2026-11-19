// Section styles shared by the /automation page and its section components.
// Section head: sentence-case label, Archivo h2, short lead; kept in one place
// so all sections match.
import type { CSSProperties } from 'react';

export const HAIRLINE = '1px solid rgba(162,167,176,.22)';

// Section opener (redesign PR 8): `--section-y` of space above a section, a 2px
// ink rule over the label and the title, no hairline below (the next section's
// rule separates). One left edge: the container's.
export const sectionStyle: CSSProperties = {
  paddingTop: 'var(--section-y)',
};

// Eyebrow of a section head: sentence case, 14px, no mono, no uppercase.
export const labelMono: CSSProperties = {
  fontSize: 'var(--text-14)',
  color: 'var(--text-3)',
  marginBottom: 'var(--space-2)',
};

// The first element of a section head carries the 2px rule.
export const sectionLabel: CSSProperties = {
  ...labelMono,
  borderTop: '2px solid var(--rule)',
  paddingTop: 'var(--space-3)',
};

export const h2Style: CSSProperties = {
  fontSize: 'var(--text-h2)',
  fontStretch: 'var(--stretch-heading)',
  fontWeight: 'var(--weight-heading)' as CSSProperties['fontWeight'],
  lineHeight: 1.05,
  letterSpacing: 0,
  color: 'var(--text-1)',
  marginBottom: 'var(--space-4)',
  textWrap: 'balance',
};

// Short direct answer under a question heading (GEO: quotable by AI search).
export const leadStyle: CSSProperties = {
  fontSize: 'var(--text-18)',
  color: 'var(--text-2)',
  lineHeight: 1.5,
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
