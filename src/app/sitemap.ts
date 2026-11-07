import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { PROJECTS } from '@/data/projects';
import { languageAlternates, localizedUrl } from '@/lib/seo/metadata';
import { PAGE_LAST_MODIFIED } from '@/lib/seo/pages';

// Localized sitemap per the next-intl pattern (default-locale URL +
// language alternates, the same URLs the pages' canonical/hreflang use).
// Excludes /dashboard (private) and /api by listing only the real public paths explicitly.
// <lastmod> is each page's last significant change (src/lib/seo/pages.ts).

const PUBLIC_PATHS: string[] = [
  '/',
  '/about',
  '/it',
  '/automation',
  '/rowing',
  '/projects',
  '/contact',
  '/imprint',
  '/privacy',
  ...PROJECTS.map((p) => `/projects/${p.slug}`),
];

const lastModifiedOf = (href: string): string | undefined =>
  (PAGE_LAST_MODIFIED as Readonly<Record<string, string>>)[href];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((href) => ({
    url: localizedUrl(routing.defaultLocale, href),
    lastModified: lastModifiedOf(href),
    alternates: { languages: languageAlternates(href) },
  }));
}
