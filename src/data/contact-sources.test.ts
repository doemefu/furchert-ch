import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { WOW_TILES } from './automation-wow';
import {
  FROM_IDS,
  HEARD_VIA_IDS,
  HEARD_VIA_MAIL_LABELS,
  contactHref,
  heardViaMessageKey,
  isFromId,
  isHeardVia,
} from './contact-sources';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('contact sources', () => {
  it('lists every call-to-action id once, including the callback link', () => {
    expect(new Set(FROM_IDS).size).toBe(FROM_IDS.length);
    expect(FROM_IDS).toContain('automation-callback');
    for (const id of FROM_IDS) expect(id).toMatch(/^(automation|home)-[a-z-]+$/);
    expect(contactHref('automation-callback')).toBe('/contact?from=automation-callback');
  });

  it('accepts only the listed ids', () => {
    for (const id of FROM_IDS) expect(isFromId(id)).toBe(true);
    for (const value of ['', 'Automation-hero', 'automation-hero ', 'evil', null, undefined, 1, ['home-cta']]) {
      expect(isFromId(value), String(value)).toBe(false);
    }
  });

  it('offers the six source options, each with a German mail label and a message key', () => {
    expect(HEARD_VIA_IDS).toEqual(['search', 'ai', 'referral', 'linkedin', 'event', 'other']);
    expect(Object.keys(HEARD_VIA_MAIL_LABELS).sort()).toEqual([...HEARD_VIA_IDS].sort());
    expect(HEARD_VIA_MAIL_LABELS.referral).toBe('Empfehlung');
    expect(heardViaMessageKey('linkedin')).toBe('heardViaLinkedin');
    expect(heardViaMessageKey('ai')).toBe('heardViaAi');
    for (const id of HEARD_VIA_IDS) expect(isHeardVia(id)).toBe(true);
    for (const value of ['', 'Empfehlung', 'Search', 'none', null, 3]) expect(isHeardVia(value), String(value)).toBe(false);
  });
});

// TypeScript already rejects an unknown id in contactHref(); this catches the
// other direction, an id no button uses any more.
describe('call-to-action ids in use', () => {
  const CTA_FILES = [
    'src/app/[locale]/automation/page.tsx',
    'src/app/[locale]/automation/WowTiles.tsx',
    'src/app/[locale]/automation/ExampleCalc.tsx',
    'src/app/[locale]/automation/AutomationPricing.tsx',
    'src/app/[locale]/page.tsx',
  ];
  const sources = CTA_FILES.map(read).join('\n');
  const literalIds = [...sources.matchAll(/contactHref\('([^']+)'\)/g)].map((m) => m[1]);
  // WowTiles builds `automation-tile-${tile.id}` from the tile data.
  const tileIds = /contactHref\(`automation-tile-\$\{tile\.id\}`\)/.test(sources)
    ? WOW_TILES.map((tile) => `automation-tile-${tile.id}`)
    : [];

  it('links every listed id from /automation or the home page', () => {
    const used = new Set([...literalIds, ...tileIds]);
    for (const id of FROM_IDS) expect(used.has(id), id).toBe(true);
  });

  it('links «Rückruf anfordern» from the hero and the closing call to action', () => {
    const page = read('src/app/[locale]/automation/page.tsx');
    expect(page.match(/contactHref\('automation-callback'\)/g)).toHaveLength(2);
  });
});

// «Rückruf gewünscht» starts unchecked; only the visitor's own tap on
// «Rückruf anfordern» (`?from=automation-callback`) ticks it (spec v2 c2 M7).
describe('callback checkbox default', () => {
  const form = read('src/app/[locale]/contact/ContactForm.tsx');

  it('is never checked by markup', () => {
    expect(form).not.toMatch(/defaultChecked/);
    expect(form).not.toMatch(/checked=\{\s*true\s*\}/);
    expect(form).toMatch(/type="checkbox"\s+checked=\{callback\}/);
  });

  it('defaults to ticked only for automation-callback; otherwise only the visitor sets it', () => {
    expect(form).toMatch(/useState<boolean \| null>\(null\)/);
    expect(form).toContain("const callback = callbackChoice ?? from === 'automation-callback';");
    const setters = [...form.matchAll(/setCallbackChoice\(([^)]*)\)/g)].map((m) => m[1]);
    expect(setters).toEqual(['e.target.checked']);
  });
});
