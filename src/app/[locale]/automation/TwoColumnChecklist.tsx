// Two-column checklist section of /automation ("So arbeite ich", "Ihre
// Daten"): label, heading, lead, an optional grey column of dash rows and a
// blue column of check rows, then an optional footnote. Extracted from the
// page's former data protection block (same borders, backgrounds and rows);
// `left` is optional so a section can show the blue column alone. Server
// component; copy comes in as props. `CheckRow` is reused by "Wer ich bin".
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { HAIRLINE, footnoteStyle, h2Style, labelMono, leadStyle, sectionStyle } from './sectionStyles';

const columnTitle = {
  fontFamily: 'var(--mono)',
  fontSize: 'var(--fs-12)',
  letterSpacing: '.05em',
  textTransform: 'uppercase' as const,
  marginBottom: '1rem',
};

const rowList = { listStyle: 'none', padding: 0, margin: 0 };

// Blue check row on --blue-wash (the former "So gehe ich vor" rows).
export function CheckRow({ children }: { children: ReactNode }) {
  return (
    <li
      style={{
        display: 'flex',
        gap: '.75rem',
        alignItems: 'flex-start',
        padding: '.5rem 0',
        borderTop: '1px solid rgba(14,60,166,.1)',
        fontSize: 'var(--fs-14)',
        lineHeight: 1.5,
        color: 'var(--n-70)',
      }}
    >
      <span style={{ color: 'var(--blue-base)', flexShrink: 0, marginTop: '2px' }}>
        <Icon name="check" size={16} />
      </span>
      <span>{children}</span>
    </li>
  );
}

export interface ChecklistColumn {
  title: string;
  items: string[];
}

export function TwoColumnChecklist({
  id,
  label,
  heading,
  lead,
  left,
  right,
  footnote,
  trackSection,
}: {
  id: string;
  label: string;
  heading: string;
  lead: string;
  left?: ChecklistColumn;
  right: ChecklistColumn;
  footnote?: string;
  /** Section id for the /automation section-reach measure (spec 100 §3.5, §3.7). */
  trackSection?: string;
}) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} style={sectionStyle} data-track-section={trackSection}>
      <p style={labelMono}>{label}</p>
      <h2 id={headingId} style={h2Style}>
        {heading}
      </h2>
      <p style={leadStyle}>{lead}</p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
          gap: '0',
          border: HAIRLINE,
          borderRadius: '2px',
        }}
      >
        {left && (
          <div style={{ padding: 'clamp(1rem, 4vw, 1.5rem)', background: 'var(--n-10)', borderRight: HAIRLINE }}>
            <h3 style={{ ...columnTitle, fontWeight: 400, color: 'var(--n-60)' }}>{left.title}</h3>
            <ul role="list" style={rowList}>
              {left.items.map((item) => (
                <li
                  key={item}
                  style={{
                    display: 'flex',
                    gap: '.75rem',
                    alignItems: 'flex-start',
                    padding: '.5rem 0',
                    borderTop: '1px solid rgba(162,167,176,.12)',
                    fontSize: 'var(--fs-14)',
                    lineHeight: 1.5,
                    color: 'var(--n-60)',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 16,
                      height: '1.35em',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ display: 'block', width: 10, height: 1, background: 'var(--n-40)' }} />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div style={{ padding: 'clamp(1rem, 4vw, 1.5rem)', background: 'var(--blue-wash)' }}>
          <h3 style={{ ...columnTitle, fontWeight: 400, color: 'var(--blue-base)' }}>{right.title}</h3>
          <ul role="list" style={rowList}>
            {right.items.map((item) => (
              <CheckRow key={item}>{item}</CheckRow>
            ))}
          </ul>
        </div>
      </div>
      {footnote && <p style={footnoteStyle}>{footnote}</p>}
    </section>
  );
}
