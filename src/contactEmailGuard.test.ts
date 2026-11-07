// Keeps the owner's contact e-mail address out of the source (#147): a
// literal in src/ or public/ ends up in the server HTML or the RSC payload,
// where scrapers read it. Render it through <ContactEmail> instead
// (src/components/ui/ContactEmail.tsx, src/data/contact-email.ts). A server
// component calling the helpers would leak it the same way; CI also greps
// the build output (.github/workflows/ci.yml).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Built from parts, so this file does not trip its own check. The "[at]"
// form is decoded by many harvesters, so it is no fallback either.
const PATTERNS = [
  ['dominic', 'furchert.ch'].join('@'),
  ['dominic', 'furchert.ch'].join(' [at] '),
  ['mailto:', 'dominic'].join(''),
];

const filesIn = (dir: string): string[] =>
  (readdirSync(join(process.cwd(), dir), { recursive: true }) as string[])
    .map((rel) => join(process.cwd(), dir, rel))
    .filter((path) => statSync(path).isFile());

describe('contact e-mail address (#147)', () => {
  for (const dir of ['src', 'public']) {
    it(`is not written out in ${dir}/`, () => {
      const files = filesIn(dir);
      expect(files.length).toBeGreaterThan(0);
      const hits = files.filter((path) => {
        const text = readFileSync(path, 'utf8').toLowerCase();
        return PATTERNS.some((p) => text.includes(p));
      });
      expect(hits).toEqual([]);
    });
  }

  it('is assembled only in client components', () => {
    const importers = filesIn('src')
      .filter((path) => /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path))
      .filter((path) => /from\s+['"][^'"]*\/contact-email['"]/.test(readFileSync(path, 'utf8')));
    expect(importers.length).toBeGreaterThan(0);
    const serverSide = importers
      .filter((path) => !readFileSync(path, 'utf8').startsWith("'use client';"))
      .map((path) => relative(process.cwd(), path));
    expect(serverSide).toEqual([]);
  });
});
