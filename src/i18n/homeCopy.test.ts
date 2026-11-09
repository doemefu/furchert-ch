// Home hero sheet and status line copy (#178).
import { describe, expect, it } from 'vitest';
import { WOW_TILES } from '@/data/automation-wow';
import de from './messages/de.json';
import en from './messages/en.json';

const home = { de: de.pages.home, en: en.pages.home };
const PRICE_CELL = { de: 'aus Ihrer Kalkulation', en: 'from your costing' } as const;
const MONEY = /CHF|Fr\.|\d+\.-/;

const offer = WOW_TILES.find((t) => t.id === 'offerte')!;

describe('home hero sheet copy', () => {
  it('labels the example as invented', () => {
    expect(home.de.sheetTag).toContain('erfunden');
    expect(home.en.sheetTag).toContain('invented');
  });

  it('shows at least 2 rows, every price cell is the costing note, no CHF amount', () => {
    for (const locale of ['de', 'en'] as const) {
      const panel = offer.i18n[locale].panel as unknown as {
        table: { rows: string[][] };
        mailFrom: string;
        mailSubject: string;
        foundText: string;
        questions: string[];
        closing: string;
      };
      expect(panel.table.rows.length).toBeGreaterThanOrEqual(2);
      for (const row of panel.table.rows) expect(row[row.length - 1]).toBe(PRICE_CELL[locale]);
      const strings = JSON.stringify([panel.table, panel.mailFrom, panel.mailSubject, panel.foundText, panel.questions, panel.closing]);
      expect(strings).not.toMatch(MONEY);
      expect(JSON.stringify([home[locale].sheetTag, home[locale].sheetTitle, home[locale].sheetAlt])).not.toMatch(MONEY);
    }
  });
});

describe('home status line copy', () => {
  it('has the same keys in DE and EN', () => {
    expect(Object.keys(en.pages.home.status).sort()).toEqual(Object.keys(de.pages.home.status).sort());
  });

  it('keeps the same placeholders in DE and EN', () => {
    const slots = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const [key, value] of Object.entries(de.pages.home.status)) {
      expect(slots(en.pages.home.status[key as keyof typeof en.pages.home.status]), key).toEqual(slots(value));
    }
  });

  it('has no trailing periods and no em dash', () => {
    for (const h of [home.de, home.en]) {
      for (const v of [h.sheetTag, h.sheetTitle, h.sheetAlt, ...Object.values(h.status)]) {
        expect(v.endsWith('.'), v).toBe(false);
        expect(v).not.toContain('—');
      }
    }
  });

  it('has no ß in the German copy and no Oberland in English', () => {
    expect(JSON.stringify([home.de.sheetTag, home.de.sheetTitle, home.de.sheetAlt, home.de.status])).not.toContain('ß');
    expect(JSON.stringify(home.en)).not.toContain('Oberland');
  });
});
