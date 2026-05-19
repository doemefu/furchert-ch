// Ported verbatim from the prototype (shared.jsx ExpCard). Used on /it and /rowing.
import { Icon, type IconName } from './Icon';
import { Tag } from './Tag';

export interface ExpCardProps {
  icon: IconName | string;
  title: string;
  org: string;
  since?: string | null;
  text?: string;
  items?: string[];
  learning?: string;
  tags?: string[];
}

export function ExpCard({ icon, title, org, since, text, items, learning, tags }: ExpCardProps) {
  return (
    <div style={{ borderBottom: '1px solid rgba(162,167,176,.22)', padding: '2.5rem 0' }}>
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            width: '2.25rem',
            height: '2.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(162,167,176,.35)',
            background: 'var(--n-10)',
            flexShrink: 0,
          }}
        >
          <Icon name={icon} size={16} />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: 'var(--sans)',
              fontSize: '1.1rem',
              fontWeight: 500,
              letterSpacing: '-.02em',
              color: 'var(--n-100)',
              lineHeight: 1.2,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '.75rem',
              textTransform: 'uppercase',
              letterSpacing: '.04em',
              color: 'var(--n-50)',
              marginTop: '.2rem',
            }}
          >
            {org}
            {since && ` · ${since}`}
          </div>
        </div>
      </div>
      {text && (
        <p
          style={{
            fontSize: '.9375rem',
            color: 'var(--n-60)',
            lineHeight: 1.55,
            letterSpacing: '-.01em',
            marginBottom: items || learning ? '1rem' : 0,
          }}
        >
          {text}
        </p>
      )}
      {items && (
        <ul
          style={{
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '.4rem',
            marginBottom: '1rem',
          }}
        >
          {items.map((it, i) => (
            <li
              key={i}
              style={{
                display: 'flex',
                gap: '.75rem',
                alignItems: 'flex-start',
                fontSize: '.9rem',
                color: 'var(--n-60)',
              }}
            >
              <span
                style={{
                  marginTop: '.35rem',
                  width: 4,
                  height: 4,
                  background: 'var(--n-40)',
                  flexShrink: 0,
                  borderRadius: '50%',
                }}
              />
              {it}
            </li>
          ))}
        </ul>
      )}
      {learning && (
        <blockquote
          style={{
            borderLeft: '2px solid var(--blue-base)',
            paddingLeft: '1rem',
            margin: '1rem 0',
            color: 'var(--n-70)',
            fontSize: '.9rem',
            fontStyle: 'italic',
            lineHeight: 1.55,
          }}
        >
          {learning}
        </blockquote>
      )}
      {tags && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.375rem', marginTop: '1rem' }}>
          {tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
      )}
    </div>
  );
}
