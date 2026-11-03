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
// Shown on the home page ("Software Engineer · Zürcher Oberland") and the about page.
const OWNER_JOB_TITLE = 'Software Engineer';

// Stable `@id`s: every page refers to the same site and the same person, so
// search engines merge the nodes into one entity.
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const PERSON_ID = `${SITE_URL}/#person`;

function personNode(): JsonLd {
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: OWNER_NAME,
    url: SITE_URL,
    sameAs: OWNER_PROFILES,
  };
}

// The full Person node: on the home page and the about page.
function ownerNode(): JsonLd {
  return { ...personNode(), jobTitle: OWNER_JOB_TITLE };
}

// JSON for an inline `<script type="application/ld+json">`: `<` and the two
// JS line terminators are escaped so no value can close the script element.
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export interface PageJsonLdInput {
  locale: Locale;
  /** Canonical absolute URL of the localized page. */
  pageUrl: string;
  /** Page name, e.g. the document title or the visible h1. */
  name: string;
  /** ISO date of the last significant change (src/lib/seo/pages.ts). */
  dateModified: string;
}

// Home page: the WebSite node (Google reads the site name from the home page;
// `/` redirects to `/de`, so both locale home pages carry the same node), the
// localized page and the owner.
export function buildHomeJsonLd(input: PageJsonLdInput & { description: string }): JsonLd {
  const { pageUrl } = input;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        url: `${SITE_URL}/`,
        name: 'furchert.ch',
        alternateName: OWNER_NAME,
        inLanguage: ['de', 'en'],
        publisher: { '@id': PERSON_ID },
      },
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: input.name,
        description: input.description,
        inLanguage: input.locale,
        dateModified: input.dateModified,
        isPartOf: { '@id': WEBSITE_ID },
        about: { '@id': PERSON_ID },
      },
      ownerNode(),
    ],
  };
}

// About page: the owner's profile page, with the Person nested as its main
// entity.
export function buildProfilePageJsonLd(input: PageJsonLdInput): JsonLd {
  const { pageUrl } = input;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfilePage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: input.name,
        inLanguage: input.locale,
        dateModified: input.dateModified,
        isPartOf: { '@id': WEBSITE_ID },
        mainEntity: ownerNode(),
      },
    ],
  };
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
        isPartOf: { '@id': WEBSITE_ID },
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

export interface HomelabJsonLdInput {
  locale: Locale;
  pageUrl: string;
  /** Visible h1. */
  name: string;
  /** Visible lead paragraph. */
  description: string;
  /** ISO date of the last change of the static description. */
  dateModified: string;
}

// A deliberately small description of the page. Live status values are not
// part of it: they change by the minute and are not page metadata.
export function buildHomelabJsonLd(input: HomelabJsonLdInput): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${input.pageUrl}#webpage`,
        url: input.pageUrl,
        name: input.name,
        description: input.description,
        inLanguage: input.locale,
        dateModified: input.dateModified,
        isPartOf: { '@id': WEBSITE_ID },
        author: personNode(),
      },
    ],
  };
}
