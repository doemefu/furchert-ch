import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { isLocale } from '@/i18n/routing';
import { Link, getPathname } from '@/i18n/navigation';
import { Icon } from '@/components/ui/Icon';
import { Tag } from '@/components/ui/Tag';
import { PageHeader } from '@/components/ui/PageHeader';
import { PROJECTS, STATUS_COLOR, STATUS_LABEL } from '@/data/projects';

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
    title: `${t('pages.projects.headerTitle')} — furchert.ch`,
    description: t('pages.projects.headerSub'),
    alternates: {
      languages: {
        de: HOST + getPathname({ locale: 'de', href: '/projects' }),
        en: HOST + getPathname({ locale: 'en', href: '/projects' }),
      },
    },
  };
}

export default async function ProjectsPage({
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
          label={t('pages.projects.headerLabel')}
          title={t('pages.projects.headerTitle')}
          sub={t('pages.projects.headerSub')}
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            borderTop: '1px solid rgba(162,167,176,.22)',
          }}
        >
          {PROJECTS.map((p) => (
            <Link
              key={p.slug}
              href={`/projects/${p.slug}`}
              className="hover-card"
              style={{
                padding: '2rem',
                borderRight: '1px solid rgba(162,167,176,.22)',
                borderBottom: '1px solid rgba(162,167,176,.22)',
                // Prototype pages.jsx:417 — flex column with gap; tag row
                // uses marginTop:'auto' so the "Details →" line sits at the
                // bottom of unequal-height cards. Faithful, do not "fix".
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: '2rem',
                    height: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(162,167,176,.35)',
                    background: 'var(--n-10)',
                  }}
                >
                  <Icon name={p.icon} size={14} />
                </div>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '.65rem',
                    letterSpacing: '.06em',
                    textTransform: 'uppercase',
                    padding: '.2rem .5rem',
                    border: `1px solid ${STATUS_COLOR[p.status]}`,
                    borderRadius: '2px',
                    color: STATUS_COLOR[p.status],
                  }}
                >
                  {STATUS_LABEL[locale][p.status]}
                </span>
              </div>
              <div>
                <div
                  style={{
                    fontFamily: 'var(--sans)',
                    fontSize: '1.05rem',
                    fontWeight: 500,
                    letterSpacing: '-.02em',
                    color: 'var(--n-100)',
                    marginBottom: '.4rem',
                  }}
                >
                  {p.title}
                </div>
                <p
                  style={{
                    fontSize: '.875rem',
                    color: 'var(--n-60)',
                    lineHeight: 1.5,
                    letterSpacing: '-.01em',
                  }}
                >
                  {p.i18n[locale].summary}
                </p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem', marginTop: 'auto' }}>
                {p.tags.slice(0, 4).map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
                {p.tags.length > 4 && <Tag>+{p.tags.length - 4}</Tag>}
              </div>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '.72rem',
                  letterSpacing: '.04em',
                  textTransform: 'uppercase',
                  color: 'var(--blue-base)',
                }}
              >
                {t('pages.projects.details')}
              </div>
            </Link>
          ))}
        </div>
        <div style={{ padding: '2.5rem 0' }}>
          <a
            href="https://github.com/doemefu"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '.5rem',
              fontFamily: 'var(--mono)',
              fontSize: '.8125rem',
              letterSpacing: '.04em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              color: 'var(--blue-base)',
            }}
          >
            <Icon name="github" size={14} /> {t('pages.projects.allRepos')} <Icon name="ext" size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
