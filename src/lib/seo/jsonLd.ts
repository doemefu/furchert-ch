// Page-level JSON-LD (schema.org) for public pages. Pure functions, no I/O.
// Rules: the data must match what the page shows (no hidden claims), and the
// owner appears with name, site URL and public profile links only: no
// e-mail, phone or address (owner decision on the Impressum).
import type { Locale } from '@/i18n/routing';

export const SITE_URL = 'https://furchert.ch';

export type JsonLd = Record<string, unknown>;

const OWNER_NAME = 'Dominic Furchert';
// The same profile links the footer shows.
const OWNER_PROFILES = ['https://github.com/doemefu', 'https://linkedin.com/in/dominic-furchert'];

// Stable `@id` so a later site-wide Person node can be merged with this one.
function personNode(): JsonLd {
  return {
    '@type': 'Person',
    '@id': `${SITE_URL}/#person`,
    name: OWNER_NAME,
    url: SITE_URL,
    sameAs: OWNER_PROFILES,
  };
}

// JSON for an inline `<script type="application/ld+json">`: `<` and the two
// JS line terminators are escaped so no value can close the script element.
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export interface AutomationJsonLdInput {
  locale: Locale;
  /** Canonical absolute URL of the localized page. */
  pageUrl: string;
  /** Visible page label, e.g. "KI für KMU im Zürcher Oberland". */
  name: string;
  /** Visible hero sentence. */
  description: string;
  /** Region named on the page. */
  areaServed: string;
  /** The FAQ exactly as the page renders it. */
  faq: ReadonlyArray<{ q: string; a: string }>;
  /** ISO date of the last content update, shown on the page too. */
  dateModified: string;
}

export function buildAutomationJsonLd(input: AutomationJsonLdInput): JsonLd {
  const { pageUrl } = input;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        // One entity for the page: it is the web page and its FAQ.
        '@type': ['WebPage', 'FAQPage'],
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: input.name,
        description: input.description,
        inLanguage: input.locale,
        dateModified: input.dateModified,
        about: { '@id': `${pageUrl}#service` },
        mainEntity: input.faq.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
      {
        '@type': 'Service',
        '@id': `${pageUrl}#service`,
        url: pageUrl,
        name: input.name,
        description: input.description,
        provider: personNode(),
        areaServed: { '@type': 'Place', name: input.areaServed },
      },
    ],
  };
}
