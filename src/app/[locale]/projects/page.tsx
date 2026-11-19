import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { isLocale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { buildPageMetadata } from '@/lib/seo/metadata';
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
        <div className="dir-wrap">
          <div className="dir-rows pj-list">
            {PROJECTS.map((p) => (
              <div key={p.slug} className="dir-row">
                <h2 className="dir-title">
                  <Link
                    href={`/projects/${p.slug}`}
                    data-track={trackAttr('link', `project-card-${p.slug}`)}
                    aria-describedby={`dir-go-${p.slug}`}
                  >
                    {p.title}
                  </Link>
                </h2>
                <div className="pj-body">
                  <p className="dir-text">{p.i18n[locale].summary}</p>
                  <div className="pj-tags">
                    {p.tags.slice(0, 4).map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                    {p.tags.length > 4 && <Tag>+{p.tags.length - 4}</Tag>}
                  </div>
                </div>
                <div className="pj-side">
                  <StatusLabel status={PROJECT_DOT[p.status]}>{STATUS_LABEL[locale][p.status]}</StatusLabel>
                  <span className="dir-go" id={`dir-go-${p.slug}`}>
                    {t('pages.projects.details')}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="pj-all">
            <a
              href="https://github.com/doemefu"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link text-link-block"
            >
              {t('pages.projects.allRepos')} <span className="sr-only">{t('pages.projects.newTab')}</span>
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
