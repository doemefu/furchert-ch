// One labelled field of the «Formular» redesign: the field name above its
// value, the way a Rapport or Offerte is laid out. Each row is a one-term
// description list (<dl><dt><dd>), so it is valid on its own and as a cell of
// FieldHead. Not used on a page yet (redesign PR 5).
import type { ReactNode } from 'react';

export function FieldRow({
  label,
  children,
  secondary,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  /** Optional second line under the value. */
  secondary?: ReactNode;
  className?: string;
}) {
  return (
    <dl className={className ? `fr ${className}` : 'fr'}>
      <dt className="fr-lab">{label}</dt>
      <dd className="fr-val">{children}</dd>
      {secondary ? <dd className="fr-sub">{secondary}</dd> : null}
    </dl>
  );
}
