// Process and prices (src/data/automation-packages.ts): the four steps a
// customer goes through (01 to 04), each with its price and, where it has
// two size tiers, the second tier in the same style (`priceAlt`); conditions
// (`terms`) in body size and always visible; inclusions behind a native
// <details>. Then the own automation as "possible later", the price footnote
// and the call to action. Server component. Built from the prototype's
// process step cells ("0n" numeral, title) and the check rows of the
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
  sectionLabel,
  leadStyle,
  sectionStyle,
} from './sectionStyles';
import { trackAttr } from '@/data/track-ids';

// Small label above the add-on: sentence case, 14px.
const subLine = {
  fontSize: 'var(--text-14)',
  lineHeight: 1.4,
  color: 'var(--text-3)',
};

function PriceLine({ c }: { c: PackageCopy }) {
  return (
    <>
      <p style={{ ...cardTitle, color: 'var(--accent-ink)', fontVariantNumeric: 'tabular-nums', marginTop: '.25rem' }}>{c.price}</p>
      {c.priceAlt && <p style={{ ...cardTitle, color: 'var(--accent-ink)', fontVariantNumeric: 'tabular-nums' }}>{c.priceAlt}</p>}
      {c.priceNote && (
        <p style={{ fontSize: 'var(--text-14)', color: 'var(--text-2)', marginTop: '.25rem' }}>
          {c.priceNote}
        </p>
      )}
    </>
  );
}

function Summary({ c }: { c: PackageCopy }) {
  return <p style={{ ...bodyText, margin: '1rem 0' }}>{c.summary}</p>;
}

function Terms({ c }: { c: PackageCopy }) {
  if (!c.terms?.length) return null;
  return (
    <div style={{ display: 'grid', gap: '.5rem', marginBottom: '1rem' }}>
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
            className="ax-sum"
          >
            {includesLabel}
          </summary>
          <ul role="list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {c.includes.map((item) => (
              <li
                key={item}
                style={{
                  display: 'flex',
                  gap: '.5rem',
                  alignItems: 'flex-start',
                  padding: '.5rem 0',
                  borderTop: '1px solid var(--hairline)',
                  fontSize: 'var(--text-16)',
                  color: 'var(--text-2)',
                  lineHeight: 1.45,
                }}
              >
                <span style={{ color: 'var(--accent-ink)', flexShrink: 0, marginTop: '.25rem' }}>
                  <Icon name="check" size={14} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </details>
      )}
      {c.excludes && (
        <p style={{ fontSize: 'var(--text-14)', color: 'var(--text-3)', lineHeight: 1.5, marginTop: '.75rem' }}>
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
    <section id="preise" aria-labelledby="prices-heading" style={sectionStyle} data-track-section="preise">
      <p style={sectionLabel}>{t('processLabel')}</p>
      <h2 id="prices-heading" style={h2Style}>
        {t('processHeading')}
      </h2>
      <p style={leadStyle}>{t('processLead')}</p>
      <ol
        role="list"
        className="cell-grid"
        style={{
          listStyle: 'none',
          padding: 0,
          // Longhands only: an inline `margin` would cancel .cell-grid's margins.
          marginBlock: 0,
          display: 'grid',
          // Up to four columns; two on tablets, one on phones.
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, max(15rem, 22%)), 1fr))',
        }}
      >
        {PRICE_STEPS.map((step, i) => {
          const c = step.i18n[locale];
          return (
            <li key={step.id} className="cell" style={{ paddingBlock: 'clamp(1.25rem, 5vw, 2rem)', borderRight: HAIRLINE }}>
              <div
                aria-hidden="true"
                style={{
                  fontSize: 'var(--text-h3)',
                  fontWeight: 400,
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--text-3)',
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
        className="cell-grid"
        style={{
          marginTop: 'clamp(1.5rem, 4vw, 2rem)',
          borderTop: HAIRLINE,
          borderBottom: HAIRLINE,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
        }}
      >
        <div className="cell" style={{ paddingBlock: 'clamp(1.25rem, 5vw, 2rem)' }}>
          <p style={{ ...subLine, marginBottom: '.25rem' }}>{t('addonLabel')}</p>
          <h3 style={cardTitle}>{addon.name}</h3>
          <PriceLine c={addon} />
          <Summary c={addon} />
        </div>
        {addon.includes.length > 0 && (
          <div className="cell" style={{ paddingBlock: 'clamp(1.25rem, 5vw, 2rem)' }}>
            <Details c={addon} includesLabel={includesLabel} />
          </div>
        )}
      </div>
      <p style={footnoteStyle}>{t('priceFootnote')}</p>
      <div data-cta="prices" style={{ marginTop: 'clamp(1.5rem, 4vw, 2rem)' }}>
        <Btn href={contactHref('automation-prices')} track={trackAttr('cta', 'automation-prices')} variant="primary">
          {t('pricesCta')}
        </Btn>
      </div>
    </section>
  );
}
