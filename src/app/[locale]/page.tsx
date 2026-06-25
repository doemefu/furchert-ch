import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { isLocale } from '@/i18n/routing';
import { Link, getPathname } from '@/i18n/navigation';
import { Icon } from '@/components/ui/Icon';
import { Btn } from '@/components/ui/Btn';
import { CTAStrip } from '@/components/ui/CTAStrip';
import { Ticker } from '@/components/layout/Ticker';
import { EXPERIENCE } from '@/data/experience';
import { ENGAGEMENT } from '@/data/engagement';
import { HOME_STATS } from '@/data/home-stats';

const HOST = 'https://furchert.ch';
const DOTS =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18'%3E%3Ccircle cx='1' cy='1' r='1' fill='%23a2a7b0' opacity='.3'/%3E%3C/svg%3E\")";

const labelMono = {
  fontFamily: 'var(--mono)',
  fontSize: '.8125rem',
  letterSpacing: '.06em',
  textTransform: 'uppercase' as const,
  color: 'var(--n-50)',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale });
  return {
    title: 'furchert.ch — Dominic Furchert',
    description: t('hero.sub'),
    alternates: {
      languages: {
        de: HOST + getPathname({ locale: 'de', href: '/' }),
        en: HOST + getPathname({ locale: 'en', href: '/' }),
        'x-default': HOST + getPathname({ locale: 'de', href: '/' }),
      },
    },
    openGraph: {
      title: 'furchert.ch — Dominic Furchert',
      description: t('hero.sub'),
      url: HOST + getPathname({ locale, href: '/' }),
      locale,
      type: 'website',
    },
  };
}

const iconMap: Record<string, string> = {
  it: 'code',
  rowing: 'boat',
  projects: 'server',
  automation: 'spark',
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

  const teaserKeys = ['it', 'rowing', 'projects', 'automation'] as const;

  return (
    <div>
      {/* HERO — note: layout <main> already supplies paddingTop:var(--header-h),
          so (unlike the prototype) we do NOT repeat it here (worklog F2). */}
      <section style={{ minHeight: '100svh', background: 'var(--n-10)' }}>
        <div className="container border-x">
          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '2rem',
              padding: '5rem 1.5rem 4rem',
            }}
          >
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
            <p style={{ ...labelMono, position: 'relative' }}>{t('hero.label')}</p>
            <h1
              style={{
                fontFamily: 'var(--sans)',
                fontSize: 'clamp(2.4rem, 7vw, 4.75rem)',
                fontWeight: 500,
                letterSpacing: '-.04em',
                lineHeight: 1,
                maxWidth: '22ch',
                textWrap: 'balance',
                position: 'relative',
              }}
            >
              <span style={{ color: 'var(--n-100)' }}>{t('hero.title1')}</span>
              <span style={{ color: 'var(--n-50)' }}>{t('hero.title2')}</span>
            </h1>
            <p
              style={{
                fontFamily: 'var(--sans)',
                fontSize: 'clamp(1rem, 1.4vw, 1.375rem)',
                color: 'var(--n-60)',
                maxWidth: '52ch',
                textWrap: 'balance',
                lineHeight: 1.45,
                letterSpacing: '-.02em',
                position: 'relative',
              }}
            >
              {t('hero.sub')}
            </p>
            <div
              style={{
                display: 'flex',
                gap: '.875rem',
                flexWrap: 'wrap',
                justifyContent: 'center',
                position: 'relative',
                marginTop: '.5rem',
              }}
            >
              <Btn href="/automation" dark>
                {t('hero.cta2')} <Icon name="arrow" size={12} />
              </Btn>
              <Btn href="/projects">
                {t('hero.seeProjects')} <Icon name="arrow" size={12} />
              </Btn>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              borderTop: '1px solid rgba(162,167,176,.22)',
            }}
          >
            <div
              style={{
                padding: '3rem 2rem',
                borderRight: '1px solid rgba(162,167,176,.22)',
                borderBottom: '1px solid rgba(162,167,176,.22)',
              }}
            >
              <p style={{ ...labelMono, color: 'var(--n-40)', marginBottom: '1.5rem' }}>
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
                        marginTop: '.45rem',
                        width: '.5rem',
                        height: '.5rem',
                        background: 'var(--n-30)',
                      }}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: '1rem',
                          fontWeight: 500,
                          color: 'var(--n-100)',
                          lineHeight: 1.2,
                          letterSpacing: '-.02em',
                        }}
                      >
                        {e.title}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '.72rem',
                          textTransform: 'uppercase',
                          letterSpacing: '.04em',
                          color: 'var(--n-50)',
                          marginTop: '.2rem',
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
              style={{
                padding: '3rem 2rem',
                borderBottom: '1px solid rgba(162,167,176,.22)',
              }}
            >
              <p style={{ ...labelMono, color: 'var(--n-40)', marginBottom: '1.5rem' }}>
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
                        marginTop: '.45rem',
                        width: '.5rem',
                        height: '.5rem',
                        background: 'var(--n-30)',
                      }}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: '1rem',
                          fontWeight: 500,
                          color: 'var(--n-100)',
                          lineHeight: 1.2,
                          letterSpacing: '-.02em',
                        }}
                      >
                        {e.title}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '.72rem',
                          textTransform: 'uppercase',
                          letterSpacing: '.04em',
                          color: 'var(--n-50)',
                          marginTop: '.2rem',
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

      <Ticker />

      <section style={{ background: 'var(--white)' }}>
        <div className="container border-x">
          <div style={{ padding: '4rem 0 2.5rem', borderBottom: '1px solid rgba(162,167,176,.22)' }}>
            <p style={{ ...labelMono, marginBottom: '1rem' }}>{t('pages.home.areas')}</p>
            <h2
              style={{
                fontFamily: 'var(--sans)',
                fontSize: 'clamp(1.8rem, 4vw, 3rem)',
                fontWeight: 500,
                letterSpacing: '-.03em',
                color: 'var(--n-100)',
                maxWidth: '22ch',
              }}
            >
              {t('pages.home.areasTitle')}
            </h2>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              borderTop: '1px solid rgba(162,167,176,.22)',
            }}
          >
            {teaserKeys.map((key) => (
              <Link
                key={key}
                href={`/${key}`}
                className="hover-card"
                style={{
                  padding: '2.5rem 2rem',
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
                    fontSize: '1.125rem',
                    fontWeight: 500,
                    letterSpacing: '-.02em',
                    color: 'var(--n-100)',
                    marginBottom: '.5rem',
                  }}
                >
                  {t(`teasers.${key}.title`)}
                </div>
                <p
                  style={{
                    fontSize: '.9375rem',
                    color: 'var(--n-60)',
                    lineHeight: 1.5,
                    letterSpacing: '-.01em',
                  }}
                >
                  {t(`teasers.${key}.text`)}
                </p>
                <div
                  style={{
                    marginTop: '1.5rem',
                    fontFamily: 'var(--mono)',
                    fontSize: '.75rem',
                    letterSpacing: '.04em',
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
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            }}
          >
            {HOME_STATS.map((s, i) => (
              <div
                key={i}
                style={{
                  padding: '2.5rem 1.75rem',
                  borderRight: '1px solid rgba(162,167,176,.22)',
                  borderBottom: '1px solid rgba(162,167,176,.22)',
                }}
              >
                <div style={{ ...labelMono, fontSize: '.75rem', letterSpacing: '.05em', marginBottom: '.3rem' }}>
                  {s.i18n[locale].unit}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--sans)',
                    fontSize: 'clamp(2rem, 4vw, 3rem)',
                    fontWeight: 500,
                    letterSpacing: '-.04em',
                    color: 'var(--n-100)',
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                </div>
                <div style={{ fontSize: '.875rem', color: 'var(--n-60)', marginTop: '.5rem' }}>
                  {s.i18n[locale].label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTAStrip together={t('cta.together')} togsub={t('cta.togsub')} />
    </div>
  );
}
