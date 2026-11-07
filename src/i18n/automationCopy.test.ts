import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import de from './messages/de.json';
import en from './messages/en.json';
import { FAQS } from '@/data/automation-faqs';
import { EXAMPLE } from '@/data/automation-example';
import { PRICE_ADDON, PRICE_STEPS } from '@/data/automation-packages';
import { automationJsonLdText, buildAutomationJsonLd } from '@/lib/seo/jsonLd';
import type { Locale } from './routing';

// Copy guardrails for the public /automation page (SME offer). The owner
// approves wording; these tests keep his standing rules from regressing:
// both locales carry the same content, only the prices he approved are
// published (owner decision 2026-11-03), invented examples say so, no
// customer or reference wording, no em dashes or filler words, and the
// English page names Zurich, not the Oberland (owner rule 2026-11-04).

// Every string value inside a nested object or array.
const strings = (value: unknown): string[] => {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
};

const flatten = (value: unknown, prefix = ''): Record<string, string> =>
  Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>(
    (acc, [key, v]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof v === 'string') acc[path] = v;
      else Object.assign(acc, flatten(v, path));
      return acc;
    },
    {},
  );

const messages = { de, en } as const;
const LOCALES: Locale[] = ['de', 'en'];

const pageCopy = (locale: Locale): string[] => [
  ...strings(messages[locale].pages.automation),
  ...strings(FAQS.map((f) => f.i18n[locale])),
  ...strings(EXAMPLE.i18n[locale]),
  ...strings(PRICE_STEPS.map((p) => p.i18n[locale])),
  ...strings(PRICE_ADDON.i18n[locale]),
  messages[locale].teasers.automation.text,
];
const allCopy = [...pageCopy('de'), ...pageCopy('en')];

const faqCost = (locale: Locale) =>
  FAQS.map((f) => f.i18n[locale]).find((f) => /kostet|cost/i.test(f.q))?.a ?? '';

// Owner decision 2026-11-03 ("Vorschlag so zeigen"). Swiss number format in
// both languages. CHF 500 is the workshop credit towards a trial run; CHF 40
// is the server cost cap included in the care (owner, 2026-11-04).
const APPROVED_AMOUNTS = ["CHF 40", "CHF 190", "CHF 500", "CHF 600", "CHF 1'500", "CHF 2'500", "CHF 6'000"];
// "ab"/"from" prices: never shown without the word in front.
const FROM_AMOUNTS = ["CHF 190", "CHF 2'500", "CHF 6'000"];
// An amount next to a currency word (either side, any thousands separator,
// optional cents), a Swiss "120.–" price, or a bare number with a
// thousands separator.
const AMOUNT = String.raw`\d+(?:['’,.]\d{3})*(?:[.,]\d{1,2})?(?!\d)`;
const CURRENCY = String.raw`(?:CHF|SFr\.?|Fr\.|Franken|francs?)`;
const MONEY = new RegExp(
  `${CURRENCY}\\s*${AMOUNT}|${AMOUNT}\\s*${CURRENCY}|\\d+\\.[–-]|\\d{1,3}(?:['’,]\\d{3})+`,
  'gi',
);

const VAT_SENTENCE: Record<Locale, string> = {
  de: 'Keine Mehrwertsteuer, da nicht mehrwertsteuerpflichtig.',
  en: 'No VAT is charged, as I am not registered for VAT.',
};

describe('automation page copy', () => {
  it('has identical message keys in DE and EN', () => {
    expect(Object.keys(flatten(en.pages.automation)).sort()).toEqual(
      Object.keys(flatten(de.pages.automation)).sort(),
    );
  });

  it('has no empty texts', () => {
    for (const text of allCopy) expect(text.trim()).not.toBe('');
  });

  it('rejects malformed or unapproved prices (guard self-check)', () => {
    const tokensOf = (text: string) => [...text.matchAll(MONEY)].map((m) => m[0].trim());
    for (const bad of ['ab CHF 6000', 'ab CHF 1900 pro Monat', 'CHF 2,500', '500 Franken', '120.–']) {
      const tokens = tokensOf(bad);
      expect(tokens.length, bad).toBeGreaterThan(0);
      expect(tokens.every((t) => APPROVED_AMOUNTS.includes(t)), bad).toBe(false);
    }
    for (const good of ["ab CHF 2'500,", 'kostet CHF 600;']) {
      expect(tokensOf(good).every((t) => APPROVED_AMOUNTS.includes(t)), good).toBe(true);
    }
  });

  it('publishes only the approved prices, in one format', () => {
    for (const text of allCopy) {
      expect(text, text).not.toMatch(/CHF\s?[\d'’]+\.[–-]/);
      for (const [token] of text.matchAll(MONEY)) {
        expect(APPROVED_AMOUNTS, `${token} in: ${text}`).toContain(token.trim());
      }
      expect(text).not.toMatch(/\bEUR\b|€|\$/);
    }
  });

  it('shows "from" prices only with "ab" or "from" in front', () => {
    for (const text of allCopy) {
      for (const amount of FROM_AMOUNTS) {
        let at = text.indexOf(amount);
        while (at !== -1) {
          const before = text.slice(0, at);
          expect(before, `${amount} in: ${text}`).toMatch(/(?:\bab|\bfrom) $/);
          at = text.indexOf(amount, at + amount.length);
        }
      }
    }
  });

  it('mentions CHF 40 only as the included server cost cap', () => {
    for (const text of allCopy) {
      if (text.includes('CHF 40')) {
        expect(text).toMatch(/bis CHF 40 pro Monat inbegriffen|up to CHF 40 a month included/);
      }
    }
    const care = PRICE_STEPS.find((p) => p.id === 'care');
    expect(strings(care?.i18n.de).join(' ')).toContain('CHF 40');
    expect(strings(care?.i18n.en).join(' ')).toContain('CHF 40');
  });

  it('mentions CHF 500 only as a credit', () => {
    for (const text of allCopy) {
      for (const sentence of text.split(/(?<=[.!?])\s+/)) {
        if (sentence.includes('CHF 500')) expect(sentence).toMatch(/angerechnet|credited/);
      }
    }
  });

  it('publishes no hourly or daily rate', () => {
    for (const text of allCopy) {
      expect(text).not.toMatch(/CHF\s?[\d']+\s*(?:\/|pro|per|an|a)\s*(?:h\b|Std|Stunde|hour|Tag|day)/i);
      expect(text).not.toMatch(/Stundenansatz|Stundensatz|Stundenlohn|Tagessatz|Tagesansatz|hourly rate|day rate|daily rate/i);
    }
  });

  it('words the VAT status as not VAT-registered, never as net plus VAT', () => {
    for (const text of allCopy) {
      expect(text).not.toMatch(/zzgl\.|exkl\.|inkl\.\s*MWST|ohne MWST|plus VAT|excl\.?\s*VAT|incl\.?\s*VAT/i);
    }
    for (const locale of LOCALES) {
      expect(messages[locale].pages.automation.priceFootnote).toContain(VAT_SENTENCE[locale]);
      expect(faqCost(locale)).toContain(VAT_SENTENCE[locale]);
    }
  });

  it('keeps prices out of the hero name and sentence (they feed the JSON-LD)', () => {
    for (const locale of LOCALES) {
      const { heroLabel, heroSub } = messages[locale].pages.automation;
      expect(`${heroLabel} ${heroSub}`).not.toMatch(/CHF/);
    }
  });

  it('uses no em dash, no spaced dash and no filler word', () => {
    for (const text of allCopy) {
      expect(text, text).not.toContain('—');
      expect(text, text).not.toMatch(/\s–\s/);
      expect(text, text).not.toMatch(/wiederkehrend|recurring/i);
    }
  });

  it('uses Swiss spelling in German (no ß)', () => {
    for (const text of pageCopy('de')) expect(text, text).not.toContain('ß');
  });

  it('names Zurich, not the Oberland, in English (owner rule 2026-11-04)', () => {
    for (const text of pageCopy('en')) expect(text, text).not.toMatch(/Oberland/);
    expect(en.pages.automation.areaServed).toMatch(/Zurich/);
    expect(de.pages.automation.areaServed).toBe('Zürcher Oberland');
  });

  it('does not mention customers, references or the fire brigade', () => {
    for (const text of allCopy) {
      expect(text).not.toMatch(/feuerwehr|firefight|fire brigade|fire department/i);
      expect(text).not.toMatch(/referenz|reference|testimonial|kundenstimme|zufriedene/i);
    }
  });

  it('has no photo placeholder in the about box (owner decision 8, #130)', () => {
    expect(de.pages.automation).not.toHaveProperty('aboutMiniPhotoCaption');
    expect(en.pages.automation).not.toHaveProperty('aboutMiniPhotoCaption');
  });
});

describe('automation offer in llms.txt', () => {
  const llms = readFileSync(join(process.cwd(), 'public', 'llms.txt'), 'utf8');

  it('names only approved prices, "from" prices with "from"', () => {
    const tokens = [...llms.matchAll(MONEY)].map((m) => m[0].trim());
    expect(tokens.length).toBeGreaterThan(0);
    for (const token of tokens) expect(APPROVED_AMOUNTS, token).toContain(token);
    for (const amount of FROM_AMOUNTS) {
      let at = llms.indexOf(amount);
      while (at !== -1) {
        expect(llms.slice(0, at), amount).toMatch(/(?:\bab|\bfrom) $/);
        at = llms.indexOf(amount, at + amount.length);
      }
    }
  });
});

describe('automation before/after example', () => {
  it('says it is an invented example', () => {
    expect(EXAMPLE.i18n.de.tag).toMatch(/Beispiel/);
    expect(EXAMPLE.i18n.de.tag).toMatch(/erfunden/);
    expect(EXAMPLE.i18n.en.tag).toMatch(/example/i);
    expect(EXAMPLE.i18n.en.tag).toMatch(/invented/i);
  });

  it('has the same fields and lines in both languages, with marks to check', () => {
    const { de: d, en: e } = EXAMPLE.i18n;
    expect(d.fields.length).toBeGreaterThanOrEqual(4);
    expect(e.fields.map((f) => f.lines.length)).toEqual(d.fields.map((f) => f.lines.length));
    expect(d.fields.flatMap((f) => f.lines).filter((l) => l.check).length).toBeGreaterThan(0);
    expect(e.fields.flatMap((f) => f.lines.map((l) => Boolean(l.check)))).toEqual(
      d.fields.flatMap((f) => f.lines.map((l) => Boolean(l.check))),
    );
  });
});

describe('automation packages', () => {
  const byId = (id: string) => PRICE_STEPS.find((p) => p.id === id);

  it('lists the four steps in order and the workshop as an add-on', () => {
    expect(PRICE_STEPS.map((p) => p.id)).toEqual(['first-call', 'quick-check', 'trial', 'care']);
    expect(PRICE_ADDON.id).toBe('workshop');
  });

  it('shows exactly the approved prices', () => {
    expect(byId('first-call')?.i18n.de.price).toBe('kostenlos');
    expect(byId('first-call')?.i18n.en.price).toBe('free');
    expect(byId('quick-check')?.i18n.de.price).toBe('CHF 600');
    expect(byId('quick-check')?.i18n.en.price).toBe('CHF 600');
    expect(byId('trial')?.i18n.de.price).toBe("ab CHF 2'500");
    expect(byId('trial')?.i18n.en.price).toBe("from CHF 2'500");
    expect(byId('trial')?.i18n.de.priceNote).toContain("ab CHF 6'000");
    expect(byId('trial')?.i18n.en.priceNote).toContain("from CHF 6'000");
    expect(byId('care')?.i18n.de.price).toBe('ab CHF 190 pro Monat');
    expect(byId('care')?.i18n.en.price).toBe('from CHF 190 a month');
    expect(PRICE_ADDON.i18n.de.price).toBe("CHF 1'500");
    expect(PRICE_ADDON.i18n.en.price).toBe("CHF 1'500");
  });

  it('marks the quick check and the care as optional, nothing else', () => {
    for (const p of PRICE_STEPS) {
      const optional = p.id === 'quick-check' || p.id === 'care';
      expect(Boolean(p.i18n.de.optional), p.id).toBe(optional);
      expect(Boolean(p.i18n.en.optional), p.id).toBe(optional);
    }
  });

  it('credits the quick check and the workshop only within 3 months', () => {
    for (const p of [byId('quick-check'), PRICE_ADDON]) {
      expect(p?.i18n.de.credit).toMatch(/innert 3 Monaten/);
      expect(p?.i18n.en.credit).toMatch(/within 3 months/);
    }
  });

  it('has the same number of inclusions in both languages', () => {
    for (const p of [...PRICE_STEPS, PRICE_ADDON]) {
      expect(p.i18n.en.includes.length, p.id).toBe(p.i18n.de.includes.length);
      expect(Boolean(p.i18n.en.excludes), p.id).toBe(Boolean(p.i18n.de.excludes));
    }
  });

  it('words the care reaction time as a reaction, not a fix', () => {
    expect(strings(byId('care')?.i18n.de).join(' ')).toMatch(/nächsten Arbeitstag[^.]*keine Zusage/);
    expect(strings(byId('care')?.i18n.en).join(' ')).toMatch(/next working day[^.]*not a promise/);
  });
});

describe('automation FAQ', () => {
  it('answers "What does it cost?" with the approved prices', () => {
    for (const [locale, from] of [['de', 'ab'], ['en', 'from']] as const) {
      const answer = faqCost(locale);
      for (const phrase of ['CHF 600', `${from} CHF 2'500`, `${from} CHF 6'000`, `${from} CHF 190`, "CHF 1'500"]) {
        expect(answer, locale).toContain(phrase);
      }
      expect(answer).toMatch(locale === 'de' ? /innert 3 Monaten/ : /within 3 months/);
    }
  });

  it('fills every FAQ entry in both locales', () => {
    expect(FAQS.length).toBeGreaterThan(0);
    for (const faq of FAQS) {
      for (const text of [faq.i18n.de.q, faq.i18n.de.a, faq.i18n.en.q, faq.i18n.en.a]) {
        expect(text.trim()).not.toBe('');
      }
    }
  });
});

describe('automation JSON-LD from the real page copy', () => {
  const FORBIDDEN_KEYS = [
    'email',
    'telephone',
    'address',
    'faxNumber',
    'offers',
    'price',
    'priceRange',
    'priceSpecification',
    'priceCurrency',
    'hasOfferCatalog',
    'makesOffer',
    'aggregateRating',
    'review',
  ];
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

  for (const locale of LOCALES) {
    const m = messages[locale].pages.automation;
    const data = buildAutomationJsonLd({
      locale,
      pageUrl: `https://furchert.ch/${locale}/automation`,
      ...automationJsonLdText(m),
      faq: FAQS.map((f) => f.i18n[locale]),
      dateModified: '2026-11-04',
    });

    it(`${locale}: has no offer, price or contact markup`, () => {
      const keys = keysDeep(data);
      for (const key of FORBIDDEN_KEYS) expect(keys.has(key), key).toBe(false);
    });

    it(`${locale}: carries prices only inside the mirrored FAQ answers`, () => {
      const graph = data['@graph'] as Array<Record<string, unknown>>;
      const withoutAnswers = graph.map((node) =>
        node.mainEntity ? { ...node, mainEntity: '(answers removed)' } : node,
      );
      expect(JSON.stringify(withoutAnswers)).not.toMatch(/CHF/);
      expect(JSON.stringify(data)).toContain('CHF 600');
    });

    if (locale === 'en') {
      it('en: never names the Oberland', () => {
        expect(JSON.stringify(data)).not.toMatch(/Oberland/);
      });
    }
  }
});
