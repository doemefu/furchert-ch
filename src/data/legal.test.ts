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
      expect(text).not.toMatch(/\btrain|trainier|training/i);
      expect(text).not.toMatch(/\bMIT\b/);
      expect(text).not.toMatch(/\b(?:90|180|72)\b/);
      expect(text).not.toMatch(/in der Schweiz|in Switzerland|eigenen Servern|own servers|no tracking|keine Tracking/i);
    }
  });

  // WA-5 #157 / WA-6 #158 (spec 100 §10.2 L1 to L7): the usage-statistics
  // section, its cookies and the withdrawal path. Owner decisions 2026-11-08:
  // no retention period, no location, no backup statement (Q1, Q2); the
  // erasure sentence is conditional and names no period (WA-5 review M7).
  const usage = { de: 'Nutzungsstatistik (nur mit Einwilligung)', en: 'Usage statistics (only with consent)' } as const;
  const cookies = { de: 'Cookies und lokaler Speicher', en: 'Cookies and local storage' } as const;

  it.each(LOCALES)('privacy (%s) names the analytics cookies, the storage keys and the settings link (L7)', (locale) => {
    const text = strings(LEGAL_PAGES.privacy[locale]).join('\n');
    const settings = { de: 'Datenschutz-Einstellungen', en: 'Privacy settings' }[locale];
    for (const needle of ['fa_vid', 'fa_forget', 'fa_forget_pending', 'fa_consent', usage[locale].split(' (')[0], settings, '__Host-authjs.csrf-token', '__Secure-authjs.callback-url']) {
      expect(text, needle).toContain(needle);
    }
  });

  it.each(LOCALES)('privacy (%s) has the usage-statistics section after security monitoring and the renamed cookie section (L1, L3)', (locale) => {
    const headings = LEGAL_PAGES.privacy[locale].sections.map((s) => s.heading);
    const security = { de: 'Sicherheitsüberwachung', en: 'Security monitoring' }[locale];
    expect(headings.indexOf(usage[locale])).toBe(headings.indexOf(security) + 1);
    expect(headings).toContain(cookies[locale]);
    expect(headings).not.toContain('Cookies');
  });

  it.each(LOCALES)('privacy (%s): the only duration in the usage-statistics section is 12 months, and erasure names no period (L1, M7)', (locale) => {
    const section = LEGAL_PAGES.privacy[locale].sections.find((s) => s.heading === usage[locale])!;
    const text = section.paragraphs.join('\n');
    const durations = text.match(/\b\d+\s*(?:Tage?n?|Wochen?|Monate?n?|Jahre?n?|Stunden?|Minuten?|days?|weeks?|months?|years?|hours?|minutes?)\b/gi) ?? [];
    expect(durations.length).toBeGreaterThan(0);
    for (const d of durations) expect(d).toBe({ de: '12 Monate', en: '12 months' }[locale]);
    const erasure = { de: /nachgeholt/, en: /catch(?:es)? up|completed later|carried out later/ }[locale];
    expect(text).toMatch(erasure);
    expect(text).toMatch({ de: /Global Privacy Control|Do Not Track/, en: /Global Privacy Control|Do Not Track/ }[locale]);
  });

  it.each(LOCALES)('privacy (%s): withdrawal via the settings link is in "your rights" (L4)', (locale) => {
    const heading = { de: 'Ihre Rechte', en: 'Your rights' }[locale];
    const settings = { de: 'Datenschutz-Einstellungen', en: 'Privacy settings' }[locale];
    expect(LEGAL_PAGES.privacy[locale].sections.find((s) => s.heading === heading)!.paragraphs.join('\n')).toContain(settings);
  });
});
