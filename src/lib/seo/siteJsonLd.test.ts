import { describe, expect, it } from 'vitest';
import de from '@/i18n/messages/de.json';
import en from '@/i18n/messages/en.json';
import {
  buildAutomationJsonLd,
  buildHomeJsonLd,
  buildHomelabJsonLd,
  buildProfilePageJsonLd,
  PERSON_ID,
  SITE_URL,
  WEBSITE_ID,
  type JsonLd,
} from './jsonLd';

type Node = Record<string, unknown>;
const byType = (data: JsonLd, type: string): Node => {
  const node = (data['@graph'] as Node[]).find((n) => [n['@type']].flat().includes(type));
  if (!node) throw new Error(`no ${type} node`);
  return node;
};
const keysDeep = (value: unknown, acc = new Set<string>()): Set<string> => {
  if (Array.isArray(value)) value.forEach((v) => keysDeep(v, acc));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      acc.add(k);
      keysDeep(v, acc);
    }
  }
  return acc;
};

const home = buildHomeJsonLd({
  locale: 'de',
  pageUrl: `${SITE_URL}/de`,
  name: 'furchert.ch — Dominic Furchert',
  description: 'Ich baue Systeme.',
  dateModified: '2026-11-03',
});
const about = buildProfilePageJsonLd({
  locale: 'en',
  pageUrl: `${SITE_URL}/en/about`,
  name: 'Software Engineer. Club President. Firefighter.',
  dateModified: '2026-11-03',
});
const automation = buildAutomationJsonLd({
  locale: 'de',
  pageUrl: `${SITE_URL}/de/automation`,
  name: 'KI für KMU im Zürcher Oberland',
  description: 'Ich helfe KMU.',
  areaServed: 'Zürcher Oberland',
  faq: [{ q: 'Frage?', a: 'Antwort.' }],
  dateModified: '2026-11-03',
});

describe('site-wide entity ids', () => {
  it('are stable fragment ids on the domain root', () => {
    expect(WEBSITE_ID).toBe('https://furchert.ch/#website');
    expect(PERSON_ID).toBe('https://furchert.ch/#person');
  });
});

describe('buildHomeJsonLd', () => {
  it('names the site and its publisher on the domain root', () => {
    expect(home['@context']).toBe('https://schema.org');
    expect(byType(home, 'WebSite')).toEqual({
      '@type': 'WebSite',
      '@id': WEBSITE_ID,
      url: 'https://furchert.ch/',
      name: 'furchert.ch',
      alternateName: 'Dominic Furchert',
      inLanguage: ['de', 'en'],
      publisher: { '@id': PERSON_ID },
    });
  });

  it('describes the localized home page as part of the site, about the owner', () => {
    expect(byType(home, 'WebPage')).toEqual({
      '@type': 'WebPage',
      '@id': 'https://furchert.ch/de#webpage',
      url: 'https://furchert.ch/de',
      name: 'furchert.ch — Dominic Furchert',
      description: 'Ich baue Systeme.',
      inLanguage: 'de',
      dateModified: '2026-11-03',
      isPartOf: { '@id': WEBSITE_ID },
      about: { '@id': PERSON_ID },
    });
  });

  it('carries the owner with name, site, public profiles and the visible job title only', () => {
    const person = byType(home, 'Person');
    expect(person['@id']).toBe(PERSON_ID);
    expect(Object.keys(person).sort()).toEqual(['@id', '@type', 'jobTitle', 'name', 'sameAs', 'url']);
    expect(person.name).toBe('Dominic Furchert');
    expect(person.url).toBe(SITE_URL);
  });

  it('uses a job title that the home page shows in both languages', () => {
    const jobTitle = String(byType(home, 'Person').jobTitle);
    expect(de.hero.label).toContain(jobTitle);
    expect(en.hero.label).toContain(jobTitle);
  });
});

describe('buildProfilePageJsonLd', () => {
  it('marks the about page as the owner profile', () => {
    const page = byType(about, 'ProfilePage');
    expect(page).toMatchObject({
      '@id': 'https://furchert.ch/en/about#webpage',
      url: 'https://furchert.ch/en/about',
      name: 'Software Engineer. Club President. Firefighter.',
      inLanguage: 'en',
      dateModified: '2026-11-03',
      isPartOf: { '@id': WEBSITE_ID },
    });
    expect(page.mainEntity).toEqual(byType(home, 'Person'));
  });
});

describe('automation page', () => {
  it('belongs to the site and names the same owner', () => {
    expect(byType(automation, 'WebPage').isPartOf).toEqual({ '@id': WEBSITE_ID });
    expect((byType(automation, 'Service').provider as Node)['@id']).toBe(PERSON_ID);
  });
});

describe('homelab page', () => {
  it('belongs to the site', () => {
    const lab = buildHomelabJsonLd({
      locale: 'de',
      pageUrl: `${SITE_URL}/de/projects/homelab`,
      name: 'Homelab Infrastructure as Code',
      description: 'Infrastructure as Code.',
      dateModified: '2026-11-03',
    });
    expect(byType(lab, 'WebPage').isPartOf).toEqual({ '@id': WEBSITE_ID });
  });
});

describe('site-wide JSON-LD', () => {
  it('never carries contact data, prices or offers', () => {
    for (const data of [home, about]) {
      const keys = keysDeep(data);
      for (const forbidden of ['email', 'telephone', 'address', 'faxNumber', 'offers', 'priceRange']) {
        expect(keys.has(forbidden)).toBe(false);
      }
      expect(JSON.stringify(data)).not.toMatch(/\bCHF\b|@furchert\.ch/);
    }
  });
});
