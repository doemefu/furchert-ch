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
import { labelText, sectionLabel, sectionStyle } from './sectionStyles';
import { automationJsonLdText, buildAutomationJsonLd, serializeJsonLd } from '@/lib/seo/jsonLd';
import { buildPageMetadata, localizedUrl } from '@/lib/seo/metadata';
import { PAGE_LAST_MODIFIED } from '@/lib/seo/pages';
import { FAQAccordion } from './FAQAccordion';
import { trackAttr } from '@/data/track-ids';

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

  const faqItems = FAQS.map((f) => ({ id: f.id, ...f.i18n[locale] }));
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
      {/* HERO. `data-cta`: the sticky bar waits until it has left. */}
      <div data-cta="hero" data-track-section="hero">
        <div
          className="container border-x"
          style={{
            paddingTop: 'var(--section-y)',
            paddingBottom: 'clamp(2.5rem, 6.5vw, 5rem)',
          }}
        >
          <p className="ph-label">{t('heroLabel')}</p>
          <h1 className="ph-title" style={{ marginBottom: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
            {t('heroTitlePre')}
            {t('heroTitleEm')}
            {t('heroTitlePost')}
          </h1>
          <WowTiles locale={locale} />
          <p style={{ ...labelText, marginTop: '.75rem', lineHeight: 1.5 }}>
            {t('heroTilesNote')}
          </p>
          <div style={{ marginTop: '1.25rem' }}>
            <Btn href={contactHref('automation-hero')} track={trackAttr('cta', 'automation-hero')} variant="primary">
              {t('heroCta')}
            </Btn>
          </div>
          <p style={{ ...labelText, marginTop: '.75rem' }}>
            {t('heroCtaMicro')}
          </p>
          <Link
            href={contactHref('automation-callback')}
            data-track={trackAttr('cta', 'automation-callback')}
            className="text-link text-link-block"
            style={{ display: 'flex', width: 'fit-content' }}
          >
            {t('heroCallback')}
          </Link>
          <p
            style={{
              marginTop: '.5rem',
              fontSize: 'var(--text-16)',
              color: 'var(--text-2)',
              lineHeight: 1.5,
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
          trackSection="so-arbeite-ich"
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
          trackSection="daten"
          label={t('privacyLabel')}
          heading={t('privacyHeading')}
          lead={t('privacyLead')}
          right={{ title: t('privacyRightTitle'), items: n3.map((n) => t(`privacyRight${n}`)) }}
          footnote={t('privacyFootnote')}
        />

        {/* WER ICH BIN */}
        <section
          id="ueber-mich"
          data-track-section="ueber-mich"
          aria-labelledby="about-heading"
          style={sectionStyle}
        >
          <h2
            id="about-heading"
            style={{
              ...sectionLabel,
              fontWeight: 400,
              marginBottom: 'var(--space-3)',
            }}
          >
            Dominic Furchert
          </h2>
          <p style={{ ...labelText, margin: '0 0 .75rem' }}>{t('aboutMiniRole')}</p>
          <p style={{ fontSize: 'var(--text-16)', color: 'var(--text-2)', lineHeight: 1.5, maxWidth: '62ch' }}>
            {t('aboutMiniText')}
          </p>
          <div className="about-mini-box" style={{ marginTop: '1.5rem' }}>
            <h3
              style={{
                fontSize: 'var(--text-14)',
                fontWeight: 400,
                color: 'var(--text-2)',
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
            <Btn href={contactHref('automation-about')} track={trackAttr('cta', 'automation-about')} variant="primary">
              {t('aboutCta')}
            </Btn>
            <Link href="/about" className="text-link text-link-block" data-track={trackAttr('link', 'automation-about-page')}>
              {t('aboutMiniMore')}
            </Link>
          </div>
        </section>

        {/* FAQ: id="scan" from the prototype intentionally dropped (F1). */}
        <section
          id="faq"
          data-track-section="faq"
          aria-labelledby="faq-heading"
          style={{ ...sectionStyle, paddingBottom: 'var(--section-y)' }}
        >
          <h2
            id="faq-heading"
            style={{
              ...sectionLabel,
              fontWeight: 400,
              marginBottom: 'var(--space-4)',
            }}
          >
            {t('faqLabel')}
          </h2>
          <FAQAccordion items={faqItems} />
          <p style={{ ...labelText, marginTop: '2rem' }}>
            {t('updatedLabel')}: <time dateTime={LAST_UPDATED}>{updatedDate}</time>
          </p>
        </section>
      </div>

      {/* CLOSING CTA, after the FAQ. `data-cta`: the sticky bar hides here. */}
      <section
        className="band on-dark"
        data-cta="final"
        data-track-section="final"
        aria-labelledby="final-heading"
      >
        <div className="container band-in">
          <div>
            <h2 id="final-heading" className="band-title">
              {t('bottomCtaHeading')}
            </h2>
            <p className="band-text">{t('bottomCtaSub')}</p>
            <p className="band-text">{t('bottomCtaAgenda')}</p>
          </div>
          <div className="band-side">
            <div className="band-acts">
              <Btn href={contactHref('automation-final')} track={trackAttr('cta', 'automation-final')} variant="inverse">
                {t('bottomCtaPrimary')}
              </Btn>
              {/* The address is rendered only in the browser (#147). */}
              <ContactEmail btn label={t('bottomCtaSecondary')} subject={t('mailSubject')} />
            </div>
            <Link
              href={contactHref('automation-callback')}
              data-track={trackAttr('cta', 'automation-callback')}
              className="text-link text-link-block"
            >
              {t('heroCallback')}
            </Link>
          </div>
        </div>
      </section>
      <StickyCta
        href={contactHref('automation-sticky')}
        track={trackAttr('cta', 'automation-sticky')}
        micro1={t('stickyMicro1')}
        micro2={t('stickyMicro2')}
        label={t('stickyCta')}
      />
    </div>
  );
}
