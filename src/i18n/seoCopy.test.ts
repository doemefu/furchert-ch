import { describe, expect, it } from 'vitest';
import de from './messages/de.json';
import en from './messages/en.json';

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
  lab: m.pages.lab,
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

  it('uses Swiss spelling in German (no ß)', () => {
    for (const meta of Object.values(locales.de)) {
      expect(`${meta.metaTitle} ${meta.metaDescription}`).not.toContain('ß');
    }
    expect(de.hero.sub).not.toContain('ß');
  });

  it('names one public place for the owner: the Zürcher Oberland (owner decision)', () => {
    // hero label, footer role and the location shown in the footer and on
    // /contact. The hero label keeps the place on one line with a no-break space.
    const plain = (text: string) => text.replace(/\u00a0/g, ' ');
    expect(de.hero.label).toContain('Zürcher\u00a0Oberland');
    expect(en.hero.label).toContain('Zurich\u00a0Oberland');
    for (const text of [de.hero.label, de.footer.role, de.footer.location].map(plain)) {
      expect(text).toContain('Zürcher Oberland');
    }
    for (const text of [en.hero.label, en.footer.role, en.footer.location].map(plain)) {
      expect(text).toContain('Zurich Oberland');
    }
    for (const m of [de, en]) {
      for (const text of [m.hero.label, m.footer.role, m.footer.location]) {
        expect(text).not.toMatch(/Rapperswil|Zürich$|Zurich$/);
      }
    }
  });

  it('introduces the owner by name on the home page', () => {
    expect(de.hero.sub).toContain('Dominic Furchert');
    expect(en.hero.sub).toContain('Dominic Furchert');
  });
});
