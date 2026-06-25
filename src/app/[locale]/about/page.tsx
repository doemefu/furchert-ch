import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { isLocale } from '@/i18n/routing';
import { getPathname } from '@/i18n/navigation';
import { Icon } from '@/components/ui/Icon';
import { Tag } from '@/components/ui/Tag';
import { Btn } from '@/components/ui/Btn';
import { PageHeader } from '@/components/ui/PageHeader';
import { BIO, FACTS, TIMELINE, INTERESTS } from '@/data/about';

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
    title: `${t('pages.about.headerTitle')} — furchert.ch`,
    description: t('pages.about.headerSub'),
    alternates: {
      languages: {
        de: HOST + getPathname({ locale: 'de', href: '/about' }),
        en: HOST + getPathname({ locale: 'en', href: '/about' }),
        'x-default': HOST + getPathname({ locale: 'de', href: '/about' }),
      },
    },
  };
}

const labelMono = {
  fontFamily: 'var(--mono)',
  fontSize: '.8125rem',
  letterSpacing: '.06em',
  textTransform: 'uppercase' as const,
  color: 'var(--n-50)',
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

  return (
    <div>
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
                fontSize: '1rem',
                color: 'var(--n-60)',
                lineHeight: 1.6,
                letterSpacing: '-.01em',
              }}
            >
              {p}
            </p>
          ))}
        </div>

        <div
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
                  fontSize: 'clamp(1.5rem,3vw,2.25rem)',
                  fontWeight: 500,
                  letterSpacing: '-.04em',
                  color: 'var(--n-100)',
                  lineHeight: 1,
                }}
              >
                {f.value}
              </div>
              <div
                style={{
                  fontSize: '.875rem',
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
                    fontSize: '.75rem',
                    letterSpacing: '.04em',
                    textTransform: 'uppercase',
                    color: 'var(--n-40)',
                    width: '2.25rem',
                    textAlign: 'right',
                  }}
                >
                  {row.year}
                </div>
                <div
                  style={{
                    position: 'absolute',
                    left: '-.35rem',
                    top: '.35rem',
                    width: 6,
                    height: 6,
                    background: 'var(--n-30)',
                    borderRadius: '50%',
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
                  {row.i18n[locale].items.map((item, ii) => (
                    <span
                      key={ii}
                      style={{ fontSize: '.9375rem', color: 'var(--n-70)', lineHeight: 1.4 }}
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
