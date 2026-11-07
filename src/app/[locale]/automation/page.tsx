// Ported from the prototype (pages.jsx PageAutomation, lines 459-592) and
// reworked as the offer page for construction and civil engineering firms
// (Gate 0, #145). A static offer page with no AI backend: no Claude API, no
// AI endpoint, no persistence; the tiles and the example are illustrative and
// labelled as invented. RSC; the only client islands are the FAQ accordion,
// the sticky call to action for phones and the e-mail button (ContactEmail,
// which renders the address only in the browser, #147). Sections: light hero
// with three example tiles, "So arbeite ich", the before/after example with a
// sample calculation, process and prices, "Ihre Daten", "Wer ich bin", FAQ,
// closing call to action. Every call to action links to /contact?from=<id>
// (src/data/contact-sources.ts) inside a `data-cta` wrapper; the hero and the
// closing call to action also link «Rückruf anfordern» (automation-callback),
// which ticks «Rückruf gewünscht» on the contact form.
// The prototype's `id="scan"` FAQ placeholder stays dropped (worklog F1).
// The /automation/scan demo is retired; next.config.mjs redirects it here.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { isLocale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/ui/Icon';
import { Btn } from '@/components/ui/Btn';
import { ContactEmail } from '@/components/ui/ContactEmail';
import { FAQS, faqsForMarkup } from '@/data/automation-faqs';
import { contactHref } from '@/data/contact-sources';
import { WowTiles } from './WowTiles';
import { TwoColumnChecklist, CheckRow } from './TwoColumnChecklist';
import { AutomationExample } from './AutomationExample';
import { ExampleCalc } from './ExampleCalc';
import { AutomationPricing } from './AutomationPricing';
import { StickyCta } from './StickyCta';
import { HAIRLINE, labelMono, textLink } from './sectionStyles';
import { automationJsonLdText, buildAutomationJsonLd, serializeJsonLd } from '@/lib/seo/jsonLd';
import { buildPageMetadata, localizedUrl } from '@/lib/seo/metadata';
import { PAGE_LAST_MODIFIED } from '@/lib/seo/pages';
import { FAQAccordion } from './FAQAccordion';

// The home page's dot pattern on the light hero.
const DOTS =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18'%3E%3Ccircle cx='1' cy='1' r='1' fill='%23a2a7b0' opacity='.3'/%3E%3C/svg%3E\")";

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
  const t = await getTranslations({ locale, namespace: 'pages.automation' });

  const faqItems = FAQS.map((f) => f.i18n[locale]);
  const jsonLd = buildAutomationJsonLd({
    locale,
    pageUrl: localizedUrl(locale, '/automation'),
    ...automationJsonLdText({
      heroLabel: t('heroLabel'),
      heroSub: t('heroSub'),
      areaServed: t('areaServed'),
    }),
    // Without the price FAQ: no amount in CHF in structured data.
    faq: faqsForMarkup(locale),
    dateModified: LAST_UPDATED,
  });
  const updatedDate = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(LAST_UPDATED));
  const n3 = [1, 2, 3] as const;

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      {/* HERO (light). `data-cta`: the sticky bar waits until it has left. */}
      <div
        data-cta="hero"
        style={{
          background: 'var(--n-10)',
          padding: 'clamp(2rem, 8vw, 6rem) 0 clamp(2.5rem, 6.5vw, 5rem)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: DOTS,
            backgroundRepeat: 'repeat',
            backgroundSize: '1.125rem',
            pointerEvents: 'none',
          }}
        />
        <div className="container border-x" style={{ position: 'relative' }}>
          <p style={{ ...labelMono, marginBottom: 'clamp(.75rem, 2vw, 1.5rem)' }}>{t('heroLabel')}</p>
          <h1
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 'clamp(2rem, 5vw, 3.75rem)',
              fontWeight: 500,
              letterSpacing: '-.04em',
              lineHeight: 1.05,
              color: 'var(--n-100)',
              maxWidth: '22ch',
              textWrap: 'balance',
              marginBottom: 'clamp(1rem, 2vw, 1.5rem)',
            }}
          >
            {t('heroTitlePre')}
            <span style={{ color: 'var(--blue-base)' }}>{t('heroTitleEm')}</span>
            {t('heroTitlePost')}
          </h1>
          <WowTiles locale={locale} />
          <p style={{ marginTop: '.75rem', fontSize: '.875rem', color: 'var(--n-60)', lineHeight: 1.5 }}>
            {t('heroTilesNote')}
          </p>
          <div style={{ marginTop: '1.25rem' }}>
            <Btn href={contactHref('automation-hero')} dark>
              {t('heroCta')} <Icon name="arrow" size={12} />
            </Btn>
          </div>
          <p
            style={{
              marginTop: '.75rem',
              fontFamily: 'var(--mono)',
              fontSize: '.75rem',
              letterSpacing: '.04em',
              textTransform: 'uppercase',
              color: 'var(--n-60)',
            }}
          >
            {t('heroCtaMicro')}
          </p>
          <Link
            href={contactHref('automation-callback')}
            style={{ ...textLink, display: 'flex', width: 'fit-content' }}
          >
            {t('heroCallback')}
          </Link>
          <p
            style={{
              marginTop: '.5rem',
              fontSize: '1rem',
              color: 'var(--n-70)',
              lineHeight: 1.55,
              maxWidth: '62ch',
            }}
          >
            {t('heroSub')}
          </p>
        </div>
      </div>

      <div className="container border-x">
        <TwoColumnChecklist
          id="so-arbeite-ich"
          label={t('workLabel')}
          heading={t('workHeading')}
          lead={t('workLead')}
          right={{ title: t('workRightTitle'), items: n3.map((n) => t(`workRight${n}`)) }}
          footnote={t('workFootnote')}
        />
        <AutomationExample locale={locale}>
          <ExampleCalc locale={locale} />
        </AutomationExample>
        <AutomationPricing locale={locale} />
        <TwoColumnChecklist
          id="daten"
          label={t('privacyLabel')}
          heading={t('privacyHeading')}
          lead={t('privacyLead')}
          right={{ title: t('privacyRightTitle'), items: n3.map((n) => t(`privacyRight${n}`)) }}
          footnote={t('privacyFootnote')}
        />

        {/* WER ICH BIN */}
        <section
          id="ueber-mich"
          aria-labelledby="about-heading"
          style={{ padding: 'clamp(2rem, 6vw, 3rem) 0', borderBottom: HAIRLINE }}
        >
          <h2
            id="about-heading"
            style={{
              fontFamily: 'var(--sans)',
              fontSize: '1.125rem',
              fontWeight: 500,
              letterSpacing: '-.02em',
              color: 'var(--n-100)',
            }}
          >
            Dominic Furchert
          </h2>
          <p
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '.75rem',
              letterSpacing: '.04em',
              textTransform: 'uppercase',
              color: 'var(--n-60)',
              margin: '.25rem 0 .75rem',
            }}
          >
            {t('aboutMiniRole')}
          </p>
          <p style={{ fontSize: '.9375rem', color: 'var(--n-70)', lineHeight: 1.55, maxWidth: '62ch' }}>
            {t('aboutMiniText')}
          </p>
          <div
            style={{
              marginTop: '1.5rem',
              padding: 'clamp(1rem, 4vw, 1.25rem) clamp(1rem, 4vw, 1.5rem)',
              background: 'var(--blue-wash)',
              border: '1px solid rgba(14,60,166,.12)',
              borderRadius: '2px',
              maxWidth: '40rem',
            }}
          >
            <h3
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '.75rem',
                fontWeight: 400,
                letterSpacing: '.05em',
                textTransform: 'uppercase',
                color: 'var(--blue-base)',
                marginBottom: '.75rem',
              }}
            >
              {t('reliableTitle')}
            </h3>
            <ul role="list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {([1, 2, 3, 4] as const).map((n) => (
                <CheckRow key={n}>{t(`reliable${n}`)}</CheckRow>
              ))}
            </ul>
          </div>
          <div
            data-cta="about"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '.75rem 1.5rem',
              marginTop: '1.5rem',
            }}
          >
            <Btn href={contactHref('automation-about')} dark>
              {t('aboutCta')} <Icon name="arrow" size={12} />
            </Btn>
            <Link href="/about" style={textLink}>
              {t('aboutMiniMore')}
            </Link>
          </div>
        </section>

        {/* FAQ: id="scan" from the prototype intentionally dropped (F1). */}
        <section
          id="faq"
          aria-labelledby="faq-heading"
          style={{ padding: '3rem 0', borderBottom: HAIRLINE }}
        >
          <h2
            id="faq-heading"
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '.8125rem',
              fontWeight: 400,
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              color: 'var(--n-60)',
              marginBottom: '1.5rem',
            }}
          >
            {t('faqLabel')}
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
            {t('updatedLabel')}: <time dateTime={LAST_UPDATED}>{updatedDate}</time>
          </p>
        </section>

        {/* CLOSING CTA, after the FAQ. `data-cta`: the sticky bar hides here. */}
        <section
          data-cta="final"
          aria-labelledby="final-heading"
          style={{ padding: '4rem 0', textAlign: 'center' }}
        >
          <h2
            id="final-heading"
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 'clamp(1.4rem,3vw,2.25rem)',
              fontWeight: 500,
              letterSpacing: '-.03em',
              color: 'var(--n-100)',
              maxWidth: '42ch',
              margin: '0 auto 1rem',
              textWrap: 'balance',
            }}
          >
            {t('bottomCtaHeading')}
          </h2>
          <p
            style={{
              fontSize: '1rem',
              color: 'var(--n-70)',
              lineHeight: 1.55,
              maxWidth: '56ch',
              margin: '0 auto 1rem',
            }}
          >
            {t('bottomCtaSub')}
          </p>
          <p
            style={{
              fontSize: '.9375rem',
              color: 'var(--n-60)',
              lineHeight: 1.55,
              maxWidth: '60ch',
              margin: '0 auto 2rem',
            }}
          >
            {t('bottomCtaAgenda')}
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Btn href={contactHref('automation-final')} dark>
              {t('bottomCtaPrimary')} <Icon name="arrow" size={12} />
            </Btn>
            {/* The address is rendered only in the browser (#147). */}
            <ContactEmail btn label={t('bottomCtaSecondary')} subject={t('mailSubject')} />
          </div>
          <Link
            href={contactHref('automation-callback')}
            style={{ ...textLink, display: 'flex', width: 'fit-content', margin: '1rem auto 0' }}
          >
            {t('heroCallback')}
          </Link>
        </section>
      </div>
      <StickyCta
        href={contactHref('automation-sticky')}
        micro1={t('stickyMicro1')}
        micro2={t('stickyMicro2')}
        label={t('stickyCta')}
      />
    </div>
  );
}
