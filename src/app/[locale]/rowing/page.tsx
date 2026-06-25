import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { isLocale } from '@/i18n/routing';
import { getPathname } from '@/i18n/navigation';
import { Icon } from '@/components/ui/Icon';
import { Btn } from '@/components/ui/Btn';
import { PageHeader } from '@/components/ui/PageHeader';
import { ExpCard } from '@/components/ui/ExpCard';
import { ROWING_CARDS } from '@/data/rowing';

const HOST = 'https://furchert.ch';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale });
  return {
    title: `${t('pages.rowing.headerTitle')} — furchert.ch`,
    description: t('pages.rowing.headerSub'),
    alternates: {
      languages: {
        de: HOST + getPathname({ locale: 'de', href: '/rowing' }),
        en: HOST + getPathname({ locale: 'en', href: '/rowing' }),
        'x-default': HOST + getPathname({ locale: 'de', href: '/rowing' }),
      },
    },
  };
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
            <ExpCard key={i} icon={c.icon} tags={c.tags} {...c.i18n[locale]} />
          ))}
        </div>

        <div
          style={{
            aspectRatio: '16/6',
            background: 'var(--n-10)',
            borderTop: '1px solid rgba(162,167,176,.22)',
            borderBottom: '1px solid rgba(162,167,176,.22)',
            backgroundImage:
              'linear-gradient(135deg, rgba(162,167,176,.08) 25%, transparent 25%, transparent 50%, rgba(162,167,176,.08) 50%, rgba(162,167,176,.08) 75%, transparent 75%, transparent)',
            backgroundSize: '14px 14px',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-start',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '.7rem',
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              color: 'var(--n-40)',
              padding: '1rem 1.25rem',
            }}
          >
            {t('pages.rowing.photoCaption')}
          </div>
        </div>

        <div style={{ padding: '2.5rem 0', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Btn href="/projects">
            {t('hero.seeProjects')} <Icon name="arrow" size={12} />
          </Btn>
          <Btn href="/contact" dark>
            {t('nav.contact')} <Icon name="arrow" size={12} />
          </Btn>
        </div>
      </div>
    </div>
  );
}
