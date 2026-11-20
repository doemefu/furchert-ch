import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { routing, isLocale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/ui/Icon';
import { StatusLabel } from '@/components/ui/StatusDot';
import { Tag } from '@/components/ui/Tag';
import { Btn } from '@/components/ui/Btn';
import { PROJECTS, PROJECT_DOT, STATUS_LABEL } from '@/data/projects';
import { LAB_CONTENT_UPDATED } from '@/data/homelab-lab';
import { buildHomelabJsonLd, serializeJsonLd } from '@/lib/seo/jsonLd';
import { buildPageMetadata, localizedUrl, ownerTitle } from '@/lib/seo/metadata';
import { HomelabSections } from './HomelabSections';
import { trackAttr } from '@/data/track-ids';

// Static params: locale × slug (the parent [locale] layout composes locales).
// `dynamicParams = false`: an unknown slug is a plain 404, never rendered on
// demand. Otherwise every made-up slug writes ~180 KB to Next's on-disk route
// cache, an unbounded disk-fill vector under the pod's size-limited
// emptyDir (#78).
export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    PROJECTS.map((p) => ({ locale, slug: p.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const project = PROJECTS.find((p) => p.slug === slug);
  if (!project || !isLocale(locale)) return {};
  const href = `/projects/${slug}`;
  // The homelab page is also the public showcase + live status: own title and
  // description (search intent). Other projects use their name and summary.
  if (slug === 'homelab') {
    const t = await getTranslations({ locale, namespace: 'pages.lab' });
    return buildPageMetadata({
      locale,
      href,
      title: ownerTitle(t('metaTitle')),
      description: t('metaDescription'),
    });
  }
  return buildPageMetadata({
    locale,
    href,
    title: ownerTitle(project.title),
    description: project.i18n[locale].summary,
  });
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();

  const p = PROJECTS.find((pr) => pr.slug === slug);
  if (!p) notFound();

  return (
    <div>
      {p.slug === 'homelab' && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(
              buildHomelabJsonLd({
                locale,
                pageUrl: localizedUrl(locale, `/projects/${p.slug}`),
                name: p.title,
                description: p.i18n[locale].detail,
                dateModified: LAB_CONTENT_UPDATED,
              }),
            ),
          }}
        />
      )}
      <div className="container border-x">
        <div className="pj-crumb">
          <Link
            href="/projects"
            data-track={trackAttr('link', 'project-back')}
            className="text-link text-link-block"
          >
            {t('pages.projects.crumbBack')}
          </Link>
          <span aria-hidden="true">/</span>
          <span>{p.title}</span>
        </div>

        <div className="ph">
          <h1 className="ph-title">{p.title}</h1>
          <p className="ph-status">
            <StatusLabel status={PROJECT_DOT[p.status]}>{STATUS_LABEL[locale][p.status]}</StatusLabel>
          </p>
          <p className="ph-sub">{p.i18n[locale].detail}</p>
        </div>

        <div className="pj-sec">
          <h2 className="sl">{t('pages.projects.techStack')}</h2>
          <div className="pg-tags">
            {p.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        </div>

        {p.slug === 'homelab' && <HomelabSections locale={locale} />}

        <div className="pg-acts">
          {p.github && (
            <Btn href={p.github}>
              <Icon name="github" size={14} /> GitHub <span className="sr-only">{t('common.newTab')}</span>
            </Btn>
          )}
          <Btn href="/projects" track={trackAttr('link', 'project-back')}>
            {t('pages.projects.backAll')}
          </Btn>
        </div>
      </div>
    </div>
  );
}
