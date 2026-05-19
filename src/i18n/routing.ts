import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['de', 'en'],
  defaultLocale: 'de',
  // Always prefix so `/` redirects to `/de` (spec §3.3).
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];
