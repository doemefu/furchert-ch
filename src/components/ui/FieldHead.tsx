// Form head of the «Formular» redesign: a 2px ink rule on top, hairlines
// between fields. The lead field spans both columns on phones, the other
// fields follow in two columns; from 64rem all fields share one line. The
// optional photo slot (4:5) stays an empty raised surface until a photo
// exists. Not used on a page yet (redesign PR 5).
import type { ReactNode } from 'react';
import { Children } from 'react';

export function FieldHead({
  lead,
  photo = false,
  children,
  className,
}: {
  /** First field, usually a FieldRow. Spans the full width on phones. */
  lead: ReactNode;
  /** Show the empty, decorative photo slot before the lead field. */
  photo?: boolean;
  /** The remaining fields (FieldRow), one grid cell each. */
  children?: ReactNode;
  className?: string;
}) {
  const rest = Children.toArray(children);
  return (
    <div
      className={className ? `fh ${className}` : 'fh'}
      style={{ '--fh-n': rest.length } as React.CSSProperties}
    >
      <div className={photo ? 'fh-lead fh-lead-photo' : 'fh-lead'}>
        {photo ? <span className="fh-photo" aria-hidden="true" /> : null}
        {lead}
      </div>
      {rest.map((child, i) => (
        <div className="fh-cell" key={i}>
          {child}
        </div>
      ))}
    </div>
  );
}
