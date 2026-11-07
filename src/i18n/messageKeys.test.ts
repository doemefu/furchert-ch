// Message keys (#145): next-intl only reports a missing key at render time,
// and only for the locale that misses it. These tests catch it earlier:
// - DE and EN carry the same keys across the whole public message tree
//   (the private dashboard has its own copy tests);
// - every key the /automation, home, header, footer and ContactEmail
//   components ask for exists in both locales, read from the source files
//   as text;
// - every /automation key is used, so retired copy does not linger.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import de from './messages/de.json';
import en from './messages/en.json';

const flatten = (value: unknown, prefix = ''): string[] =>
  Object.entries(value as Record<string, unknown>).flatMap(([key, v]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof v === 'string' ? [path] : flatten(v, path);
  });

const publicKeys = (m: typeof de): string[] => {
  const copy = structuredClone(m) as Record<string, unknown>;
  delete copy.dashboard;
  return flatten(copy).sort();
};

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

// The components whose keys are checked, with the namespace of their `t`.
// A file may also call a root-level `t` (e.g. in generateMetadata), so a key
// resolves either inside the namespace or from the root.
const FILES: Record<string, string> = {
  'src/app/[locale]/automation/page.tsx': 'pages.automation',
  'src/app/[locale]/automation/WowTiles.tsx': 'pages.automation',
  'src/app/[locale]/automation/AutomationPricing.tsx': 'pages.automation',
  'src/app/[locale]/automation/AutomationExample.tsx': 'pages.automation',
  'src/app/[locale]/page.tsx': '',
  'src/components/layout/Header.tsx': '',
  'src/components/layout/Footer.tsx': '',
  'src/components/ui/ContactEmail.tsx': 'contact',
};

// String array literal assigned to `name` in a source file.
const arrayIn = (src: string, name: string): string[] => {
  const body = new RegExp(`const ${name} = \\[([^\\]]+)\\]`).exec(src)?.[1] ?? '';
  return [...body.matchAll(/'([^']+)'/g)].map((m) => m[1]);
};

// The values each template key takes, as the components map over them.
// A new template key must be added here, or the test fails.
const templateValues = (template: string, src: string): string[] | undefined => {
  const values: Record<string, string[]> = {
    'workRight${n}': ['1', '2', '3'],
    'privacyRight${n}': ['1', '2', '3'],
    'reliable${n}': ['1', '2', '3', '4'],
    'nav.${k}': arrayIn(src, 'NAV_KEYS'),
    'teasers.${key}.title': arrayIn(src, 'teaserKeys'),
    'teasers.${key}.text': arrayIn(src, 'teaserKeys'),
  };
  return values[template];
};

// Every key a file asks for, templates expanded.
const usedKeys = (file: string): string[] => {
  const src = read(file);
  const keys: string[] = [];
  for (const m of src.matchAll(/\bt\(\s*(['`])((?:(?!\1).)+)\1/g)) {
    const key = m[2];
    if (!key.includes('${')) {
      keys.push(key);
      continue;
    }
    const values = templateValues(key, src);
    expect(values, `${file}: unknown template key ${key}`).toBeDefined();
    expect(values!.length, `${file}: no values for ${key}`).toBeGreaterThan(0);
    for (const v of values!) keys.push(key.replace(/\$\{[^}]+\}/, v));
  }
  return keys;
};

describe('message keys', () => {
  it('match in DE and EN across the public message tree', () => {
    expect(publicKeys(en)).toEqual(publicKeys(de));
  });

  for (const [file, namespace] of Object.entries(FILES)) {
    it(`exist in both locales for every key ${file} uses`, () => {
      const keys = usedKeys(file);
      expect(keys.length, file).toBeGreaterThan(0);
      for (const locale of [de, en]) {
        const all = new Set(flatten(locale));
        for (const key of keys) {
          const found = (namespace && all.has(`${namespace}.${key}`)) || all.has(key);
          expect(found, `${file}: ${key}`).toBe(true);
        }
      }
    });
  }

  it('are all used on /automation (no retired copy left behind)', () => {
    const used = new Set(
      Object.entries(FILES)
        .filter(([, ns]) => ns === 'pages.automation')
        .flatMap(([file]) => usedKeys(file))
        .map((key) => (key.startsWith('pages.automation.') ? key.slice('pages.automation.'.length) : key)),
    );
    for (const key of flatten(de.pages.automation)) expect(used.has(key), key).toBe(true);
  });
});
