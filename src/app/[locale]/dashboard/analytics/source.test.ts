// Source guards for /dashboard/analytics (spec 100 §9.1 C16; review M8).
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = 'src/app/[locale]/dashboard/analytics';
// Comments stripped, so prose about a forbidden API does not count.
const read = (f: string) =>
  readFileSync(join(process.cwd(), f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const files = [...readdirSync(join(process.cwd(), DIR)).filter((f) => f.endsWith('.tsx')).map((f) => `${DIR}/${f}`), 'src/components/analytics/NeverTrackSwitch.tsx'];

describe('/dashboard/analytics sources', () => {
  it('never uses dangerouslySetInnerHTML', () => {
    for (const f of files) expect(read(f), f).not.toContain('dangerouslySetInnerHTML');
  });

  it('builds hrefs only through linkTo / the validated controls', () => {
    for (const f of files) {
      for (const m of read(f).matchAll(/href=\{([^}]*)\}/g)) expect(['href', 'linkTo('].some((ok) => m[1].startsWith(ok)), `${f}: ${m[0]}`).toBe(true);
    }
  });

  it('loads the never-track switch only through its own lazy module, imported only by the shell (M8)', () => {
    expect(read(`${DIR}/AnalyticsShell.tsx`)).toMatch(/from '@\/components\/analytics\/lazySwitch'/);
    expect(read('src/components/analytics/lazySwitch.tsx')).toMatch(/\{ ssr: false \}/);
    for (const f of files.filter((x) => !x.endsWith('NeverTrackSwitch.tsx'))) expect(read(f), f).not.toMatch(/analytics\/controller'/);
    for (const f of ['src/app/[locale]/layout.tsx', 'src/components/layout/Footer.tsx', 'src/components/analytics/lazy.tsx']) {
      expect(read(f), f).not.toMatch(/lazySwitch|NeverTrackSwitch/);
    }
  });

  it('the dashboard files are server components without client state (L2)', () => {
    for (const f of files.filter((x) => x.startsWith(DIR))) expect(read(f), f).not.toMatch(/'use client'|useState|useEffect/);
  });

  it('the read client is server-only and asks for analytics:read only', () => {
    const src = read('src/lib/analytics/read.ts');
    expect(src).toMatch(/^import 'server-only';/m);
    expect(src).toMatch(/createClientCredentialsToken\('analytics:read'/);
    expect(src).not.toMatch(/analytics:write|netmon:read/);
  });

  it('the switch keeps a constant label with aria-pressed (N3); role="status" only for its storage message (N4)', () => {
    const sw = read('src/components/analytics/NeverTrackSwitch.tsx');
    expect(sw).toMatch(/aria-pressed=\{on\}/);
    expect(sw).not.toMatch(/turnOff/);
    expect(sw.match(/role="status"/g)).toHaveLength(1);
    for (const f of files.filter((x) => !x.endsWith('NeverTrackSwitch.tsx'))) expect(read(f), f).not.toMatch(/role="status"/);
  });
});
