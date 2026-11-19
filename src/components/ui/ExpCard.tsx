// Experience row used on /it and /rowing (redesign PR 11a): a ruled row with
// a heading-width title, the organisation and period as a quiet label, running
// text in --text-2 and the tags. Styles live in globals.css (`.xc*`).
import { Tag } from './Tag';

export interface ExpCardProps {
  title: string;
  org: string;
  since?: string | null;
  text?: string;
  items?: string[];
  learning?: string;
  tags?: string[];
}

export function ExpCard({ title, org, since, text, items, learning, tags }: ExpCardProps) {
  return (
    <article className="xc">
      <h2 className="xc-title">{title}</h2>
      <p className="xc-org">
        {org}
        {since && <span>{since}</span>}
      </p>
      {text && <p className="xc-text">{text}</p>}
      {items && (
        <ul className="xc-list">
          {items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      )}
      {learning && <blockquote className="xc-quote">{learning}</blockquote>}
      {tags && (
        <div className="pg-tags">
          {tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
      )}
    </article>
  );
}
