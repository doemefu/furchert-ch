// Bundle budget of the consent layer (spec 100 §3.10; WA-2a #153). Reads the
// production build, so it runs only with ANALYTICS_BUNDLE_CHECK=1 (the CI
// step after `pnpm build`; locally: `pnpm build && ANALYTICS_BUNDLE_CHECK=1
// pnpm vitest run src/lib/analytics/bundle.test.ts`). A plain `pnpm test`
// skips it, so it never measures a stale local build; with the variable set,
// a missing build fails.
//
// The consent code must live only in async chunks (next/dynamic, see
// src/components/analytics/lazy.tsx): none of them may be referenced by a
// prerendered page, so the dark build ships none of it and the live build
// never puts it on the critical path. One chunk holds the controller (no
// duplicate copies), and each chunk stays within its gzip budget.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

const NEXT = join(process.cwd(), '.next');
const CHUNKS = join(NEXT, 'static', 'chunks');
const required = process.env.ANALYTICS_BUNDLE_CHECK === '1';
const built = existsSync(CHUNKS);

// gzip bytes (level 9). Option A (WA-2a ruling): measured + about 10 %,
// async only, one chunk each. WA-2b (#154) measurements on 2026-11-08:
// controller 2 904 B (session, form hooks and tracker loader added), tracker
// 3 877 B (hard ceiling 6 KB); both caps confirmed by the lead's ruling.
const BUDGET = {
  controller: 3_200, // Analytics + consent controller + store + forget client
  bar: 1_000, // ConsentBar, loaded only while the bar is open
  link: 750, // footer "Privacy settings" button
  tracker: 4_265, // tracker chunk, fetched only after Allow
};

const chunkFiles = () => readdirSync(CHUNKS).filter((f) => f.endsWith('.js'));
const withMarker = (marker: string) =>
  chunkFiles().filter((f) => readFileSync(join(CHUNKS, f), 'utf8').includes(marker));
const gzipSize = (file: string) => gzipSync(readFileSync(join(CHUNKS, file)), { level: 9 }).length;

function htmlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? htmlFiles(join(dir, e.name)) : e.name.endsWith('.html') ? [join(dir, e.name)] : [],
  );
}

describe('consent layer bundle', () => {
  it.runIf(required && !built)('needs a production build', () => {
    expect(built, 'run `pnpm build` before this check').toBe(true);
  });

  describe.runIf(required && built)('built chunks', () => {
    // Markers: strings that only these modules contain.
    const controller = () => withMarker('fa_forget_pending');
    const bar = () => withMarker('consent-inner').filter((f) => !controller().includes(f));
    const link = () => withMarker('fa-privacy-settings').filter((f) => !controller().includes(f));
    const tracker = () => withMarker('fa-first-flush');

    it('has exactly one chunk with the controller, one bar chunk and one link chunk', () => {
      expect(controller()).toHaveLength(1);
      expect(bar()).toHaveLength(1);
      expect(link()).toHaveLength(1);
      expect(tracker()).toHaveLength(1);
      // The tracker is its own chunk: no controller code in it, no tracker code in the controller.
      expect(controller().some((f) => tracker().includes(f))).toBe(false);
    });

    it('stays within the gzip budget', () => {
      const sizes = {
        controller: gzipSize(controller()[0]),
        bar: gzipSize(bar()[0]),
        link: gzipSize(link()[0]),
        tracker: gzipSize(tracker()[0]),
      };
      for (const key of Object.keys(BUDGET) as (keyof typeof BUDGET)[]) {
        expect(sizes[key], `${key}: ${sizes[key]} B gzip`).toBeLessThanOrEqual(BUDGET[key]);
      }
    });

    it('references none of these chunks from a prerendered page', () => {
      const names = [...controller(), ...bar(), ...link(), ...tracker()];
      const pages = htmlFiles(join(NEXT, 'server', 'app'));
      expect(pages.length).toBeGreaterThan(0);
      for (const page of pages) {
        const html = readFileSync(page, 'utf8');
        for (const name of names) expect(html.includes(name), `${page} loads ${name}`).toBe(false);
      }
    });
  });
});
