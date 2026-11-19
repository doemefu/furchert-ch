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
// Shown in the home hero «Wer» field and on the about page.
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

// Google reads `dateModified` and friends as ISO 8601 date-times (ProfilePage
// docs); a bare date is flagged as invalid. `PAGE_LAST_MODIFIED` stays
// date-only (sitemap lastmod), so the builders convert at serialization time.
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d+)?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

function isRealDate(y: number, m: number, d: number): boolean {
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

// Day of month of the last Sunday of the given month (1-based month).
function lastSunday(year: number, month: number): number {
  const last = new Date(Date.UTC(year, month, 0));
  return last.getUTCDate() - last.getUTCDay();
}

// Europe/Zurich offset at 00:00 local time of a date (EU rules: CEST from the
// last Sunday of March 02:00 to the last Sunday of October 03:00). Midnight of
// the March switch day is still CET, midnight of the October switch day still
// CEST.
function zurichOffsetAtMidnight(y: number, m: number, d: number): string {
  const key = m * 100 + d;
  const summer = key > 300 + lastSunday(y, 3) && key <= 1000 + lastSunday(y, 10);
  return summer ? '+02:00' : '+01:00';
}

// `2026-11-03` becomes `2026-11-03T00:00:00+01:00`; a value that already is a
// date-time is returned unchanged. Anything else throws.
export function toIsoDateTime(value: string): string {
  const dt = DATE_TIME.exec(value);
  if (dt) {
    if (!isRealDate(Number(dt[1]), Number(dt[2]), Number(dt[3]))) {
      throw new Error(`Invalid date-time: ${value}`);
    }
    return value;
  }
  const m = DATE_ONLY.exec(value);
  if (!m) throw new Error(`Invalid date or date-time: ${value}`);
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (!isRealDate(y, mo, d)) throw new Error(`Invalid date: ${value}`);
  return `${value}T00:00:00${zurichOffsetAtMidnight(y, mo, d)}`;
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
        dateModified: toIsoDateTime(input.dateModified),
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
        dateModified: toIsoDateTime(input.dateModified),
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
  /** Visible page label, e.g. "KI für Bau und Tiefbau · Zürcher Oberland". */
  name: string;
  /** Visible hero sentence. */
  description: string;
  /** Region named on the page. */
  areaServed: string;
  /** The FAQ entries the page marks up: visible on the page, without the price FAQ (`faqsForMarkup`). */
  faq: ReadonlyArray<{ q: string; a: string }>;
  /** ISO date of the last content update, shown on the page too. */
  dateModified: string;
}

// The page copy the automation JSON-LD names, in one place so the page and
// its tests build the same input: the visible label, the hero sentence and
// the region (locale-specific: the English page names Zurich).
export function automationJsonLdText(copy: {
  heroLabel: string;
  heroSub: string;
  areaServed: string;
}): Pick<AutomationJsonLdInput, 'name' | 'description' | 'areaServed'> {
  return { name: copy.heroLabel, description: copy.heroSub, areaServed: copy.areaServed };
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
        dateModified: toIsoDateTime(input.dateModified),
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
        dateModified: toIsoDateTime(input.dateModified),
        isPartOf: { '@id': WEBSITE_ID },
        author: personNode(),
      },
    ],
  };
}
