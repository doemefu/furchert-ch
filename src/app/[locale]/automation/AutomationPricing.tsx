// Process and prices (src/data/automation-packages.ts): the four steps a
// customer goes through, each with its price, inclusions and exclusions, then
// the team workshop as an add-on and the price footnote (VAT status, quote,
// licences, capacity). Server component. Built from the prototype's process
// step cells (mono "0n" numeral, title, blue mono sub-line) and the check rows
// of the data protection block.
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { Icon } from '@/components/ui/Icon';
import { PRICE_ADDON, PRICE_STEPS, type PackageCopy } from '@/data/automation-packages';
import {
  HAIRLINE,
  bodyText,
  cardTitle,
  footnoteStyle,
  h2Style,
  labelMono,
  leadStyle,
  sectionStyle,
} from './sectionStyles';

const subLine = {
  fontFamily: 'var(--mono)',
  fontSize: '.72rem',
  letterSpacing: '.04em',
  textTransform: 'uppercase' as const,
  color: 'var(--blue-base)',
};

function PriceLine({ c }: { c: PackageCopy }) {
  return (
    <>
      <p style={{ ...cardTitle, color: 'var(--blue-base)', marginTop: '.35rem' }}>{c.price}</p>
      {c.priceNote && (
        <p style={{ fontSize: '.875rem', color: 'var(--n-70)', marginTop: '.25rem' }}>
          {c.priceNote}
        </p>
      )}
    </>
  );
}

function Summary({ c }: { c: PackageCopy }) {
  return <p style={{ ...bodyText, color: 'var(--n-60)', margin: '1rem 0' }}>{c.summary}</p>;
}

// Inclusions (check rows), credit and exclusions.
function Details({ c }: { c: PackageCopy }) {
  return (
    <>
      {c.includes.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {c.includes.map((item) => (
            <li
              key={item}
              style={{
                display: 'flex',
                gap: '.6rem',
                alignItems: 'flex-start',
                padding: '.45rem 0',
                borderTop: '1px solid rgba(162,167,176,.12)',
                fontSize: '.875rem',
                color: 'var(--n-70)',
                lineHeight: 1.5,
              }}
            >
              <span style={{ color: 'var(--blue-base)', flexShrink: 0, marginTop: '.2rem' }}>
                <Icon name="check" size={14} />
              </span>
              {item}
            </li>
          ))}
        </ul>
      )}
      {c.credit && (
        <p style={{ fontSize: '.875rem', color: 'var(--n-80)', lineHeight: 1.5, marginTop: '1rem' }}>
          {c.credit}
        </p>
      )}
      {c.excludes && (
        <p style={{ fontSize: '.8125rem', color: 'var(--n-60)', lineHeight: 1.5, marginTop: '.75rem' }}>
          {c.excludes}
        </p>
      )}
    </>
  );
}

export async function AutomationPricing({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'pages.automation' });
  const addon = PRICE_ADDON.i18n[locale];

  return (
    <section aria-labelledby="prices-heading" style={sectionStyle}>
      <p style={labelMono}>{t('processLabel')}</p>
      <h2 id="prices-heading" style={h2Style}>
        {t('processHeading')}
      </h2>
      <p style={leadStyle}>{t('processLead')}</p>
      <ol
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'grid',
          // Up to four columns; two on tablets, one on phones.
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, max(15rem, 22%)), 1fr))',
        }}
      >
        {PRICE_STEPS.map((step, i) => {
          const c = step.i18n[locale];
          return (
            <li key={step.id} style={{ padding: '2rem', borderRight: HAIRLINE }}>
              <div
                aria-hidden="true"
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '2rem',
                  fontWeight: 400,
                  letterSpacing: '-.02em',
                  color: 'var(--n-20)',
                  lineHeight: 1,
                  marginBottom: '1rem',
                }}
              >
                0{i + 1}
              </div>
              {c.optional && <p style={{ ...subLine, marginBottom: '.35rem' }}>{c.optional}</p>}
              <h3 style={cardTitle}>{c.name}</h3>
              <PriceLine c={c} />
              <Summary c={c} />
              <Details c={c} />
            </li>
          );
        })}
      </ol>
      <div
        style={{
          marginTop: '2rem',
          padding: '2rem',
          border: HAIRLINE,
          borderRadius: '2px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
          gap: '0 2rem',
        }}
      >
        <div>
          <p style={{ ...subLine, marginBottom: '.35rem' }}>{t('addonLabel')}</p>
          <h3 style={cardTitle}>{addon.name}</h3>
          <PriceLine c={addon} />
          <Summary c={addon} />
        </div>
        <div>
          <Details c={addon} />
        </div>
      </div>
      <p style={footnoteStyle}>{t('priceFootnote')}</p>
    </section>
  );
}
