import { describe, expect, it } from 'vitest';
import de from './messages/de.json';
import en from './messages/en.json';
import { BIO, FACTS, TIMELINE, INTERESTS } from '@/data/about';
import { ENGAGEMENT } from '@/data/engagement';
import { EXPERIENCE } from '@/data/experience';
import { HOME_STATS } from '@/data/home-stats';
import { LAB_SERVICES, LAB_SHOWCASE } from '@/data/homelab-lab';
import { IT_CARDS, TECH_STACK } from '@/data/it';
import { PROJECTS } from '@/data/projects';
import { ROWING_CARDS } from '@/data/rowing';
import { TICKER_ITEMS } from '@/data/ticker';
import { FAQS } from '@/data/automation-faqs';
import { EXAMPLE } from '@/data/automation-example';
import { PRICE_ADDON, PRICE_STEPS } from '@/data/automation-packages';
import { WOW_TILES } from '@/data/automation-wow';
import { CALC } from '@/data/automation-calc';
import { ownerTitle } from '@/lib/seo/metadata';

// Search-result copy: every public page has its own title and description in
// both languages, short enough not to be cut off in results, and naming the
// owner so search engines and AI answers tie the page to him.
type Meta = { metaTitle: string; metaDescription: string };
const metaOf = (m: typeof de): Record<string, Meta> => ({
  home: m.pages.home,
  about: m.pages.about,
  it: m.pages.it,
  rowing: m.pages.rowing,
  projects: m.pages.projects,
  automation: m.pages.automation,
  contact: m.contact,
  // The project page appends the name to this title (projects/[slug]/page.tsx).
  lab: { ...m.pages.lab, metaTitle: ownerTitle(m.pages.lab.metaTitle) },
});
const locales = { de: metaOf(de), en: metaOf(en) };

describe('search-result copy', () => {
  for (const [locale, pages] of Object.entries(locales)) {
    for (const [page, meta] of Object.entries(pages)) {
      it(`${locale}/${page}: title and description fit a search result`, () => {
        expect(meta.metaTitle.length, meta.metaTitle).toBeLessThanOrEqual(60);
        expect(meta.metaDescription.length, meta.metaDescription).toBeGreaterThanOrEqual(70);
        expect(meta.metaDescription.length, meta.metaDescription).toBeLessThanOrEqual(160);
      });

      it(`${locale}/${page}: names the owner`, () => {
        expect(`${meta.metaTitle} ${meta.metaDescription}`).toContain('Dominic Furchert');
      });
    }
  }

  // Owner (2026-11-03): no em dashes, titles use "|".
  it('has no em dash in any title or description', () => {
    for (const pages of Object.values(locales)) {
      for (const [page, meta] of Object.entries(pages)) {
        expect(`${meta.metaTitle} ${meta.metaDescription}`, page).not.toContain('\u2014');
      }
    }
  });

  it('separates the name in titles with "|"', () => {
    for (const pages of Object.values(locales)) {
      for (const [page, meta] of Object.entries(pages)) {
        expect(meta.metaTitle, page).toMatch(/(^Dominic Furchert \| )|( \| Dominic Furchert$)/);
      }
    }
  });

  it('uses Swiss spelling in German (no ß)', () => {
    for (const meta of Object.values(locales.de)) {
      expect(`${meta.metaTitle} ${meta.metaDescription}`).not.toContain('ß');
    }
    expect(de.hero.sub).not.toContain('ß');
  });

  it('names one public place for the owner (owner decisions)', () => {
    // Hero label, footer role and the location shown in the footer and on
    // /contact: "Zürcher Oberland" in German (the regional SMEs read German),
    // "Zurich" in English. The German label keeps the place on one line with a
    // no-break space.
    const plain = (text: string) => text.replace(/\u00a0/g, ' ');
    expect(de.hero.label).toContain('Zürcher\u00a0Oberland');
    for (const text of [de.hero.label, de.footer.role, de.footer.location].map(plain)) {
      expect(text).toContain('Zürcher Oberland');
    }
    expect(en.footer.location).toBe('Zurich');
    for (const text of [en.hero.label, en.footer.role]) expect(text).toMatch(/· Zurich$/);
    for (const m of [de, en]) {
      for (const text of [m.hero.label, m.footer.role, m.footer.location]) {
        expect(text).not.toMatch(/Rapperswil/);
      }
    }
  });

  it('introduces the owner by name on the home page', () => {
    expect(de.hero.sub).toContain('Dominic Furchert');
    expect(en.hero.sub).toContain('Dominic Furchert');
  });
});

// Visible copy of the public pages (the private dashboard is excluded): no em
// dashes (owner, 2026-11-03).
describe('public copy', () => {
  const publicMessages = (m: typeof de) => {
    const copy = structuredClone(m) as unknown as Record<string, unknown> & {
      pages: Record<string, unknown>;
    };
    delete copy.dashboard;
    return copy;
  };
  const data = {
    BIO, FACTS, TIMELINE, INTERESTS, ENGAGEMENT, EXPERIENCE, HOME_STATS, LAB_SERVICES, LAB_SHOWCASE,
    IT_CARDS, TECH_STACK, PROJECTS, ROWING_CARDS, TICKER_ITEMS,
    FAQS, EXAMPLE, PRICE_STEPS, PRICE_ADDON, WOW_TILES, CALC,
  };

  it('has no em dash in the messages', () => {
    for (const m of [de, en]) expect(JSON.stringify(publicMessages(m))).not.toContain('\u2014');
  });

  // Owner (2026-11-03): English pages say "Zurich" ("around Zurich", "the
  // Zurich area"); only German names the Zürcher Oberland.
  it('never names the Oberland in English', () => {
    const englishData: string[] = [];
    const collect = (value: unknown, inEnglish: boolean): void => {
      if (typeof value === 'string') {
        if (inEnglish) englishData.push(value);
      } else if (Array.isArray(value)) {
        value.forEach((v) => collect(v, inEnglish));
      } else if (value && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) collect(v, inEnglish || k === 'en');
      }
    };
    collect(data, false);
    expect(JSON.stringify(publicMessages(en))).not.toMatch(/Oberland/);
    for (const text of englishData) expect(text).not.toMatch(/Oberland/);
  });

  it('has no em dash in the page data', () => {
    for (const [name, value] of Object.entries(data)) {
      expect(JSON.stringify(value), name).not.toContain('\u2014');
    }
  });
});
