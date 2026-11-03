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

  it('introduces the owner by name on the home page', () => {
    expect(de.hero.sub).toContain('Dominic Furchert');
    expect(en.hero.sub).toContain('Dominic Furchert');
  });
});
