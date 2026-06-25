import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { isLocale } from '@/i18n/routing';
import { getPathname } from '@/i18n/navigation';
import { Icon } from '@/components/ui/Icon';
import { Btn } from '@/components/ui/Btn';
import { PageHeader } from '@/components/ui/PageHeader';
import { ExpCard } from '@/components/ui/ExpCard';
import { IT_CARDS, TECH_STACK } from '@/data/it';

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
    title: `${t('pages.it.headerTitle')} — furchert.ch`,
    description: t('pages.it.headerSub'),
    alternates: {
      languages: {
        de: HOST + getPathname({ locale: 'de', href: '/it' }),
        en: HOST + getPathname({ locale: 'en', href: '/it' }),
        'x-default': HOST + getPathname({ locale: 'de', href: '/it' }),
      },
    },
  };
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
            <ExpCard key={i} icon={c.icon} tags={c.tags} {...c.i18n[locale]} />
          ))}
        </div>
        <div style={{ padding: '3rem 0', borderBottom: '1px solid rgba(162,167,176,.22)' }}>
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
            {t('pages.it.techStack')}
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '1rem',
            }}
          >
            {TECH_STACK.map((s) => (
              <div key={s.i18n.de.cat}>
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '.72rem',
                    letterSpacing: '.05em',
                    textTransform: 'uppercase',
                    color: 'var(--n-40)',
                    marginBottom: '.5rem',
                  }}
                >
                  {s.i18n[locale].cat}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
                  {s.items.map((it) => (
                    <span key={it} style={{ fontSize: '.9rem', color: 'var(--n-70)' }}>
                      {it}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: '2.5rem 0', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Btn href="/projects">
            {t('hero.seeProjects')} <Icon name="arrow" size={12} />
          </Btn>
          <Btn href="/automation" dark>
            {t('hero.cta2')} <Icon name="arrow" size={12} />
          </Btn>
        </div>
      </div>
    </div>
  );
}
