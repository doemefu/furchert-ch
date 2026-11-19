// Before/after example (src/data/automation-example.ts): a site foreman's
// voice message after Regie work and the draft report made from it, labelled
// as an invented example. Server component. Layout follows the page's
// two-column blocks (two cell panels: --surface-raised for the input,
// --surface-card for the draft). The draft is a FieldList; lines a person must
// check carry a highlighter mark. The first fields are always visible; the
// rest sit behind a native <details>. `children` (the sample calculation) follow the text.
import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { Icon } from '@/components/ui/Icon';
import { Tag } from '@/components/ui/Tag';
import { FieldList, FieldRow } from '@/components/ui/FieldRow';
import { EXAMPLE, type ExampleField } from '@/data/automation-example';
import { HAIRLINE, h2Style, sectionLabel, leadStyle, sectionStyle } from './sectionStyles';

const panelTitle = {
  display: 'flex',
  alignItems: 'center',
  gap: '.5rem',
  fontSize: 'var(--text-14)',
  fontWeight: 400,
  lineHeight: 1.4,
  color: 'var(--text-2)',
  marginBottom: '1rem',
};

// Fields shown before "Alle Felder anzeigen"; the rest are inside <details>.
const VISIBLE_FIELDS = 4;

function Fields({ fields }: { fields: ExampleField[] }) {
  return (
    <FieldList className="ax-sheet">
      {fields.map((field) => (
        <FieldRow key={field.label} variant="text" label={field.label}>
          {field.lines.map((line) => (
            <span key={line.text} className="ax-line">
              {line.text}
              {line.check && <mark className="ax-check">{line.check}</mark>}
            </span>
          ))}
        </FieldRow>
      ))}
    </FieldList>
  );
}

export async function AutomationExample({
  locale,
  children,
}: {
  locale: Locale;
  children?: ReactNode;
}) {
  const t = await getTranslations({ locale, namespace: 'pages.automation' });
  const ex = EXAMPLE.i18n[locale];
  const [quoteOpen, quoteClose] = locale === 'de' ? ['«', '»'] : ['“', '”'];
  const shown = ex.fields.slice(0, VISIBLE_FIELDS);
  const more = ex.fields.slice(VISIBLE_FIELDS);

  return (
    <section id="beispiel" aria-labelledby="example-heading" style={sectionStyle} data-track-section="beispiel">
      <p style={sectionLabel}>{t('exampleLabel')}</p>
      <h2 id="example-heading" style={h2Style}>
        {t('exampleHeading')}
      </h2>
      <p style={leadStyle}>{t('exampleLead')}</p>
      <div style={{ marginBottom: '1rem' }}>
        <Tag blue>{ex.tag}</Tag>
      </div>
      <div
        className="cell-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
          borderTop: HAIRLINE,
          borderBottom: HAIRLINE,
        }}
      >
        <div className="cell" style={{ paddingBlock: 'clamp(1rem, 4vw, 1.5rem)', background: 'var(--surface-raised)', borderRight: HAIRLINE }}>
          <h3 style={panelTitle}>
            <Icon name="mic" size={14} />
            {ex.inputTitle}
          </h3>
          <blockquote
            style={{
              margin: 0,
              fontSize: 'var(--text-16)',
              lineHeight: 1.6,
              color: 'var(--text-1)',
              maxWidth: '60ch',
            }}
          >
            {quoteOpen}
            {ex.input}
            {quoteClose}
          </blockquote>
        </div>
        <div className="cell" style={{ paddingBlock: 'clamp(1rem, 4vw, 1.5rem)', background: 'var(--surface-card)' }}>
          <h3 style={panelTitle}>
            <Icon name="ai" size={14} />
            {ex.outputTitle}
          </h3>
          <Fields fields={shown} />
          {more.length > 0 && (
            <details>
              <summary
                className="ax-sum"
              >
                {t('exampleAllFields')}
              </summary>
              <Fields fields={more} />
            </details>
          )}
        </div>
      </div>
      <p
        style={{
          marginTop: 'clamp(1rem, 3vw, 1.5rem)',
          fontSize: 'var(--text-16)',
          color: 'var(--text-2)',
          lineHeight: 1.5,
          maxWidth: '68ch',
        }}
      >
        {ex.after}
      </p>
      {children}
    </section>
  );
}
