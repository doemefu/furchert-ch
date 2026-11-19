// One labelled field of the «Formular» redesign: the field name above its
// value, the way a Rapport or Offerte is laid out. A set of name-value pairs
// is one description list, so the fields of a group live in one <dl> (screen
// readers announce one list instead of one list per field): FieldHead renders
// that <dl> itself, anything else wraps its rows in FieldList. A FieldRow
// outside a <dl> is invalid HTML. Not used on a page yet (redesign PR 5).
import type { ReactNode } from 'react';

export interface FieldRowProps {
  label: ReactNode;
  children: ReactNode;
  /** Optional second line under the value. */
  secondary?: ReactNode;
  /** Empty, decorative photo slot (4:5) left of the field; FieldHead sets it for its lead field. */
  photo?: boolean;
  className?: string;
}

export function FieldRow({ label, children, secondary, photo = false, className }: FieldRowProps) {
  const cls = ['fr', photo ? 'fr-photo' : '', className ?? ''].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      <dt className="fr-lab">{label}</dt>
      <dd className="fr-val">{children}</dd>
      {secondary ? <dd className="fr-sub">{secondary}</dd> : null}
      {photo ? <dd className="fh-photo" aria-hidden="true"></dd> : null}
    </div>
  );
}

/** Wrapper for FieldRow rows outside a FieldHead (one list per name-value set). */
export function FieldList({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={className ? `fl ${className}` : 'fl'}>{children}</dl>;
}
