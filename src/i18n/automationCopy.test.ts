import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import de from './messages/de.json';
import en from './messages/en.json';
import { FAQS, faqsForMarkup } from '@/data/automation-faqs';
import { EXAMPLE } from '@/data/automation-example';
import { PRICE_ADDON, PRICE_STEPS } from '@/data/automation-packages';
import { WOW_TILES } from '@/data/automation-wow';
import { CALC } from '@/data/automation-calc';
import { automationJsonLdText, buildAutomationJsonLd } from '@/lib/seo/jsonLd';
import { PAGE_LAST_MODIFIED } from '@/lib/seo/pages';
import type { Locale } from './routing';

// Copy guardrails for the public /automation page (Gate-0 offer for
// construction firms, #145). The owner approves wording; these tests keep his
// standing rules from regressing: both locales carry the same content, only
// the prices he approved are published, the sample calculation keeps its
// assumptions to itself, invented examples say so, no customer or reference
// wording, no guarantee or savings promise, no em dashes or filler words, and
// the English page names Zurich, not the Oberland (owner rule 2026-11-04).

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

// The structure of a value with every string replaced by "s": two locales
// with the same shape have the same fields, rows and list lengths.
const shape = (value: unknown): unknown => {
  if (typeof value === 'string') return 's';
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)]));
  }
  return value;
};

const messages = { de, en } as const;
const LOCALES: Locale[] = ['de', 'en'];

const pageCopy = (locale: Locale): string[] => [
  ...strings(messages[locale].pages.automation),
  ...strings(FAQS.map((f) => f.i18n[locale])),
  ...strings(WOW_TILES.map((w) => w.i18n[locale])),
  ...strings(EXAMPLE.i18n[locale]),
  ...strings(PRICE_STEPS.map((p) => p.i18n[locale])),
  ...strings(PRICE_ADDON.i18n[locale]),
  messages[locale].teasers.automation.text,
];
const calcCopy = (locale: Locale): string[] => strings(CALC.i18n[locale]);
const allPage = [...pageCopy('de'), ...pageCopy('en')];
const allCalc = [...calcCopy('de'), ...calcCopy('en')];
// The generic checks run on everything; only the amount checks are split.
const allCopy = [...allPage, ...allCalc];

const priceFaq = (locale: Locale) => FAQS[0].i18n[locale].a;

// Owner decision for Gate 0 (L1, 2026-11-07): Standortbestimmung CHF 750; Einführung CHF 3'900 or ab CHF 7'500; Abo CHF 200 or CHF 500 bis 900 pro Monat; own automation ab CHF 8'000, shown once. Swiss number format in both languages.
const APPROVED_AMOUNTS = ["CHF 750", "CHF 3'900", "CHF 7'500", "CHF 200", "CHF 500", "CHF 8'000"];
// "ab"/"from" prices: never shown without the word in front.
const FROM_AMOUNTS = ["CHF 7'500", "CHF 8'000"];
// The sample calculation (src/data/automation-calc.ts) adds its assumptions
// (labour cost, licence) and its sums. They appear nowhere else.
const CALC_AMOUNTS = [
  "CHF 57",
  "CHF 25",
  "CHF 200",
  "CHF 750",
  "CHF 1'200",
  "CHF 2'400",
  "CHF 3'600",
  "CHF 3'900",
  "CHF 7'500",
  "CHF 8'250",
];
const CALC_ONLY = CALC_AMOUNTS.filter((a) => !APPROVED_AMOUNTS.includes(a));
// In the calculation these are rounded results: "rund" / "about" in front.
const CALC_ROUNDED = ["CHF 7'500", "CHF 8'250"];
// An amount next to a currency word (either side, any thousands separator,
// optional cents), a Swiss "120.–" price, or a bare number with a
// thousands separator.
const AMOUNT = String.raw`\d+(?:['’,.]\d{3})*(?:[.,]\d{1,2})?(?!\d)`;
const CURRENCY = String.raw`(?:CHF|SFr\.?|Fr\.|Franken|francs?)`;
const MONEY = new RegExp(
  `${CURRENCY}\\s*${AMOUNT}|${AMOUNT}\\s*${CURRENCY}|\\d+\\.[–-]|\\d{1,3}(?:['’,]\\d{3})+`,
  'gi',
);
const tokensOf = (text: string) => [...text.matchAll(MONEY)].map((m) => m[0].trim());

// The VAT status is an open owner item: the page names the currency and says
// nothing about VAT.
const PRICE_SENTENCE: Record<Locale, string> = {
  de: 'Fixpreise in Franken.',
  en: 'Fixed prices in Swiss francs.',
};
const VAT_WORDS = /Mehrwertsteuer|MWST|MwSt|\bVAT\b|zzgl\.|exkl\.|inkl\.\s*MWST/i;
// No guarantee, no test price, no steering, no team workshop, no savings
// promise, and the strategy word "Ausbau" never in visible copy.
const BANNED =
  /Garantie|garantiert|guarantee|warrant|Testpreis|Steuerung|Workshop|Werkstatt|Sie sparen|you save|Ausbau/i;
const PERSONEN: Record<Locale, string> = {
  de: '«Personen» heisst: alle im Betrieb, Baustelle und Büro zusammen.',
  en: '“People” means everyone at the firm, on site and in the office together.',
};

// Every amount must stand in front of "ab"/"from" (or the given words).
const expectPrefixed = (text: string, amounts: string[], prefix: RegExp) => {
  for (const amount of amounts) {
    let at = text.indexOf(amount);
    while (at !== -1) {
      expect(text.slice(0, at), `${amount} in: ${text}`).toMatch(prefix);
      at = text.indexOf(amount, at + amount.length);
    }
  }
};

// "CHF 500" only as the lower bound of the larger Abo tier.
const expectCHF500OnlyAsTier = (text: string) => {
  const rest = text
    .replaceAll('CHF 500 bis 900 pro Monat', '')
    .replaceAll('CHF 500 to 900 a month', '');
  expect(rest, text).not.toContain('CHF 500');
};

// Price phrases of the steps (`price` and `priceAlt`), per locale.
const pricePhrases = (locale: Locale) =>
  PRICE_STEPS.flatMap((p) => [p.i18n[locale].price, p.i18n[locale].priceAlt ?? '']).filter(Boolean);

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
    for (const bad of [
      'ab CHF 6000',
      'ab CHF 1900 pro Monat',
      'CHF 2,500',
      '500 Franken',
      '120.–',
      'CHF 3’900',
      'CHF 7500',
    ]) {
      const tokens = tokensOf(bad);
      expect(tokens.length, bad).toBeGreaterThan(0);
      expect(tokens.every((t) => APPROVED_AMOUNTS.includes(t)), bad).toBe(false);
    }
    for (const good of ["ab CHF 7'500,", 'kostet CHF 750;']) {
      expect(tokensOf(good).every((t) => APPROVED_AMOUNTS.includes(t)), good).toBe(true);
    }
  });

  it('publishes only the approved prices, in one format', () => {
    for (const text of allPage) {
      expect(text, text).not.toMatch(/CHF\s?[\d'’]+\.[–-]/);
      for (const token of tokensOf(text)) {
        expect(APPROVED_AMOUNTS, `${token} in: ${text}`).toContain(token);
      }
      expect(text).not.toMatch(/\bEUR\b|€|\$/);
    }
  });

  it('keeps the amounts of the sample calculation inside the calculation', () => {
    for (const text of allCalc) {
      expect(text, text).not.toMatch(/CHF\s?[\d'’]+\.[–-]/);
      for (const token of tokensOf(text)) {
        expect(CALC_AMOUNTS, `${token} in: ${text}`).toContain(token);
      }
      expectPrefixed(text, CALC_ROUNDED, /(?:\brund|\babout) $/);
    }
    for (const text of allPage) {
      for (const amount of CALC_ONLY) expect(text, text).not.toContain(amount);
    }
  });

  it('shows "from" prices only with "ab" or "from" in front', () => {
    for (const text of allPage) expectPrefixed(text, FROM_AMOUNTS, /(?:\bab|\bfrom) $/);
  });

  it('mentions CHF 500 only as the lower bound of the larger Abo tier', () => {
    for (const text of allCopy) expectCHF500OnlyAsTier(text);
  });

  it('shows the own automation price once, in its box', () => {
    const withPrice = (locale: Locale) =>
      [...pageCopy(locale), ...calcCopy(locale)].filter((t) => t.includes("CHF 8'000"));
    expect(withPrice('de')).toEqual([PRICE_ADDON.i18n.de.price]);
    expect(withPrice('en')).toEqual([PRICE_ADDON.i18n.en.price]);
  });

  it('publishes no hourly or daily rate', () => {
    for (const text of allCopy) {
      expect(text).not.toMatch(/CHF\s?[\d']+\s*(?:\/|pro|per|an|a)\s*(?:h\b|Std|Stunde|hour|Tag|day)/i);
      expect(text).not.toMatch(/Stundenansatz|Stundensatz|Stundenlohn|Tagessatz|Tagesansatz|hourly rate|day rate|daily rate/i);
    }
  });

  it('names the currency and says nothing about VAT', () => {
    for (const text of allCopy) expect(text, text).not.toMatch(VAT_WORDS);
    for (const locale of LOCALES) {
      expect(messages[locale].pages.automation.priceFootnote).toContain(PRICE_SENTENCE[locale]);
      expect(priceFaq(locale)).toContain(PRICE_SENTENCE[locale]);
    }
  });

  it('promises no guarantee or savings and keeps "Ausbau" out of visible copy', () => {
    for (const text of allCopy) expect(text, text).not.toMatch(BANNED);
    const ids: string[] = [
      ...[...PRICE_STEPS, PRICE_ADDON].map((p) => p.id),
      ...WOW_TILES.flatMap((w) => [w.id, w.kind]),
    ];
    for (const id of ids) expect(id).not.toMatch(/ausbau/i);
  });

  it('words every reply promise as "by the next working day at the latest"', () => {
    for (const text of allCopy) {
      if (text.includes('Arbeitstag')) expect(text, text).toContain('spätestens am nächsten Arbeitstag');
      if (text.includes('working day')) expect(text, text).toContain('by the next working day at the latest');
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
    for (const text of [...pageCopy('de'), ...calcCopy('de')]) expect(text, text).not.toContain('ß');
  });

  it('names Zurich, not the Oberland, in English (owner rule 2026-11-04)', () => {
    for (const text of [...pageCopy('en'), ...calcCopy('en')]) expect(text, text).not.toMatch(/Oberland/);
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

describe('automation example tiles', () => {
  const tags = (locale: Locale) =>
    WOW_TILES.flatMap((w) => {
      const c = w.i18n[locale];
      const panel = c.panel as unknown as Record<string, unknown>;
      return [
        c.kindLabel,
        c.panelTag,
        ...(Array.isArray(panel.sources) ? (panel.sources as string[]) : []),
        ...(typeof panel.foundTag === 'string' ? [panel.foundTag] : []),
      ];
    });

  it('shows the speech, the quote and the overview tile, in this order', () => {
    expect(WOW_TILES.map((w) => w.id)).toEqual(['rapport', 'offerte', 'uebersicht']);
    expect(WOW_TILES.map((w) => w.kind)).toEqual(['ready', 'ready', 'own']);
  });

  it('labels every opened panel as an example', () => {
    for (const w of WOW_TILES) {
      expect(w.i18n.de.panelTag).toMatch(/^Beispiel/);
      expect(w.i18n.en.panelTag).toMatch(/^Example/);
    }
  });

  it('keeps titles on one line and bodies on two (German copy budget)', () => {
    for (const w of WOW_TILES) {
      expect(w.i18n.de.title.length, w.i18n.de.title).toBeLessThanOrEqual(26);
      expect(w.i18n.de.body.length, w.i18n.de.body).toBeLessThanOrEqual(85);
    }
  });

  it('has the same panel structure in both languages', () => {
    for (const w of WOW_TILES) expect(shape(w.i18n.en), w.id).toEqual(shape(w.i18n.de));
  });

  it('keeps every text shown in a tag at 30 characters or less', () => {
    for (const locale of LOCALES) {
      for (const text of [...tags(locale), EXAMPLE.i18n[locale].tag]) {
        expect(text.length, text).toBeLessThanOrEqual(30);
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

describe('automation sample calculation', () => {
  it('is labelled as a sample and never calls time value savings', () => {
    expect(CALC.i18n.de.title).toMatch(/^Beispielrechnung/);
    expect(CALC.i18n.en.title).toMatch(/^Sample calculation/);
    expect(calcCopy('de').join(' ')).toContain('nicht eingesparter Lohn');
    expect(calcCopy('en').join(' ')).toContain('not wages saved');
  });

  it('has the same rows and results in both languages', () => {
    expect(shape(CALC.i18n.en)).toEqual(shape(CALC.i18n.de));
  });

  it('adds up', () => {
    // Minutes a week: 15 daily reports and 4 Regie reports.
    const today = 15 * 15 + 4 * 25;
    const byVoice = 15 * 6 + 4 * 10;
    expect([today, byVoice]).toEqual([325, 130]);
    const hours = Math.floor((today - byVoice) / 60);
    expect(hours).toBe(3);
    expect(CALC.i18n.de.results[0]).toContain(`rund ${hours} Stunden`);
    expect(CALC.i18n.en.results[0]).toContain(`about ${hours} hours`);
    // Time value, rounded to the nearest CHF 500: 3 × 44 × 57 = 7'524.
    expect(Math.round((hours * 44 * 57) / 500) * 500).toBe(7500);
    // Year one: assessment, rollout, 12 months of the Abo, 4 licences.
    expect(750 + 3900 + 12 * 200 + 4 * 12 * 25).toBe(8250);
    expect(12 * 200 + 4 * 12 * 25).toBe(3600);
    for (const locale of LOCALES) {
      const text = calcCopy(locale).join(' ');
      for (const amount of ["CHF 7'500", "CHF 2'400", "CHF 1'200", "CHF 8'250", "CHF 3'600"]) {
        expect(text, amount).toContain(amount);
      }
    }
  });
});

describe('automation packages', () => {
  const byId = (id: string) => PRICE_STEPS.find((p) => p.id === id);

  it('lists the four steps in order and the own automation as the box', () => {
    expect(PRICE_STEPS.map((p) => p.id)).toEqual(['demo', 'assessment', 'rollout', 'subscription']);
    expect(PRICE_ADDON.id).toBe('extension');
  });

  it('shows exactly the approved prices', () => {
    const prices = (id: string, locale: Locale) => {
      const c = byId(id)?.i18n[locale];
      return [c?.price, c?.priceAlt];
    };
    expect(prices('demo', 'de')).toEqual(['kostenlos', undefined]);
    expect(prices('demo', 'en')).toEqual(['free', undefined]);
    expect(prices('assessment', 'de')).toEqual(['CHF 750', undefined]);
    expect(prices('assessment', 'en')).toEqual(['CHF 750', undefined]);
    expect(prices('rollout', 'de')).toEqual(["CHF 3'900 unter 20 Personen", "ab CHF 7'500 ab 20 Personen"]);
    expect(prices('rollout', 'en')).toEqual([
      "CHF 3'900 under 20 people",
      "from CHF 7'500 for 20 people or more",
    ]);
    expect(prices('subscription', 'de')).toEqual([
      'CHF 200 pro Monat unter 20 Personen',
      'CHF 500 bis 900 pro Monat ab 20 Personen',
    ]);
    expect(prices('subscription', 'en')).toEqual([
      'CHF 200 a month under 20 people',
      'CHF 500 to 900 a month for 20 people or more',
    ]);
    expect(PRICE_ADDON.i18n.de.price).toBe("ab CHF 8'000");
    expect(PRICE_ADDON.i18n.en.price).toBe("from CHF 8'000");
  });

  it('states the risk reversal of the rollout in four sentences', () => {
    const terms = (locale: Locale) => byId('rollout')?.i18n[locale].terms ?? [];
    expect(terms('de')).toHaveLength(4);
    for (const word of ['zweite Hälfte', '6 Wochen', '4 Wochen', 'Zielblatt', 'nie pro Person']) {
      expect(terms('de').join(' '), word).toContain(word);
    }
    for (const word of ['second half', '6 weeks', '4 more weeks', 'target sheet', 'never per person']) {
      expect(terms('en').join(' '), word).toContain(word);
    }
  });

  it('screens before a rollout, in one sentence of the assessment', () => {
    expect(byId('assessment')?.i18n.de.terms).toHaveLength(1);
    expect(byId('assessment')?.i18n.en.terms).toHaveLength(1);
  });

  it('has the same number of inclusions and terms in both languages', () => {
    for (const p of [...PRICE_STEPS, PRICE_ADDON]) {
      expect(p.i18n.en.includes.length, p.id).toBe(p.i18n.de.includes.length);
      expect(p.i18n.en.terms?.length ?? 0, p.id).toBe(p.i18n.de.terms?.length ?? 0);
      expect(Boolean(p.i18n.en.priceAlt), p.id).toBe(Boolean(p.i18n.de.priceAlt));
      expect(Boolean(p.i18n.en.excludes), p.id).toBe(Boolean(p.i18n.de.excludes));
    }
  });

  it('keeps every step summary short (German, 75 characters)', () => {
    for (const p of PRICE_STEPS) {
      expect(p.i18n.de.summary.length, p.i18n.de.summary).toBeLessThanOrEqual(75);
    }
  });

  it('words the subscription reply time as a reply, not a fix', () => {
    const reply = (locale: Locale, pattern: RegExp) =>
      byId('subscription')?.i18n[locale].includes.find((i) => pattern.test(i)) ?? '';
    const deReply = reply('de', /Antwort spätestens am nächsten Arbeitstag/);
    const enReply = reply('en', /reply by the next working day/);
    expect(deReply).not.toBe('');
    expect(enReply).not.toBe('');
    for (const text of [deReply, enReply]) expect(text).not.toMatch(/behoben|gelöst|fixed|resolved/i);
  });
});

describe('automation FAQ', () => {
  it('answers ten questions, the price question first', () => {
    expect(FAQS).toHaveLength(10);
    expect(FAQS[0].i18n.de.q).toBe('Was kostet das?');
    expect(FAQS[0].i18n.en.q).toBe('What does it cost?');
  });

  it('keeps the price FAQ, and only it, out of the FAQPage markup', () => {
    expect(FAQS.filter((f) => f.markup === false)).toEqual([FAQS[0]]);
    for (const locale of LOCALES) {
      expect(faqsForMarkup(locale)).toEqual(FAQS.slice(1).map((f) => f.i18n[locale]));
      expect(JSON.stringify(faqsForMarkup(locale))).not.toMatch(/CHF/);
    }
  });

  it('answers "What does it cost?" with the price phrases of the steps', () => {
    for (const locale of LOCALES) {
      const answer = priceFaq(locale);
      for (const phrase of pricePhrases(locale)) expect(answer, phrase).toContain(phrase);
      expect(answer).toContain(PRICE_SENTENCE[locale]);
      expect(answer).toContain(PERSONEN[locale]);
    }
    expect(messages.de.pages.automation.priceFootnote).toContain(PERSONEN.de);
    expect(messages.en.pages.automation.priceFootnote).toContain(PERSONEN.en);
  });

  it('fills every FAQ entry in both locales', () => {
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
      faq: faqsForMarkup(locale),
      dateModified: PAGE_LAST_MODIFIED['/automation'],
    });

    it(`${locale}: has no offer, price or contact markup`, () => {
      const keys = keysDeep(data);
      for (const key of FORBIDDEN_KEYS) expect(keys.has(key), key).toBe(false);
    });

    it(`${locale}: mirrors the nine FAQ entries without the price FAQ, and no CHF at all`, () => {
      const graph = data['@graph'] as Array<Record<string, unknown>>;
      expect(graph[0].mainEntity).toHaveLength(9);
      expect(JSON.stringify(data)).not.toMatch(/CHF/);
    });

    if (locale === 'en') {
      it('en: never names the Oberland', () => {
        expect(JSON.stringify(data)).not.toMatch(/Oberland/);
      });
    }
  }
});

describe('automation offer in llms.txt', () => {
  const llms = readFileSync(join(process.cwd(), 'public', 'llms.txt'), 'utf8');

  it('names only approved prices, "from" prices with "from"', () => {
    const tokens = tokensOf(llms);
    expect(tokens.length).toBeGreaterThan(0);
    for (const token of tokens) expect(APPROVED_AMOUNTS, token).toContain(token);
    expectPrefixed(llms, FROM_AMOUNTS, /(?:\bab|\bfrom) $/);
    expectCHF500OnlyAsTier(llms);
  });

  it('leaves the own automation price to the page', () => {
    expect(llms).not.toContain("CHF 8'000");
  });

  it('uses the English price phrases of the page word for word', () => {
    for (const phrase of pricePhrases('en')) expect(llms, phrase).toContain(phrase);
  });

  it('promises no guarantee or savings and says nothing about VAT', () => {
    expect(llms).not.toMatch(BANNED);
    expect(llms).not.toMatch(VAT_WORDS);
  });

  it('dates the prices with the month of the page update', () => {
    const month = new Intl.DateTimeFormat('en', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(PAGE_LAST_MODIFIED['/automation']));
    expect(llms).toContain(`Prices as of ${month}`);
  });
});
