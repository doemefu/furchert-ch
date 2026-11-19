import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { isLocale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/ui/Icon';
import { Btn } from '@/components/ui/Btn';
import { CTAStrip } from '@/components/ui/CTAStrip';
import { HomeStatusLine } from '@/components/layout/HomeStatusLine';
import { HomeOfferSheet } from './HomeOfferSheet';
import { EXPERIENCE } from '@/data/experience';
import { ENGAGEMENT } from '@/data/engagement';
import { HOME_STATS } from '@/data/home-stats';
import { contactHref } from '@/data/contact-sources';
import { buildPageMetadata, localizedUrl } from '@/lib/seo/metadata';
import { PAGE_LAST_MODIFIED } from '@/lib/seo/pages';
import { buildHomeJsonLd, serializeJsonLd } from '@/lib/seo/jsonLd';
import { trackAttr } from '@/data/track-ids';

const DOTS =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18'%3E%3Ccircle cx='1' cy='1' r='1' fill='%23a2a7b0' opacity='.3'/%3E%3C/svg%3E\")";

// Section eyebrow: sentence case, no mono (redesign PR 8). `sectionLabel` adds the 2px ink rule.
const labelMono = {
  fontSize: 'var(--text-14)',
  color: 'var(--text-3)',
};
const sectionLabel = {
  ...labelMono,
  borderTop: '2px solid var(--rule)',
  paddingTop: 'var(--space-3)',
};

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
    href: '/',
    title: t('pages.home.metaTitle'),
    description: t('pages.home.metaDescription'),
  });
}

const iconMap: Record<string, string> = {
  it: 'code',
  rowing: 'boat',
  projects: 'server',
  automation: 'flow',
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();

  const teaserKeys = ['automation', 'it', 'rowing', 'projects'] as const;
  const jsonLd = buildHomeJsonLd({
    locale,
    pageUrl: localizedUrl(locale, '/'),
    name: t('pages.home.metaTitle'),
    description: t('pages.home.metaDescription'),
    dateModified: PAGE_LAST_MODIFIED['/'],
  });

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      {/* HERO — note: layout <main> already supplies paddingTop:var(--header-h),
          so (unlike the prototype) we do NOT repeat it here (worklog F2). */}
      <section>
        <div className="container border-x home-hero">
          <div className="home-hero-body">
            <div className="home-hero-split" style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  backgroundImage: DOTS,
                  backgroundRepeat: 'repeat',
                  backgroundSize: '1.125rem',
                }}
              />
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  minWidth: 0,
                }}
              >
                <p style={{ ...labelMono, textTransform: 'none', letterSpacing: 0 }}>{t('hero.label')}</p>
                <h1
                  className="home-hero-title"
                  style={{
                    fontFamily: 'var(--sans)',
                    fontWeight: 500,
                    letterSpacing: '-.03em',
                    lineHeight: 1,
                    textWrap: 'balance',
                    marginTop: '1rem',
                  }}
                >
                  <span style={{ color: 'var(--n-100)' }}>{t('hero.title1')}</span>
                  <span style={{ color: 'var(--n-100)' }}>{t('hero.title2')}</span>
                </h1>
                <p
                  style={{
                    fontFamily: 'var(--sans)',
                    fontSize: 'var(--fs-lead)',
                    color: 'var(--n-60)',
                    maxWidth: '52ch',
                    textWrap: 'balance',
                    lineHeight: 1.45,
                    letterSpacing: 0,
                    marginTop: '1.5rem',
                  }}
                >
                  {t('hero.sub')}
                </p>
                <div
                  style={{
                    display: 'flex',
                    gap: '.75rem',
                    flexWrap: 'wrap',
                    justifyContent: 'flex-start',
                    marginTop: '2.5rem',
                  }}
                >
                  <Btn href="/automation" track={trackAttr('link', 'home-hero-automation')} variant="primary">
                    {t('hero.cta2')}
                  </Btn>
                  <Btn href="/about" track={trackAttr('link', 'home-hero-about')}>
                    {t('hero.cta1')}
                  </Btn>
                </div>
              </div>
              <div style={{ position: 'relative', minWidth: 0 }}>
                <HomeOfferSheet locale={locale} />
              </div>
            </div>
          </div>

          <div
            className="cell-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              borderTop: '1px solid rgba(162,167,176,.22)',
            }}
          >
            <div
              className="cell"
              style={{
                paddingBlock: '3rem',
                borderRight: '1px solid rgba(162,167,176,.22)',
                borderBottom: '1px solid rgba(162,167,176,.22)',
              }}
            >
              <p style={{ ...labelMono, color: 'var(--n-60)', marginBottom: '1.5rem' }}>
                {t('about.exp')}
              </p>
              <ul
                style={{
                  listStyle: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                }}
              >
                {EXPERIENCE.map((e, i) => (
                  <li key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <span
                      style={{
                        flexShrink: 0,
                        marginTop: '8px',
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: 'var(--n-40)',
                      }}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: 'var(--fs-16)',
                          fontWeight: 500,
                          color: 'var(--n-100)',
                          lineHeight: 1.2,
                          letterSpacing: 0,
                        }}
                      >
                        {e.title}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: 'var(--fs-12)',
                          color: 'var(--n-60)',
                          marginTop: '.25rem',
                        }}
                      >
                        {e.org}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div
              className="cell"
              style={{
                paddingBlock: '3rem',
                borderBottom: '1px solid rgba(162,167,176,.22)',
              }}
            >
              <p style={{ ...labelMono, color: 'var(--n-60)', marginBottom: '1.5rem' }}>
                {t('about.eng')}
              </p>
              <ul
                style={{
                  listStyle: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                }}
              >
                {ENGAGEMENT.map((e, i) => (
                  <li key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <span
                      style={{
                        flexShrink: 0,
                        marginTop: '8px',
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: 'var(--n-40)',
                      }}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: 'var(--fs-16)',
                          fontWeight: 500,
                          color: 'var(--n-100)',
                          lineHeight: 1.2,
                          letterSpacing: 0,
                        }}
                      >
                        {e.title}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: 'var(--fs-12)',
                          color: 'var(--n-60)',
                          marginTop: '.25rem',
                        }}
                      >
                        {e.org}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <HomeStatusLine />

      <section>
        <div className="container border-x">
          <div style={{ padding: 'var(--section-y) 0 var(--space-10)', borderBottom: '1px solid rgba(162,167,176,.22)' }}>
            <p style={{ ...sectionLabel, marginBottom: 'var(--space-2)' }}>{t('pages.home.areas')}</p>
            <h2
              style={{
                fontSize: 'var(--text-h2)',
                fontStretch: 'var(--stretch-heading)',
                fontWeight: 'var(--weight-heading)',
                lineHeight: 1.05,
                color: 'var(--text-1)',
                maxWidth: '22ch',
              }}
            >
              {t('pages.home.areasTitle')}
            </h2>
          </div>
          <div
            className="cell-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            }}
          >
            {teaserKeys.map((key) => (
              <Link
                key={key}
                href={`/${key}`}
                data-track={trackAttr('link', `home-tile-${key}`)}
                className="hover-card cell"
                style={{
                  paddingBlock: '2.5rem',
                  borderRight: '1px solid rgba(162,167,176,.22)',
                  borderBottom: '1px solid rgba(162,167,176,.22)',
                }}
              >
                <div
                  style={{
                    width: '2.25rem',
                    height: '2.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(162,167,176,.35)',
                    background: 'var(--n-10)',
                    marginBottom: '1.5rem',
                  }}
                >
                  <Icon name={iconMap[key]} size={16} />
                </div>
                <div
                  style={{
                    fontFamily: 'var(--sans)',
                    fontSize: 'var(--fs-18)',
                    fontWeight: 500,
                    letterSpacing: 0,
                    color: 'var(--n-100)',
                    marginBottom: '.5rem',
                  }}
                >
                  {t(`teasers.${key}.title`)}
                </div>
                <p
                  style={{
                    fontSize: 'var(--fs-15)',
                    color: 'var(--n-60)',
                    lineHeight: 1.5,
                    letterSpacing: 0,
                  }}
                >
                  {t(`teasers.${key}.text`)}
                </p>
                <div
                  style={{
                    marginTop: '1.5rem',
                    fontFamily: 'var(--mono)',
                    fontSize: 'var(--fs-12)',
                    letterSpacing: '.05em',
                    textTransform: 'uppercase',
                    color: 'var(--blue-base)',
                  }}
                >
                  {t('teasers.more')}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="container border-x">
          <div
            className="cell-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            }}
          >
            {HOME_STATS.map((s, i) => (
              <div
                key={i}
                className="cell"
                style={{
                  paddingBlock: '2.5rem',
                  borderRight: '1px solid rgba(162,167,176,.22)',
                  borderBottom: '1px solid rgba(162,167,176,.22)',
                }}
              >
                <div style={{ ...labelMono, fontSize: 'var(--fs-12)', letterSpacing: '.05em', marginBottom: '.25rem' }}>
                  {s.i18n[locale].unit}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--sans)',
                    fontSize: 'var(--fs-title)',
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 500,
                    letterSpacing: '-.03em',
                    color: 'var(--n-100)',
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                </div>
                <div style={{ fontSize: 'var(--fs-14)', color: 'var(--n-60)', marginTop: '.5rem' }}>
                  {s.i18n[locale].label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTAStrip
        together={t('cta.together')}
        togsub={t('cta.togsub')}
        primary={{ href: contactHref('home-cta'), label: t('cta.primary'), track: trackAttr('cta', 'home-cta') }}
        examples={{ href: '/automation', label: t('cta.examples') }}
      />
    </div>
  );
}
