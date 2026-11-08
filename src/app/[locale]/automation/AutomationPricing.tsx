// Process and prices (src/data/automation-packages.ts): the four steps a
// customer goes through (01 to 04), each with its price and, where it has
// two size tiers, the second tier in the same style (`priceAlt`); conditions
// (`terms`) in body size and always visible; inclusions behind a native
// <details>. Then the own automation as "possible later", the price footnote
// and the call to action. Server component. Built from the prototype's
// process step cells (mono "0n" numeral, title) and the check rows of the
// page's two-column blocks.
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { Icon } from '@/components/ui/Icon';
import { Btn } from '@/components/ui/Btn';
import { PRICE_ADDON, PRICE_STEPS, type PackageCopy } from '@/data/automation-packages';
import { contactHref } from '@/data/contact-sources';
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
      <p style={{ ...cardTitle, color: 'var(--blue-base)', fontVariantNumeric: 'tabular-nums', marginTop: '.35rem' }}>{c.price}</p>
      {c.priceAlt && <p style={{ ...cardTitle, color: 'var(--blue-base)', fontVariantNumeric: 'tabular-nums' }}>{c.priceAlt}</p>}
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

function Terms({ c }: { c: PackageCopy }) {
  if (!c.terms?.length) return null;
  return (
    <div style={{ display: 'grid', gap: '.6rem', marginBottom: '1rem' }}>
      {c.terms.map((term) => (
        <p key={term} style={bodyText}>
          {term}
        </p>
      ))}
    </div>
  );
}

// Inclusions (check rows) behind a disclosure, and exclusions.
function Details({ c, includesLabel }: { c: PackageCopy; includesLabel: string }) {
  return (
    <>
      {c.includes.length > 0 && (
        <details>
          <summary
            style={{
              padding: '.75rem 0',
              borderTop: '1px solid rgba(162,167,176,.12)',
              cursor: 'pointer',
              ...subLine,
              fontSize: '.75rem',
            }}
          >
            {includesLabel}
          </summary>
          <ul role="list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
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
        </details>
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
  const includesLabel = t('pricesIncludes');

  return (
    <section id="preise" aria-labelledby="prices-heading" style={sectionStyle}>
      <p style={labelMono}>{t('processLabel')}</p>
      <h2 id="prices-heading" style={h2Style}>
        {t('processHeading')}
      </h2>
      <p style={leadStyle}>{t('processLead')}</p>
      <ol
        role="list"
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
            <li key={step.id} style={{ padding: 'clamp(1.25rem, 5vw, 2rem)', borderRight: HAIRLINE }}>
              <div
                aria-hidden="true"
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '2rem',
                  fontWeight: 400,
                  letterSpacing: '-.02em',
                  color: 'var(--n-20)',
                  lineHeight: 1,
                  marginBottom: 'clamp(.5rem, 2vw, 1rem)',
                }}
              >
                0{i + 1}
              </div>
              <h3 style={cardTitle}>{c.name}</h3>
              <PriceLine c={c} />
              <Summary c={c} />
              <Terms c={c} />
              <Details c={c} includesLabel={includesLabel} />
            </li>
          );
        })}
      </ol>
      <div
        style={{
          marginTop: 'clamp(1.5rem, 4vw, 2rem)',
          padding: 'clamp(1.25rem, 5vw, 2rem)',
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
        {addon.includes.length > 0 && (
          <div>
            <Details c={addon} includesLabel={includesLabel} />
          </div>
        )}
      </div>
      <p style={footnoteStyle}>{t('priceFootnote')}</p>
      <div data-cta="prices" style={{ marginTop: 'clamp(1.5rem, 4vw, 2rem)' }}>
        <Btn href={contactHref('automation-prices')} dark>
          {t('pricesCta')} <Icon name="arrow" size={12} />
        </Btn>
      </div>
    </section>
  );
}
