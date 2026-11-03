import { describe, expect, it } from 'vitest';
import { LEGAL_CONTACT, LEGAL_PAGES, RETENTION, type LegalPageCopy } from './legal';

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
  it('names only the owner and the published e-mail address (owner decision, no postal address)', () => {
    expect(LEGAL_CONTACT).toEqual({ name: 'Dominic Furchert', email: 'dominic@furchert.ch' });
  });

  it.each(PAGES)('%s has DE and EN with the same structure and no empty text', (page) => {
    const de = LEGAL_PAGES[page].de;
    const en = LEGAL_PAGES[page].en;
    expect(de.sections.length).toBeGreaterThan(0);
    expect(en.sections.map((s) => s.paragraphs.length)).toEqual(de.sections.map((s) => s.paragraphs.length));
    expect(en.updated.length).toBeGreaterThan(0);
    for (const s of [...strings(de), ...strings(en)]) expect(s.trim().length).toBeGreaterThan(0);
  });

  // Cloudflare Email Obfuscation rewrites addresses in the SSR HTML; the page
  // renders the address only in its own leaf element (#125), never in text.
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

  it.each(LOCALES)('privacy (%s) names every recipient, the hosting country and the retention periods', (locale) => {
    const text = strings(LEGAL_PAGES.privacy[locale]).join('\n');
    for (const needle of ['Cloudflare', 'Apple', 'iCloud', 'AbuseIPDB', 'USA']) expect(text).toContain(needle);
    expect(text).toContain(locale === 'de' ? 'Schweiz' : 'Switzerland');
    expect(text).toContain(`${RETENTION.requestDays}`);
    expect(text).toContain(`${RETENTION.securityDays}`);
    expect(text).toContain(`${RETENTION.loginOutboxHours}`);
    expect(text).toContain('NEXT_LOCALE');
  });
});
