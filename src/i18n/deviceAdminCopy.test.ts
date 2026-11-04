import { describe, expect, it } from 'vitest';
import de from './messages/de.json';
import en from './messages/en.json';

// Copy guardrails for the /dashboard/devices admin GUI (#45): both locales
// carry the same keys, the German copy is Swiss Standard German (no "ß"), and
// no message contains ICU syntax characters that next-intl would parse as a
// tag ("<…>") — paths like terraGeneral/‹function›/schedule use ‹ › instead.
const flatten = (value: unknown, prefix = ''): Record<string, string> =>
  Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, v]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof v === 'string') acc[path] = v;
    else Object.assign(acc, flatten(v, path));
    return acc;
  }, {});

const deCopy = flatten(de.dashboard.deviceAdmin);
const enCopy = flatten(en.dashboard.deviceAdmin);

describe('device admin copy', () => {
  it('has identical message keys in DE and EN', () => {
    expect(Object.keys(enCopy).sort()).toEqual(Object.keys(deCopy).sort());
  });

  it('uses "ss", never "ß", in the German copy', () => {
    expect(Object.values(deCopy).filter((v) => v.includes('ß'))).toEqual([]);
  });

  it('contains no rich-text tag syntax', () => {
    expect([...Object.values(deCopy), ...Object.values(enCopy)].filter((v) => /[<>]/.test(v))).toEqual([]);
  });

  it('uses the same placeholders in both locales', () => {
    const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of Object.keys(deCopy)) expect([key, vars(enCopy[key])]).toEqual([key, vars(deCopy[key])]);
  });
});
