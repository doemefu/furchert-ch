// Section styles shared by the /automation page and its section components.
// Section head: sentence-case label, Archivo h2, short lead; kept in one place
// so all sections match.
import type { CSSProperties } from 'react';

// Hairline of tables, panels and rows (redesign token).
export const HAIRLINE = '1px solid var(--hairline-strong)';

// Section opener (redesign PR 8): `--section-y` of space above a section, a 2px
// ink rule over the label and the title, no hairline below (the next section's
// rule separates). One left edge: the container's.
export const sectionStyle: CSSProperties = {
  paddingTop: 'var(--section-y)',
};

// Small label: sentence case, 14px, `--text-3`, no mono, no uppercase.
export const labelText: CSSProperties = {
  fontSize: 'var(--text-14)',
  color: 'var(--text-3)',
  marginBottom: 'var(--space-2)',
};

// The first element of a section head carries the 2px rule.
export const sectionLabel: CSSProperties = {
  ...labelText,
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

// Card title (h3).
export const cardTitle: CSSProperties = {
  fontSize: 'var(--text-18)',
  fontWeight: 500,
  lineHeight: 1.3,
  color: 'var(--text-1)',
};

// Field label (th, caption of a name-value pair): sentence case, 13px, `--text-3`.
export const fieldLabel: CSSProperties = {
  fontSize: 'var(--text-13)',
  lineHeight: '1rem',
  color: 'var(--text-3)',
};

// Running text.
export const bodyText: CSSProperties = {
  fontSize: 'var(--text-16)',
  color: 'var(--text-2)',
  lineHeight: 1.5,
};

export const footnoteStyle: CSSProperties = {
  marginTop: 'clamp(1rem, 3vw, 1.5rem)',
  fontSize: 'var(--text-14)',
  color: 'var(--text-3)',
  lineHeight: 1.5,
  maxWidth: '68ch',
};
