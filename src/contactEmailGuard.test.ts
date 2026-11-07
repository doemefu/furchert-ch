// Keeps the owner's contact e-mail address out of the source (#147): a
// literal in src/ or public/ ends up in the server HTML or the RSC payload,
// where scrapers read it. Render it through <ContactEmail> instead
// (src/components/ui/ContactEmail.tsx, src/data/contact-email.ts).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Built from parts, so this file does not trip its own check.
const ADDRESS = ['dominic', 'furchert.ch'].join('@');
const MAILTO = ['mailto:', 'dominic'].join('');

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
        return text.includes(ADDRESS) || text.includes(MAILTO);
      });
      expect(hits).toEqual([]);
    });
  }
});
