// Before/after example (src/data/automation-example.ts): a site foreman's
// voice message after Regie work and the draft report made from it, labelled
// as an invented example. Server component. Layout follows the page's
// two-column blocks (two bordered panels: n-10 for the input, blue-wash for
// the draft). Lines a person must check carry an amber mark derived from
// --tier-mid. The first fields are always visible; the rest sit behind a
// native <details>. `children` (the sample calculation) follow the text.
import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { Icon } from '@/components/ui/Icon';
import { Tag } from '@/components/ui/Tag';
import { EXAMPLE, type ExampleField } from '@/data/automation-example';
import { HAIRLINE, fieldLabel, h2Style, labelMono, leadStyle, sectionStyle } from './sectionStyles';

const panelTitle = {
  display: 'flex',
  alignItems: 'center',
  gap: '.5rem',
  fontFamily: 'var(--mono)',
  fontSize: '.75rem',
  fontWeight: 400,
  letterSpacing: '.05em',
  textTransform: 'uppercase' as const,
  marginBottom: '1rem',
};

// Fields shown before "Alle Felder anzeigen"; the rest are inside <details>.
const VISIBLE_FIELDS = 4;

function Fields({ fields }: { fields: ExampleField[] }) {
  return (
    <dl style={{ margin: 0 }}>
      {fields.map((field) => (
        <div
          key={field.label}
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(5.5rem, 28%) 1fr',
            gap: '.75rem',
            padding: '.6rem 0',
            borderTop: '1px solid rgba(14,60,166,.1)',
          }}
        >
          <dt style={{ ...fieldLabel, paddingTop: '.2rem' }}>{field.label}</dt>
          <dd style={{ margin: 0, fontSize: '.9rem', color: 'var(--n-80)', lineHeight: 1.5 }}>
            {field.lines.map((line) => (
              <div key={line.text} style={{ marginBottom: '.15rem' }}>
                {line.text}
                {line.check && (
                  <span
                    style={{
                      display: 'block',
                      margin: '.3rem 0 .2rem',
                      padding: '.15rem .5rem',
                      fontSize: '.8125rem',
                      color: 'var(--n-80)',
                      background: 'color-mix(in srgb, var(--tier-mid) 16%, var(--white))',
                      borderLeft: '2px solid var(--tier-mid)',
                    }}
                  >
                    {line.check}
                  </span>
                )}
              </div>
            ))}
          </dd>
        </div>
      ))}
    </dl>
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
      <p style={labelMono}>{t('exampleLabel')}</p>
      <h2 id="example-heading" style={h2Style}>
        {t('exampleHeading')}
      </h2>
      <p style={leadStyle}>{t('exampleLead')}</p>
      <div style={{ marginBottom: '1rem' }}>
        <Tag blue>{ex.tag}</Tag>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
          border: HAIRLINE,
          borderRadius: '2px',
        }}
      >
        <div style={{ padding: 'clamp(1rem, 4vw, 1.5rem)', background: 'var(--n-10)', borderRight: HAIRLINE }}>
          <h3 style={{ ...panelTitle, color: 'var(--n-60)' }}>
            <Icon name="mic" size={14} />
            {ex.inputTitle}
          </h3>
          <blockquote
            style={{
              margin: 0,
              fontSize: 'clamp(.9375rem, 2.5vw, 1rem)',
              lineHeight: 1.65,
              color: 'var(--n-80)',
              maxWidth: '60ch',
            }}
          >
            {quoteOpen}
            {ex.input}
            {quoteClose}
          </blockquote>
        </div>
        <div style={{ padding: 'clamp(1rem, 4vw, 1.5rem)', background: 'var(--blue-wash)' }}>
          <h3 style={{ ...panelTitle, color: 'var(--blue-base)' }}>
            <Icon name="ai" size={14} />
            {ex.outputTitle}
          </h3>
          <Fields fields={shown} />
          {more.length > 0 && (
            <details>
              <summary
                style={{
                  padding: '.75rem 0',
                  borderTop: '1px solid rgba(14,60,166,.1)',
                  cursor: 'pointer',
                  fontFamily: 'var(--mono)',
                  fontSize: '.75rem',
                  letterSpacing: '.04em',
                  textTransform: 'uppercase',
                  color: 'var(--blue-base)',
                }}
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
          fontSize: '.9375rem',
          color: 'var(--n-70)',
          lineHeight: 1.55,
          maxWidth: '68ch',
        }}
      >
        {ex.after}
      </p>
      {children}
    </section>
  );
}
