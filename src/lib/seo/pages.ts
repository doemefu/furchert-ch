import { LAB_CONTENT_UPDATED } from '@/data/homelab-lab';

// Last significant change of every indexable public page (ISO date). The
// sitemap's <lastmod> comes from here, so it must stay accurate: search
// engines ignore lastmod values that are not.
//
// Bump a page's date when its main content, its structured data or the links
// in its content change (Google's definition of a significant change). Changes
// to the shared header or footer do not bump page dates. A new public page
// needs an entry here (src/lib/seo/sitemap.test.ts fails otherwise).
//
// Pages unchanged since the site went public carry the launch date.
export const SITE_LAUNCH_DATE = '2026-06-25';

export const PAGE_LAST_MODIFIED = {
  '/': '2026-11-03',
  '/about': '2026-11-03',
  '/it': SITE_LAUNCH_DATE,
  // Concrete trade stories, an example and the prices (#139).
  '/automation': '2026-11-04',
  '/rowing': SITE_LAUNCH_DATE,
  // The homelab summary in the project list was corrected on 2026-11-03 (#132).
  '/projects': '2026-11-03',
  // Location shown on the page changed to the Zürcher Oberland (owner decision, #136).
  '/contact': '2026-11-03',
  '/projects/iot-platform': SITE_LAUNCH_DATE,
  // The page shows this date itself ("Stand der Beschreibung").
  '/projects/homelab': LAB_CONTENT_UPDATED,
  '/projects/club-assist': SITE_LAUNCH_DATE,
  '/projects/karaokee': SITE_LAUNCH_DATE,
  '/projects/auth-service': SITE_LAUNCH_DATE,
  '/projects/aemtlifyer': SITE_LAUNCH_DATE,
} as const satisfies Record<string, `${number}-${number}-${number}`>;
