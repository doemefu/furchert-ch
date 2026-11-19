// One labelled field of the «Formular» redesign: the field name above its
// value, the way a Rapport or Offerte is laid out. A set of name-value pairs
// is one description list, so the fields of a group live in one <dl> (screen
// readers announce one list instead of one list per field): FieldHead renders
// that <dl> itself, anything else wraps its rows in FieldList. A FieldRow
// outside a <dl> is invalid HTML. Used by the home hero form head (redesign PR 9), the home example sheet (PR 7) and the /automation WowTiles (PR 7b).
import type { CSSProperties, ReactNode } from 'react';

export interface FieldRowProps {
  label: ReactNode;
  children: ReactNode;
  /** Optional second line under the value. */
  secondary?: ReactNode;
  /** Optional small line before the value (14px, `--text-2`), e.g. «Von: R. Brunner». meta is not combined with photo. */
  meta?: ReactNode;
  /** `text`: the value is running text (16px, weight 400, may hold a table or list), not a short field value. */
  variant?: 'text';
  /** Empty, decorative photo slot (4:5) left of the field; FieldHead sets it for its lead field. */
  photo?: boolean;
  /** Portrait file for the photo slot (4:5, pre-sized: 128 x 160 or 256 x 320). Without it the slot stays empty; with it the slot is shown even without `photo`. */
  photoSrc?: string;
  /** Alt text of the portrait (the owner's name). The slot stays aria-hidden, so screen readers do not hear it twice. */
  photoAlt?: string;
  className?: string;
  /** Inline style, only for a per-row custom property such as the /automation tile step delay. */
  style?: CSSProperties;
}

export function FieldRow({ label, children, secondary, meta, variant, photo = false, photoSrc, photoAlt = '', className, style }: FieldRowProps) {
  const hasPhoto = photo || Boolean(photoSrc);
  const cls = ['fr', variant === 'text' ? 'fr-text' : '', hasPhoto ? 'fr-photo' : '', className ?? ''].filter(Boolean).join(' ');
  return (
    <div className={cls} style={style}>
      <dt className="fr-lab">{label}</dt>
      {meta ? <dd className="fr-meta">{meta}</dd> : null}
      <dd className="fr-val">{children}</dd>
      {secondary ? <dd className="fr-sub">{secondary}</dd> : null}
      {hasPhoto ? (
        <dd className="fh-photo" aria-hidden="true">
          {photoSrc ? (
            // Plain <img>: a pre-sized static file, and the pod has no optimizer cache (read-only root filesystem).
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoSrc} alt={photoAlt} width={64} height={80} loading="eager" decoding="async" />
          ) : null}
        </dd>
      ) : null}
    </div>
  );
}

/** Wrapper for FieldRow rows outside a FieldHead (one list per name-value set). */
export function FieldList({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={className ? `fl ${className}` : 'fl'}>{children}</dl>;
}
