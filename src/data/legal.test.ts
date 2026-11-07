import { describe, expect, it } from 'vitest';
import { LEGAL_CONTACT, LEGAL_PAGES, type LegalPageCopy } from './legal';

const PAGES = ['imprint', 'privacy'] as const;
const LOCALES = ['de', 'en'] as const;

// Every rendered string of one page copy except the "Stand" date.
function strings(copy: LegalPageCopy): string[] {
  return [
    copy.label,
    copy.title,
    copy.sub,
    copy.contactLabel,
    copy.nameLabel,
    copy.emailLabel,
    copy.updatedLabel,
    ...copy.sections.flatMap((s) => [s.heading, ...s.paragraphs]),
  ];
}

describe('legal pages copy', () => {
  // The e-mail address is rendered by <ContactEmail> in the browser (#147).
  it('names only the owner (owner decision, no postal address)', () => {
    expect(LEGAL_CONTACT).toEqual({ name: 'Dominic Furchert' });
  });

  it.each(PAGES)('%s has DE and EN with the same structure and no empty text', (page) => {
    const de = LEGAL_PAGES[page].de;
    const en = LEGAL_PAGES[page].en;
    if (page === 'privacy') expect(de.sections.length).toBeGreaterThan(0);
    expect(en.sections.map((s) => s.paragraphs.length)).toEqual(de.sections.map((s) => s.paragraphs.length));
    expect(en.updated.length).toBeGreaterThan(0);
    for (const s of [...strings(de), ...strings(en)]) expect(s.trim().length).toBeGreaterThan(0);
  });

  // Owner copy rule (#141): no dashes used as punctuation in public copy.
  it.each(PAGES)('%s has no em or en dashes in any text', (page) => {
    for (const locale of LOCALES) {
      for (const s of strings(LEGAL_PAGES[page][locale])) expect(s).not.toMatch(/[\u2013\u2014]/);
    }
  });

  // Cloudflare Email Obfuscation rewrites addresses in the SSR HTML; the page
  // renders the address only in its own leaf element, in the browser (#125,
  // #147), never in text.
  it.each(PAGES)('%s has no e-mail address or mailto: in any text', (page) => {
    for (const locale of LOCALES) {
      for (const s of strings(LEGAL_PAGES[page][locale])) {
        expect(s).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
        expect(s).not.toMatch(/mailto:/i);
      }
    }
  });

  it.each(PAGES)('%s contains no postal address', (page) => {
    for (const locale of LOCALES) {
      for (const s of strings(LEGAL_PAGES[page][locale])) {
        expect(s).not.toMatch(/\b(?:CH-)?[1-9]\d{3}\s+[A-ZÄÖÜ][\p{L}.-]+/u);
        expect(s).not.toMatch(/\b[\p{L}-]+(?:strasse|str\.|gasse|weg|platz)\s*\d+/iu);
      }
    }
  });

  it.each(LOCALES)('privacy (%s) names every recipient with its country and the cookie', (locale) => {
    const text = strings(LEGAL_PAGES.privacy[locale]).join('\n');
    for (const needle of ['Cloudflare', 'Apple', 'iCloud', 'AbuseIPDB', 'USA', 'NEXT_LOCALE']) expect(text).toContain(needle);
  });

  // Owner decision (2026-11-07): the inbox AI is disclosed (variant A, private
  // Claude account), so the contact section names Anthropic's Irish entity.
  it.each(LOCALES)('privacy (%s) names Anthropic Ireland, Limited in the contact section', (locale) => {
    const heading = { de: 'Kontaktformular und E-Mail', en: 'Contact form and e-mail' }[locale];
    const section = LEGAL_PAGES.privacy[locale].sections.find((s) => s.heading === heading);
    expect(section).toBeDefined();
    expect(section!.paragraphs.join('\n')).toContain('Anthropic Ireland, Limited');
  });

  // Owner rule (2026-11-05): promise nothing the system does not do. These
  // topics were removed on purpose; re-adding one needs a fact check first.
  // No training statement either (2026-11-07): whether Anthropic trains on the
  // data depends on the plan.
  it.each(PAGES)('%s makes no retention, hosting, backup, Sentry, training or licence statement', (page) => {
    for (const locale of LOCALES) {
      const text = strings(LEGAL_PAGES[page][locale]).join('\n');
      expect(text).not.toMatch(/Sentry|Backup|Sicherungskopie|Haftung|Liability|Copyright|Urheberrecht/i);
      expect(text).not.toMatch(/training|trainiert/i);
      expect(text).not.toMatch(/\bMIT\b/);
      expect(text).not.toMatch(/\b(?:90|180|72)\b/);
      expect(text).not.toMatch(/in der Schweiz|in Switzerland|eigenen Servern|own servers|no tracking|keine Tracking/i);
    }
  });
});
