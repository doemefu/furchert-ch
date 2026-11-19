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
import { trackAttr } from '@/data/track-ids';

export interface FAQItem {
  /** Analytics id (`faq:<id>`, spec 100 §3.3); counted once per item on open. */
  id: string;
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
          <div key={i} style={{ borderTop: '1px solid var(--hairline-strong)' }}>
            <h3 style={{ margin: 0, font: 'inherit' }}>
            <button
              type="button"
              id={buttonId}
              data-track={trackAttr('faq', faq.id)}
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                minHeight: 'var(--tap)',
                padding: '.75rem 0',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span
                style={{
                  fontSize: 'var(--text-17)',
                  fontWeight: 500,
                  lineHeight: 1.3,
                  color: 'var(--text-1)',
                }}
              >
                {faq.q}
              </span>
              <span
                aria-hidden="true"
                style={{
                  flexShrink: 0,
                  fontSize: 'var(--text-20)',
                  lineHeight: 1,
                  color: 'var(--text-2)',
                }}
              >
                {isOpen ? '×' : '+'}
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
                fontSize: 'var(--text-16)',
                color: 'var(--text-2)',
                lineHeight: 1.5,
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
