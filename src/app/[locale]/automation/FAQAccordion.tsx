'use client';

// Ported from the prototype (pages.jsx PageAutomation FAQ block).
// Open/close uses a single client state; the data is passed in by the
// (server) page so this stays a plain presentational island.
// Accessibility additions vs the prototype (worklog F11):
//   - aria-expanded on each disclosure button
//   - aria-controls / id on the panel
//   - every panel is always in the server-rendered HTML and only hidden
//     with the `hidden` attribute while collapsed, so crawlers and AI
//     search read the answers without running any script
import { useState } from 'react';

export interface FAQItem {
  q: string;
  a: string;
}

export function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div>
      {items.map((faq, i) => {
        const isOpen = openIndex === i;
        const panelId = `faq-panel-${i}`;
        const buttonId = `faq-button-${i}`;
        return (
          <div key={i} style={{ borderTop: '1px solid rgba(162,167,176,.22)' }}>
            <h3 style={{ margin: 0, font: 'inherit' }}>
            <button
              type="button"
              id={buttonId}
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.25rem 0',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--sans)',
                  fontSize: '1rem',
                  fontWeight: 500,
                  letterSpacing: '-.02em',
                  color: 'var(--n-100)',
                }}
              >
                {faq.q}
              </span>
              <span
                aria-hidden="true"
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '.9rem',
                  color: 'var(--n-50)',
                  transition: 'transform .2s',
                  transform: isOpen ? 'rotate(45deg)' : 'none',
                }}
              >
                +
              </span>
            </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              style={{
                paddingBottom: '1.25rem',
                fontSize: '.9375rem',
                color: 'var(--n-60)',
                lineHeight: 1.55,
                maxWidth: '64ch',
              }}
            >
              {faq.a}
            </div>
          </div>
        );
      })}
    </div>
  );
}
