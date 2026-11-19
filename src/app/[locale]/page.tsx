import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { isLocale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Btn } from '@/components/ui/Btn';
import { FieldHead } from '@/components/ui/FieldHead';
import { FieldRow } from '@/components/ui/FieldRow';
import { CTAStrip } from '@/components/ui/CTAStrip';
import { HomeOfferSheet } from './HomeOfferSheet';
import { contactHref } from '@/data/contact-sources';
import { buildPageMetadata, localizedUrl } from '@/lib/seo/metadata';
import { PAGE_LAST_MODIFIED } from '@/lib/seo/pages';
import { buildHomeJsonLd, serializeJsonLd } from '@/lib/seo/jsonLd';
import { trackAttr } from '@/data/track-ids';
import { PORTRAIT_SRC } from '@/data/portrait';

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
        <div className="container border-x">
          {/* Form head (redesign PR 9): who, what, where; the name stands once in the content, here.
              The photo slot only renders once PORTRAIT_SRC is set (src/data/portrait.ts). */}
          <div className="home-hero-body">
            <FieldHead
              photo={PORTRAIT_SRC !== null}
              lead={
                <FieldRow
                  label={t('hero.head.whoLabel')}
                  secondary={t('hero.head.whoRole')}
                  photoSrc={PORTRAIT_SRC ?? undefined}
                  photoAlt={t('hero.head.who')}
                >
                  {t('hero.head.who')}
                </FieldRow>
              }
              aside={<FieldRow label={t('hero.head.replyLabel')}>{t('hero.head.reply')}</FieldRow>}
            >
              <FieldRow label={t('hero.head.whatLabel')}>{t('hero.head.what')}</FieldRow>
              <FieldRow label={t('hero.head.whereLabel')}>{t('hero.head.where')}</FieldRow>
            </FieldHead>
            <div className="home-hero-split">
              <div className="home-hero-text">
                <h1 className="home-hero-title">
                  {t('hero.title1')}
                  {t('hero.title2')}
                </h1>
                <p className="home-hero-sub">{t('hero.sub')}</p>
                <div className="home-hero-btns">
                  <Btn href="/automation" track={trackAttr('link', 'home-hero-automation')} variant="primary">
                    {t('hero.cta2')}
                  </Btn>
                  <Btn href="/about" track={trackAttr('link', 'home-hero-about')}>
                    {t('hero.cta1')}
                  </Btn>
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <HomeOfferSheet locale={locale} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Areas (redesign PR 10): a ruled directory, the offer largest; every link says where it leads. */}
      <section>
        <div className="container border-x">
          <div style={{ paddingTop: 'var(--section-y)' }}>
            <h2 className="dir-head">{t('pages.home.areasTitle')}</h2>
            <div className="dir-rows">
              {teaserKeys.map((key) => (
                <Link
                  key={key}
                  href={`/${key}`}
                  data-track={trackAttr('link', `home-tile-${key}`)}
                  className={key === 'automation' ? 'dir-row dir-row-main' : 'dir-row'}
                >
                  <h3 className="dir-title">{t(`teasers.${key}.title`)}</h3>
                  <p className="dir-text">{t(`teasers.${key}.text`)}</p>
                  <span className="dir-go">{t(`teasers.${key}.go`)}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CTAStrip
        together={t('cta.together')}
        togsub={t('cta.togsub')}
        primary={{ href: contactHref('home-cta'), label: t('cta.primary'), track: trackAttr('cta', 'home-cta') }}
        emailLabel={t('cta.email')}
      />
    </div>
  );
}
