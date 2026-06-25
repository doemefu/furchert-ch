import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { routing, isLocale } from '@/i18n/routing';
import { Link, getPathname } from '@/i18n/navigation';
import { Icon } from '@/components/ui/Icon';
import { Tag } from '@/components/ui/Tag';
import { Btn } from '@/components/ui/Btn';
import { PROJECTS, STATUS_COLOR, STATUS_LABEL } from '@/data/projects';

const HOST = 'https://furchert.ch';

// Static params: locale × slug (the parent [locale] layout composes locales).
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
  return {
    title: `${project.title} — furchert.ch`,
    description: project.i18n[locale].summary,
    alternates: {
      languages: {
        de: HOST + getPathname({ locale: 'de', href: `/projects/${slug}` }),
        en: HOST + getPathname({ locale: 'en', href: `/projects/${slug}` }),
        'x-default': HOST + getPathname({ locale: 'de', href: `/projects/${slug}` }),
      },
    },
  };
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
      <div className="container border-x">
        <div
          style={{
            padding: '2rem 0',
            borderBottom: '1px solid rgba(162,167,176,.22)',
            display: 'flex',
            alignItems: 'center',
            gap: '.75rem',
          }}
        >
          <Link
            href="/projects"
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '.75rem',
              letterSpacing: '.04em',
              textTransform: 'uppercase',
              color: 'var(--blue-base)',
              textDecoration: 'none',
            }}
          >
            ← {t('pages.projects.crumbBack')}
          </Link>
          <span style={{ color: 'var(--n-30)' }}>/</span>
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '.75rem',
              letterSpacing: '.04em',
              textTransform: 'uppercase',
              color: 'var(--n-60)',
            }}
          >
            {p.title}
          </span>
        </div>

        <div style={{ padding: '3rem 0', borderBottom: '1px solid rgba(162,167,176,.22)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
            }}
          >
            <h1
              style={{
                fontFamily: 'var(--sans)',
                fontSize: 'clamp(1.8rem,4vw,2.75rem)',
                fontWeight: 500,
                letterSpacing: '-.03em',
                color: 'var(--n-100)',
              }}
            >
              {p.title}
            </h1>
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '.7rem',
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                padding: '.2rem .6rem',
                background: 'transparent',
                border: `1px solid ${STATUS_COLOR[p.status]}`,
                borderRadius: '2px',
                color: STATUS_COLOR[p.status],
              }}
            >
              {STATUS_LABEL[locale][p.status]}
            </span>
          </div>
          <p style={{ fontSize: '1.1rem', color: 'var(--n-60)', lineHeight: 1.55, maxWidth: '60ch' }}>
            {p.i18n[locale].detail}
          </p>
        </div>

        <div style={{ padding: '2rem 0', borderBottom: '1px solid rgba(162,167,176,.22)' }}>
          <p
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '.8125rem',
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              color: 'var(--n-50)',
              marginBottom: '1rem',
            }}
          >
            {t('pages.projects.techStack')}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
            {p.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        </div>

        <div style={{ padding: '2rem 0', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {p.github && (
            <Btn href={p.github}>
              <Icon name="github" size={14} /> GitHub <Icon name="ext" size={12} />
            </Btn>
          )}
          <Btn href="/projects">{t('pages.projects.backAll')}</Btn>
        </div>
      </div>
    </div>
  );
}
