import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['de', 'en'],
  defaultLocale: 'de',
  // Always prefix so `/` redirects to `/de` (spec §3.3).
  localePrefix: 'always',
  // No hreflang `Link` response header: the page HTML and the sitemap carry
  // hreflang (src/lib/seo/metadata.ts). The header named the unprefixed URL
  // as x-default and so contradicted them.
  alternateLinks: false,
});

export type Locale = (typeof routing.locales)[number];

// Type guard for narrowing a route `locale` param to `Locale`.
// (next-intl 3.26.4 does not export `hasLocale`; this is the local
// equivalent — worklog F1.)
export function isLocale(value: string): value is Locale {
  return (routing.locales as readonly string[]).includes(value);
}
