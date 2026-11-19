// DM Mono is for the dashboard only (redesign PR 11c). Two source guards keep
// it off the public pages: only files under the dashboard route may import
// `@/lib/dashboardFont`, and `var(--mono)` in globals.css may only appear in
// `.ethon` or `.svc-*` (dashboard services) rules.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const DASHBOARD = join('src', 'app', '[locale]', 'dashboard') + '/';

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

describe('DM Mono scope', () => {
  it('is imported only from the dashboard route', () => {
    const importers = walk(join(ROOT, 'src'))
      .filter((f) => /\.(ts|tsx)$/.test(f))
      .map((f) => relative(ROOT, f))
      .filter((f) => !f.endsWith('fontScope.test.ts'))
      .filter((f) => /from\s+['"][^'"]*dashboardFont['"]/.test(readFileSync(join(ROOT, f), 'utf8')));
    expect(importers.length).toBeGreaterThan(0);
    for (const f of importers) expect(f.startsWith(DASHBOARD), f).toBe(true);
  });

  it('is used in globals.css only by .ethon and .svc-* rules', () => {
    const css = readFileSync(join(ROOT, 'src/styles/globals.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    let found = 0;
    for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!body.includes('var(--mono)')) continue;
      found++;
      for (const selector of selectors.split(',')) {
        expect(selector.trim(), selector).toMatch(/^(\.ethon\b|\.svc-)/);
      }
    }
    expect(found).toBeGreaterThan(0);
  });
});
