// Form head of the «Formular» redesign: a 2px ink rule on top, hairlines
// between fields. One name-value set is one list, so this renders a single
// <dl> whose groups are FieldRow divs. The lead field spans both columns on
// phones, the other fields follow in two columns; from 64rem all fields share
// one line, plus the optional desktop-only `aside` field. The optional photo
// slot (4:5) stays an empty raised surface until a photo exists. Not used on
// a page yet (redesign PR 5).
import type { CSSProperties, ReactElement } from 'react';
import { Children, cloneElement } from 'react';
import type { FieldRowProps } from './FieldRow';

type Field = ReactElement<FieldRowProps>;
type Child = Field | false | null | undefined;

export function FieldHead({
  lead,
  photo = false,
  aside,
  children,
  className,
}: {
  /** First field, a FieldRow. Spans the full width on phones. */
  lead: Field;
  /** Show the empty, decorative photo slot left of the lead field. */
  photo?: boolean;
  /** Extra field shown last, from 64rem only (e.g. «Antwort»). */
  aside?: Field;
  /** The remaining fields: FieldRow elements passed directly, not wrapped in a Fragment. Falsy values are dropped. */
  children?: Child | Array<Child | Child[]>;
  className?: string;
}) {
  const rest = Children.toArray(children);
  const n = rest.length + (aside ? 1 : 0);
  const cls = ['fh', aside ? 'fh-has-aside' : '', n === 0 ? 'fh-solo' : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <dl className={cls} style={n > 0 ? ({ '--fh-n': n } as CSSProperties) : undefined}>
      {cloneElement(lead, { photo: photo || lead.props.photo, className: ['fh-lead', lead.props.className].filter(Boolean).join(' ') })}
      {rest}
      {aside
        ? cloneElement(aside, { className: ['fh-desk', aside.props.className].filter(Boolean).join(' ') })
        : null}
    </dl>
  );
}
