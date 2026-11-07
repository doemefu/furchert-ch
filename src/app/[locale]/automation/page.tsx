// Ported from the prototype (pages.jsx PageAutomation, lines 459-592) and
// reworked for the SME offer (Zürcher Oberland). RSC; only the FAQ block is
// a client island. Sections: hero, one before/after example,
// process and prices (owner-approved prices, 2026-11-03), data protection,
// about, call to action, FAQ. The new sections are server components next to
// this file and reuse the page's existing section styles (sectionStyles.ts);
// the grids are responsive (single column on narrow phones).
// The prototype's `id="scan"` FAQ placeholder stays dropped (worklog F1).
// The /automation/scan demo is retired; next.config.mjs redirects it here.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { isLocale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/ui/Icon';
import { Btn } from '@/components/ui/Btn';
import { FAQS } from '@/data/automation-faqs';
import { AutomationExample } from './AutomationExample';
import { AutomationPricing } from './AutomationPricing';
import { labelMono, leadStyle } from './sectionStyles';
import { automationJsonLdText, buildAutomationJsonLd, serializeJsonLd } from '@/lib/seo/jsonLd';
import { buildPageMetadata, localizedUrl } from '@/lib/seo/metadata';
import { PAGE_LAST_MODIFIED } from '@/lib/seo/pages';
import { FAQAccordion } from './FAQAccordion';

const DOTS_LIGHT =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18'%3E%3Ccircle cx='1' cy='1' r='1' fill='%23a2a7b0' opacity='.08'/%3E%3C/svg%3E\")";

// Date of the last content change; shown on the page, used as
// `dateModified` in the JSON-LD and as the sitemap's lastmod. Update it in
// src/lib/seo/pages.ts whenever the copy changes.
const LAST_UPDATED = PAGE_LAST_MODIFIED['/automation'];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale });
  return buildPageMetadata({
    locale,
    href: '/automation',
    title: t('pages.automation.metaTitle'),
    description: t('pages.automation.metaDescription'),
  });
}

export default async function AutomationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();

  const faqItems = FAQS.map((f) => f.i18n[locale]);
  const mailHref = `mailto:dominic@furchert.ch?subject=${encodeURIComponent(t('pages.automation.mailSubject'))}`;
  const jsonLd = buildAutomationJsonLd({
    locale,
    pageUrl: localizedUrl(locale, '/automation'),
    ...automationJsonLdText({
      heroLabel: t('pages.automation.heroLabel'),
      heroSub: t('pages.automation.heroSub'),
      areaServed: t('pages.automation.areaServed'),
    }),
    faq: faqItems,
    dateModified: LAST_UPDATED,
  });
  const updatedLabel = t('pages.automation.updatedLabel');
  const updatedDate = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(LAST_UPDATED));

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      {/* HERO (dark) */}
      <div
        style={{
          background: 'var(--n-100)',
          padding: '6rem 0 5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: DOTS_LIGHT,
            backgroundRepeat: 'repeat',
            backgroundSize: '1.125rem',
            pointerEvents: 'none',
          }}
        />
        <div className="container border-x" style={{ position: 'relative' }}>
          <p
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '.8125rem',
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              color: 'var(--n-50)',
              marginBottom: '1.5rem',
            }}
          >
            {t('pages.automation.heroLabel')}
          </p>
          <h1
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 'clamp(2rem, 5vw, 3.75rem)',
              fontWeight: 500,
              letterSpacing: '-.04em',
              lineHeight: 1.05,
              color: 'var(--white)',
              maxWidth: '22ch',
              textWrap: 'balance',
              marginBottom: '1.5rem',
            }}
          >
            {t('pages.automation.heroTitlePre')}
            <span style={{ color: 'var(--blue-light)' }}>
              {t('pages.automation.heroTitleEm')}
            </span>
            {t('pages.automation.heroTitlePost')}
          </h1>
          <p
            style={{
              fontSize: 'clamp(1rem, 1.4vw, 1.25rem)',
              color: 'var(--n-40)',
              maxWidth: '52ch',
              lineHeight: 1.45,
              marginBottom: '2.5rem',
            }}
          >
            {t('pages.automation.heroSub')}
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Btn href="/contact" dark>
              {t('pages.automation.heroCtaContact')} <Icon name="arrow" size={12} />
            </Btn>
          </div>
          <p
            style={{
              marginTop: '1.5rem',
              fontFamily: 'var(--mono)',
              fontSize: '.8125rem',
              letterSpacing: '.04em',
              color: 'var(--n-40)',
            }}
          >
            {t('pages.automation.heroPriceLine')}
          </p>
        </div>
      </div>

      <div className="container border-x">
        <AutomationExample locale={locale} />
        <AutomationPricing locale={locale} />

        {/* DATA PROTECTION (two-column) */}
        <div style={{ padding: '4rem 0', borderBottom: '1px solid rgba(162,167,176,.22)' }}>
          <p style={labelMono}>{t('pages.automation.privacyLabel')}</p>
          <h2
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 'clamp(1.5rem,3vw,2.25rem)',
              fontWeight: 500,
              letterSpacing: '-.03em',
              color: 'var(--n-100)',
              marginBottom: '1rem',
            }}
          >
            {t('pages.automation.privacyHeading')}
          </h2>
          <p style={leadStyle}>{t('pages.automation.privacyLead')}</p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
              gap: '0',
              border: '1px solid rgba(162,167,176,.22)',
              borderRadius: '2px',
            }}
          >
            <div
              style={{
                padding: '1.5rem',
                background: 'var(--n-10)',
                borderRight: '1px solid rgba(162,167,176,.22)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '.75rem',
                  letterSpacing: '.05em',
                  textTransform: 'uppercase',
                  color: 'var(--n-50)',
                  marginBottom: '1rem',
                }}
              >
                {t('pages.automation.privacyLeftTitle')}
              </div>
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <div
                  key={n}
                  style={{
                    display: 'flex',
                    gap: '.75rem',
                    alignItems: 'center',
                    padding: '.5rem 0',
                    borderTop: '1px solid rgba(162,167,176,.12)',
                    fontSize: '.9rem',
                    color: 'var(--n-60)',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{ width: 16, flexShrink: 0, display: 'flex', alignItems: 'center' }}
                  >
                    <span style={{ display: 'block', width: 10, height: 1, background: 'var(--n-40)' }} />
                  </span>
                  {t(`pages.automation.privacyLeft${n}`)}
                </div>
              ))}
            </div>
            <div style={{ padding: '1.5rem', background: 'var(--blue-wash)' }}>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '.75rem',
                  letterSpacing: '.05em',
                  textTransform: 'uppercase',
                  color: 'var(--blue-base)',
                  marginBottom: '1rem',
                }}
              >
                {t('pages.automation.privacyRightTitle')}
              </div>
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <div
                  key={n}
                  style={{
                    display: 'flex',
                    gap: '.75rem',
                    alignItems: 'center',
                    padding: '.5rem 0',
                    borderTop: '1px solid rgba(14,60,166,.1)',
                    fontSize: '.9rem',
                    color: 'var(--n-70)',
                  }}
                >
                  <span style={{ color: 'var(--blue-base)', flexShrink: 0 }}>
                    <Icon name="check" size={16} />
                  </span>
                  {t(`pages.automation.privacyRight${n}`)}
                </div>
              ))}
            </div>
          </div>
          <p
            style={{
              marginTop: '1.5rem',
              fontSize: '.875rem',
              color: 'var(--n-60)',
              lineHeight: 1.55,
              maxWidth: '68ch',
            }}
          >
            {t('pages.automation.privacyFootnote')}
          </p>
        </div>

        {/* ABOUT MINI */}
        <div
          style={{
            padding: '3rem 0',
            borderBottom: '1px solid rgba(162,167,176,.22)',
            display: 'flex',
            gap: '2rem',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: 220 }}>
            <div
              style={{
                fontFamily: 'var(--sans)',
                fontSize: '1.125rem',
                fontWeight: 500,
                letterSpacing: '-.02em',
                color: 'var(--n-100)',
              }}
            >
              Dominic Furchert
            </div>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '.75rem',
                letterSpacing: '.04em',
                textTransform: 'uppercase',
                color: 'var(--n-50)',
                margin: '.25rem 0 .75rem',
              }}
            >
              {t('pages.automation.aboutMiniRole')}
            </div>
            <p
              style={{
                fontSize: '.9375rem',
                color: 'var(--n-60)',
                lineHeight: 1.55,
                maxWidth: '52ch',
              }}
            >
              {t('pages.automation.aboutMiniText')}
            </p>
            <Link
              href="/about"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '.4rem',
                marginTop: '1rem',
                fontFamily: 'var(--mono)',
                fontSize: '.75rem',
                letterSpacing: '.04em',
                textTransform: 'uppercase',
                color: 'var(--blue-base)',
                textDecoration: 'none',
              }}
            >
              {t('pages.automation.aboutMiniMore')}
            </Link>
          </div>
        </div>

        {/* BOTTOM CTA */}
        <div
          style={{
            padding: '4rem 0',
            borderBottom: '1px solid rgba(162,167,176,.22)',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 'clamp(1.4rem,3vw,2.25rem)',
              fontWeight: 500,
              letterSpacing: '-.03em',
              color: 'var(--n-100)',
              maxWidth: '42ch',
              margin: '0 auto 1.5rem',
              textWrap: 'balance',
            }}
          >
            {t('pages.automation.bottomCtaHeading')}
          </h2>
          <div
            style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <Btn href="/contact" dark>
              {t('pages.automation.bottomCtaPrimary')} <Icon name="arrow" size={12} />
            </Btn>
            <Btn href={mailHref}>{t('pages.automation.bottomCtaSecondary')}</Btn>
          </div>
        </div>

        {/* FAQ — id="scan" from prototype intentionally dropped (F1). */}
        <div style={{ padding: '3rem 0' }}>
          <h2
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '.8125rem',
              fontWeight: 400,
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              color: 'var(--n-50)',
              marginBottom: '1.5rem',
            }}
          >
            {t('pages.automation.faqLabel')}
          </h2>
          <FAQAccordion items={faqItems} />
          <p
            style={{
              marginTop: '2rem',
              fontFamily: 'var(--mono)',
              fontSize: '.75rem',
              letterSpacing: '.04em',
              color: 'var(--n-60)',
            }}
          >
            {updatedLabel}: <time dateTime={LAST_UPDATED}>{updatedDate}</time>
          </p>
        </div>
      </div>
    </div>
  );
}
