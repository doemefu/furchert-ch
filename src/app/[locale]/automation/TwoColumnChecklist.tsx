// Two-column checklist section of /automation ("So arbeite ich", "Ihre
// Daten"): label, heading, lead, an optional raised column of dash rows and a
// tinted column of check rows, then an optional footnote. Extracted from the
// page's former data protection block (same borders, backgrounds and rows);
// `left` is optional so a section can show the tinted column alone. Server
// component; copy comes in as props. `CheckRow` is reused by "Wer ich bin".
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { HAIRLINE, footnoteStyle, h2Style, sectionLabel, leadStyle, sectionStyle } from './sectionStyles';

const columnTitle = {
  fontSize: 'var(--text-14)',
  fontWeight: 400,
  lineHeight: 1.4,
  color: 'var(--text-2)',
  marginBottom: '1rem',
};

const rowList = { listStyle: 'none', padding: 0, margin: 0 };

// Check row (the former "So gehe ich vor" rows).
export function CheckRow({ children }: { children: ReactNode }) {
  return (
    <li
      style={{
        display: 'flex',
        gap: '.75rem',
        alignItems: 'flex-start',
        padding: '.5rem 0',
        borderTop: '1px solid var(--hairline-strong)',
        fontSize: 'var(--text-16)',
        lineHeight: 1.45,
        color: 'var(--text-2)',
      }}
    >
      <span style={{ color: 'var(--accent-ink)', flexShrink: 0, marginTop: '3px' }}>
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
      <p style={sectionLabel}>{label}</p>
      <h2 id={headingId} style={h2Style}>
        {heading}
      </h2>
      <p style={leadStyle}>{lead}</p>
      <div
        className="cell-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
          gap: '0',
          borderTop: HAIRLINE,
          borderBottom: HAIRLINE,
        }}
      >
        {left && (
          <div className="cell" style={{ paddingBlock: 'clamp(1rem, 4vw, 1.5rem)', background: 'var(--surface-raised)', borderRight: HAIRLINE }}>
            <h3 style={columnTitle}>{left.title}</h3>
            <ul role="list" style={rowList}>
              {left.items.map((item) => (
                <li
                  key={item}
                  style={{
                    display: 'flex',
                    gap: '.75rem',
                    alignItems: 'flex-start',
                    padding: '.5rem 0',
                    borderTop: '1px solid var(--hairline-strong)',
                    fontSize: 'var(--text-16)',
                    lineHeight: 1.45,
                    color: 'var(--text-2)',
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
                    <span style={{ display: 'block', width: 10, height: 1, background: 'var(--text-3)' }} />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="cell" style={{ paddingBlock: 'clamp(1rem, 4vw, 1.5rem)', background: 'var(--accent-wash)' }}>
          <h3 style={columnTitle}>{right.title}</h3>
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
