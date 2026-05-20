import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getPathname } from '@/i18n/navigation';
import { PROJECTS } from '@/data/projects';

// Localized sitemap per the next-intl pattern (getPathname + alternates).
// Excludes /dashboard (private), /automation/scan (clearly-labelled
// visual mockup; also carries `robots:noindex` in its page metadata),
// and /api — by listing only the real public paths explicitly.
const HOST = 'https://furchert.ch';

const PUBLIC_PATHS: string[] = [
  '/',
  '/about',
  '/it',
  // /automation is real product (landing). /automation/scan is a clearly
  // labelled visual mockup with `robots: noindex` set on the page; it is
  // intentionally NOT included here (worklog A4 / F-Q1 / F5).
  '/automation',
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
