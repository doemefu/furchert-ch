import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { isLocale } from '@/i18n/routing';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { Btn } from '@/components/ui/Btn';
import { PageHeader } from '@/components/ui/PageHeader';
import { ExpCard } from '@/components/ui/ExpCard';
import { ROWING_CARDS } from '@/data/rowing';
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
    href: '/rowing',
    title: t('pages.rowing.metaTitle'),
    description: t('pages.rowing.metaDescription'),
  });
}

export default async function RowingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <div>
      <div className="container border-x">
        <PageHeader
          label={t('pages.rowing.headerLabel')}
          title={t('pages.rowing.headerTitle')}
          sub={t('pages.rowing.headerSub')}
        />
        <div>
          {ROWING_CARDS.map((c, i) => (
            <ExpCard key={i} tags={c.tags} {...c.i18n[locale]} />
          ))}
        </div>

        <div className="pg-acts">
          <Btn href="/projects" track={trackAttr('link', 'rowing-projects')}>
            {t('hero.seeProjects')}
          </Btn>
          <Btn href={contactHref('rowing-contact')} track={trackAttr('cta', 'rowing-contact')} variant="primary">
            {t('nav.contact')}
          </Btn>
        </div>
      </div>
    </div>
  );
}
