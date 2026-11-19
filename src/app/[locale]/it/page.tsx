import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { isLocale } from '@/i18n/routing';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { Btn } from '@/components/ui/Btn';
import { PageHeader } from '@/components/ui/PageHeader';
import { ExpCard } from '@/components/ui/ExpCard';
import { FieldList, FieldRow } from '@/components/ui/FieldRow';
import { IT_CARDS, TECH_STACK } from '@/data/it';
import { trackAttr } from '@/data/track-ids';

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
    href: '/it',
    title: t('pages.it.metaTitle'),
    description: t('pages.it.metaDescription'),
  });
}

export default async function ITPage({
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
          label={t('pages.it.headerLabel')}
          title={t('pages.it.headerTitle')}
          sub={t('pages.it.headerSub')}
        />
        <div>
          {IT_CARDS.map((c, i) => (
            <ExpCard key={i} tags={c.tags} {...c.i18n[locale]} />
          ))}
        </div>
        <div className="pg-sec">
          <h2 className="sl">{t('pages.it.techStack')}</h2>
          <FieldList className="ts">
            {TECH_STACK.map((s) => (
              <FieldRow key={s.i18n.de.cat} label={s.i18n[locale].cat} variant="text">
                <ul className="ts-list">
                  {s.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              </FieldRow>
            ))}
          </FieldList>
        </div>
        <div className="pg-acts">
          <Btn href="/projects" track={trackAttr('link', 'it-projects')}>
            {t('hero.seeProjects')}
          </Btn>
          <Btn href="/automation" track={trackAttr('link', 'it-automation')} variant="primary">
            {t('hero.cta2')}
          </Btn>
        </div>
      </div>
    </div>
  );
}
