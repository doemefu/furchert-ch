// Page metadata for every public page: one place for the URL and locale
// rules (canonical, hreflang, OpenGraph, Twitter). No I/O; `getPathname`
// applies next-intl's routing (`localePrefix: 'always'`).
import type { Metadata } from 'next';
import { routing, type Locale } from '@/i18n/routing';
import { getPathname } from '@/i18n/navigation';
import { SITE_URL } from './jsonLd';

export const SITE_NAME = 'furchert.ch';

/** Document title with the owner's name: "Kontakt | Dominic Furchert" (no em dash, owner rule). */
export function ownerTitle(title: string): string {
  return `${title} | Dominic Furchert`;
}

// Regional OpenGraph locales: the site is written for Switzerland.
export const OG_LOCALE: Record<Locale, string> = { de: 'de_CH', en: 'en_GB' };

/** Absolute URL of a page in one locale, e.g. `/about` → `https://furchert.ch/en/about`. */
export function localizedUrl(locale: Locale, href: string): string {
  return SITE_URL + getPathname({ locale, href });
}

/**
 * hreflang alternates of a page: one per locale, and `x-default` on the
 * default-locale page. The HTML and the sitemap both use this; the
 * middleware's `Link` header is off (`alternateLinks: false` in routing.ts).
 */
export function languageAlternates(href: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) languages[locale] = localizedUrl(locale, href);
  languages['x-default'] = localizedUrl(routing.defaultLocale, href);
  return languages;
}

export interface PageMetadataInput {
  locale: Locale;
  /** Locale-less path of the page, e.g. `/` or `/about`. */
  href: string;
  /** Full document title. */
  title: string;
  description: string;
  /** Keep the page out of search results (links are still followed). */
  noindex?: boolean;
}

export function buildPageMetadata(input: PageMetadataInput): Metadata {
  const { locale, href, title, description } = input;
  const url = localizedUrl(locale, href);
  return {
    title,
    description,
    alternates: { canonical: url, languages: languageAlternates(href) },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title,
      description,
      url,
      locale: OG_LOCALE[locale],
      alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
    },
    twitter: { card: 'summary', title, description },
    ...(input.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
