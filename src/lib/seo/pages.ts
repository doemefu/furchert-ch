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
  '/': '2026-11-09',
  '/about': '2026-11-08',
  '/it': '2026-11-08',
  // Construction-first offer, Gate-0 prices, example tiles (#145).
  '/automation': '2026-11-07',
  '/rowing': '2026-11-08',
  '/projects': '2026-11-08',
  // Sie form, call back and source fields (#145, part 2).
  '/contact': '2026-11-07',
  // Legal pages (#16); bump when the copy in src/data/legal.ts changes.
  '/imprint': '2026-11-05',
  '/privacy': '2026-11-07',
  '/projects/iot-platform': '2026-11-08',
  // The page shows this date itself ("Stand der Beschreibung").
  '/projects/homelab': LAB_CONTENT_UPDATED,
  '/projects/club-assist': '2026-11-08',
  '/projects/karaokee': '2026-11-08',
  '/projects/auth-service': '2026-11-08',
} as const satisfies Record<string, `${number}-${number}-${number}`>;
