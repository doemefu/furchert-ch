import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { isLocale } from '@/i18n/routing';
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

        <div className="ab-bio">
          {BIO[locale].map((p, i) => (
            <p key={i} className="pg-text">
              {p}
            </p>
          ))}
        </div>

        <div className="cell-grid ab-facts">
          {FACTS.map((f, i) => (
            <div key={i} className="cell ab-fact">
              <b>{f.value}</b>
              <span>{f.i18n[locale].label}</span>
            </div>
          ))}
        </div>

        <div className="pg-sec">
          <h2 className="sl">{t('pages.about.timeline')}</h2>
          <ol className="tl">
            {TIMELINE.map((row, ri) => (
              <li key={ri}>
                <span className="tl-y">{row.year}</span>
                <span className="tl-t">
                  {row.i18n[locale].items.map((item, ii) => (
                    <span key={ii}>{item}</span>
                  ))}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="pg-sec">
          <h2 className="sl">{t('pages.about.interests')}</h2>
          <div className="pg-tags">
            {INTERESTS.map((i) => (
              <Tag key={i}>{i}</Tag>
            ))}
          </div>
        </div>

        <div className="pg-acts">
          <Btn href="/projects" track={trackAttr('link', 'about-projects')}>
            {t('hero.seeProjects')}
          </Btn>
          <Btn href={contactHref('about-contact')} track={trackAttr('cta', 'about-contact')} variant="primary">
            {t('nav.contact')}
          </Btn>
        </div>
      </div>
    </div>
  );
}
