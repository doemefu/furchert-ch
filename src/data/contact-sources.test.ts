import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
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
