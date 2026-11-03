import { describe, expect, it } from 'vitest';
import { buildAutomationJsonLd, serializeJsonLd, SITE_URL } from './jsonLd';

const FAQ = [
  { q: 'Was kostet das?', a: 'Das hängt vom Ablauf ab.' },
  { q: 'Brauche ich technisches Wissen?', a: 'Nein.' },
];
const PAGE = `${SITE_URL}/de/automation`;
const input = {
  locale: 'de' as const,
  pageUrl: PAGE,
  name: 'KI für KMU im Zürcher Oberland',
  description: 'Ich helfe KMU im Zürcher Oberland.',
  areaServed: 'Zürcher Oberland',
  faq: FAQ,
  dateModified: '2026-11-03',
};

type Node = Record<string, unknown>;
const graph = (): Node[] => (buildAutomationJsonLd(input)['@graph'] as Node[]);
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

describe('buildAutomationJsonLd', () => {
  it('is a schema.org graph of one WebPage that is also the FAQPage, and the Service', () => {
    const data = buildAutomationJsonLd(input);
    expect(data['@context']).toBe('https://schema.org');
    expect(graph().map((n) => n['@type'])).toEqual([['WebPage', 'FAQPage'], 'Service']);
  });

  it('describes the page once and links it to the service', () => {
    const [page, service] = graph();
    expect(page['@id']).toBe(`${PAGE}#webpage`);
    expect(page.about).toEqual({ '@id': service['@id'] });
    expect(page.mainEntity).toBeDefined();
  });

  it('points every node at the canonical page URL', () => {
    for (const node of graph()) expect(String(node['@id'])).toContain(PAGE);
    const [page, service] = graph();
    expect(page.url).toBe(PAGE);
    expect(service.url).toBe(PAGE);
  });

  it('mirrors the visible FAQ one to one', () => {
    const faq = graph()[0] as Node;
    const entities = faq.mainEntity as Array<{ name: string; acceptedAnswer: { text: string } }>;
    expect(entities.map((e) => [e.name, e.acceptedAnswer.text])).toEqual(
      FAQ.map((f) => [f.q, f.a]),
    );
  });

  it('exposes only name, site URL and public profile links for the owner', () => {
    const service = graph()[1] as Node;
    const provider = service.provider as Node;
    expect(provider['@type']).toBe('Person');
    expect(provider['@id']).toBe(`${SITE_URL}/#person`);
    expect(Object.keys(provider).sort()).toEqual(['@id', '@type', 'name', 'sameAs', 'url']);
    expect(provider.name).toBe('Dominic Furchert');
    expect(provider.url).toBe(SITE_URL);
    expect(provider.sameAs).toEqual([
      'https://github.com/doemefu',
      'https://linkedin.com/in/dominic-furchert',
    ]);
  });

  it('never carries contact data, prices or offers', () => {
    const keys = keysDeep(buildAutomationJsonLd(input));
    for (const forbidden of [
      'email',
      'telephone',
      'address',
      'faxNumber',
      'offers',
      'priceRange',
      'price',
      'aggregateRating',
      'review',
    ]) {
      expect(keys.has(forbidden)).toBe(false);
    }
    expect(JSON.stringify(buildAutomationJsonLd(input))).not.toMatch(/\bCHF\b|@furchert\.ch/);
  });

  it('names the served region and the page language and date', () => {
    const [page, service] = graph();
    expect((service.areaServed as Node).name).toBe('Zürcher Oberland');
    expect(page.inLanguage).toBe('de');
    expect(page.dateModified).toBe('2026-11-03');
  });
});

describe('serializeJsonLd', () => {
  it('cannot break out of a script element', () => {
    const out = serializeJsonLd({ a: '</script><script>alert(1)</script>', b: '\u2028\u2029' });
    expect(out).not.toContain('<');
    expect(out).not.toContain('\u2028');
    expect(out).not.toContain('\u2029');
    expect(JSON.parse(out)).toEqual({
      a: '</script><script>alert(1)</script>',
      b: '\u2028\u2029',
    });
  });
});
