import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { isLocale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { Icon } from '@/components/ui/Icon';
import { StatusLabel } from '@/components/ui/StatusDot';
import { Tag } from '@/components/ui/Tag';
import { PageHeader } from '@/components/ui/PageHeader';
import { PROJECTS, PROJECT_DOT, STATUS_LABEL } from '@/data/projects';
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
    href: '/projects',
    title: t('pages.projects.metaTitle'),
    description: t('pages.projects.metaDescription'),
  });
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
          className="cell-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, max(360px, 33.333%)), 1fr))',
          }}
        >
          {PROJECTS.map((p) => (
            <Link
              key={p.slug}
              href={`/projects/${p.slug}`}
              data-track={trackAttr('link', `project-card-${p.slug}`)}
              className="hover-card"
              style={{
                padding: '2rem var(--card-px)',
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
                <StatusLabel status={PROJECT_DOT[p.status]}>{STATUS_LABEL[locale][p.status]}</StatusLabel>
              </div>
              <div>
                <div
                  style={{
                    fontFamily: 'var(--sans)',
                    fontSize: 'var(--fs-18)',
                    fontWeight: 500,
                    letterSpacing: 0,
                    color: 'var(--n-100)',
                    marginBottom: '.5rem',
                  }}
                >
                  {p.title}
                </div>
                <p
                  style={{
                    fontSize: 'var(--fs-14)',
                    color: 'var(--n-60)',
                    lineHeight: 1.5,
                    letterSpacing: 0,
                  }}
                >
                  {p.i18n[locale].summary}
                </p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.25rem', marginTop: 'auto' }}>
                {p.tags.slice(0, 4).map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
                {p.tags.length > 4 && <Tag>+{p.tags.length - 4}</Tag>}
              </div>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 'var(--fs-12)',
                  letterSpacing: '.05em',
                  textTransform: 'uppercase',
                  color: 'var(--blue-base)',
                }}
              >
                {t('pages.projects.details')}
              </div>
            </Link>
          ))}
          <a
            href="https://github.com/doemefu"
            target="_blank"
            rel="noopener noreferrer"
            className="hover-card"
            style={{
              padding: '2rem var(--card-px)',
              borderRight: '1px solid rgba(162,167,176,.22)',
              borderBottom: '1px solid rgba(162,167,176,.22)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              fontFamily: 'var(--mono)',
              fontSize: 'var(--fs-13)',
              color: 'var(--blue-base)',
            }}
          >
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
              <Icon name="github" size={14} />
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}>
              {t('pages.projects.allRepos')} <Icon name="ext" size={12} />
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
