import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getPathname } from '@/i18n/navigation';
import { PROJECTS } from '@/data/projects';

// Localized sitemap per the next-intl pattern (getPathname + alternates).
// Excludes /dashboard (private), /automation (Phase 3) and /api by listing
// only the public paths explicitly (worklog F6).
const HOST = 'https://furchert.ch';

const PUBLIC_PATHS: string[] = [
  '/',
  '/about',
  '/it',
  '/rowing',
  '/projects',
  '/contact',
  ...PROJECTS.map((p) => `/projects/${p.slug}`),
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_PATHS.map((href) => ({
    url: HOST + getPathname({ locale: routing.defaultLocale, href }),
    lastModified,
    alternates: {
      languages: {
        de: HOST + getPathname({ locale: 'de', href }),
        en: HOST + getPathname({ locale: 'en', href }),
      },
    },
  }));
}
