import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { isLocale } from '@/i18n/routing';
import { Icon } from '@/components/ui/Icon';
import { Tag } from '@/components/ui/Tag';
import { Btn } from '@/components/ui/Btn';
import { PageHeader } from '@/components/ui/PageHeader';
import { BIO, FACTS, TIMELINE, INTERESTS } from '@/data/about';
import { buildPageMetadata, localizedUrl } from '@/lib/seo/metadata';
import { PAGE_LAST_MODIFIED } from '@/lib/seo/pages';
import { buildProfilePageJsonLd, serializeJsonLd } from '@/lib/seo/jsonLd';
import { trackAttr } from '@/data/track-ids';
import { contactHref } from '@/data/contact-sources';

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
    href: '/about',
    title: t('pages.about.metaTitle'),
    description: t('pages.about.metaDescription'),
  });
}

const labelMono = {
  fontFamily: 'var(--mono)',
  fontSize: 'var(--fs-13)',
  letterSpacing: '.04em',
  textTransform: 'uppercase' as const,
  color: 'var(--n-60)',
};

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();
  const jsonLd = buildProfilePageJsonLd({
    locale,
    pageUrl: localizedUrl(locale, '/about'),
    name: t('pages.about.headerTitle'),
    dateModified: PAGE_LAST_MODIFIED['/about'],
  });

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <div className="container border-x">
        <PageHeader
          label={t('pages.about.headerLabel')}
          title={t('pages.about.headerTitle')}
          sub={t('pages.about.headerSub')}
        />

        <div
          style={{
            padding: '3rem 0',
            borderBottom: '1px solid rgba(162,167,176,.22)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem',
          }}
        >
          {BIO[locale].map((p, i) => (
            <p
              key={i}
              style={{
                fontSize: 'var(--fs-16)',
                color: 'var(--n-60)',
                lineHeight: 1.6,
                letterSpacing: 0,
              }}
            >
              {p}
            </p>
          ))}
        </div>

        <div
          className="cell-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            borderBottom: '1px solid rgba(162,167,176,.22)',
          }}
        >
          {FACTS.map((f, i) => (
            <div
              key={i}
              style={{ padding: '2rem 1.5rem', borderRight: '1px solid rgba(162,167,176,.22)' }}
            >
              <div
                style={{
                  fontFamily: 'var(--sans)',
                  fontSize: 'var(--fs-h2)',
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 500,
                  letterSpacing: '-.02em',
                  color: 'var(--n-100)',
                  lineHeight: 1,
                }}
              >
                {f.value}
              </div>
              <div
                style={{
                  fontSize: 'var(--fs-14)',
                  color: 'var(--n-60)',
                  marginTop: '.5rem',
                  lineHeight: 1.4,
                }}
              >
                {f.i18n[locale].label}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '3rem 0', borderBottom: '1px solid rgba(162,167,176,.22)' }}>
          <p style={{ ...labelMono, marginBottom: '2rem' }}>{t('pages.about.timeline')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {TIMELINE.map((row, ri) => (
              <div
                key={ri}
                style={{
                  display: 'flex',
                  gap: '2rem',
                  paddingBottom: '1.5rem',
                  borderLeft: '1px solid rgba(162,167,176,.22)',
                  paddingLeft: '1.5rem',
                  marginLeft: '2.5rem',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: '-2.75rem',
                    top: '0',
                    fontFamily: 'var(--mono)',
                    fontSize: 'var(--fs-12)',
                    letterSpacing: '.05em',
                    textTransform: 'uppercase',
                    color: 'var(--n-60)',
                    width: '2.25rem',
                    textAlign: 'right',
                  }}
                >
                  {row.year}
                </div>
                <div
                  style={{
                    position: 'absolute',
                    left: '-3.5px',
                    top: '4px',
                    width: 6,
                    height: 6,
                    background: 'var(--n-30)',
                    borderRadius: '50%',
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
                  {row.i18n[locale].items.map((item, ii) => (
                    <span
                      key={ii}
                      style={{ fontSize: 'var(--fs-15)', color: 'var(--n-70)', lineHeight: 1.4 }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '2.5rem 0', borderBottom: '1px solid rgba(162,167,176,.22)' }}>
          <p style={{ ...labelMono, marginBottom: '1rem' }}>{t('pages.about.interests')}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
            {INTERESTS.map((i) => (
              <Tag key={i}>{i}</Tag>
            ))}
          </div>
        </div>

        <div style={{ padding: '2.5rem 0', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Btn href="/projects" track={trackAttr('link', 'about-projects')}>
            {t('hero.seeProjects')} <Icon name="arrow" size={12} />
          </Btn>
          <Btn href={contactHref('about-contact')} track={trackAttr('cta', 'about-contact')} dark>
            {t('nav.contact')} <Icon name="arrow" size={12} />
          </Btn>
        </div>
      </div>
    </div>
  );
}
