// The consent bar copy signed off by the owner on 2026-11-09 (#174, "ja passt").
// WA-6 (#158) splits `bodyMore` into two paragraphs for the mobile LCP; the
// words must stay byte-identical.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import de from './messages/de.json';
import en from './messages/en.json';

const SIGNED_OFF = {
  de: 'Seitenaufrufe, Klicks und das erfolgreiche Absenden des Kontaktformulars (ohne Inhalte) wertet dann der Betreiber selbst aus, ohne externe Analyse- oder Werbedienste. Ihre Wahl können Sie jederzeit unter «Datenschutz-Einstellungen» am Seitenende ändern.',
  en: 'Page views, clicks and successful contact-form submissions (never their content) are then analysed by the site owner only, with no external analytics or advertising services. You can change your choice at any time via "Privacy settings" at the bottom of the page.',
} as const;

describe('consent bar copy (signed off 2026-11-09)', () => {
  it.each([
    ['de', de],
    ['en', en],
  ] as const)('%s: bodyMore + " " + bodySettings equals the signed-off text byte for byte', (locale, messages) => {
    const c = messages.analytics.consent;
    expect(`${c.bodyMore} ${c.bodySettings}`).toBe(SIGNED_OFF[locale]);
  });

  it('the bar renders both parts as separate paragraphs, the privacy link with the second', () => {
    const src = readFileSync(join(process.cwd(), 'src/components/analytics/ConsentBar.tsx'), 'utf8');
    expect(src).toMatch(/<p>\{t\('bodyMore'\)\}<\/p>/);
    expect(src).toMatch(/<p>\s*\{t\('bodySettings'\)\} <Link href="\/privacy">\{t\('privacyLink'\)\}<\/Link>\s*<\/p>/);
  });
});
