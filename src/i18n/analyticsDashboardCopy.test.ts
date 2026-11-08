// Copy of /dashboard/analytics (WA-4a #155): DE and EN carry the same keys,
// and every key the components ask for exists (template keys expanded).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import de from './messages/de.json';
import en from './messages/en.json';

const flatten = (v: unknown, prefix = ''): string[] =>
  Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => (typeof x === 'string' ? [`${prefix}${k}`] : flatten(x, `${prefix}${k}.`)));
const read = (f: string) => readFileSync(join(process.cwd(), f), 'utf8');

const DIR = 'src/app/[locale]/dashboard/analytics';
const SHELL_FILES = ['sections.tsx', 'AnalyticsShell.tsx', 'ui.tsx', 'charts.tsx'].map((f) => `${DIR}/${f}`);
const TEMPLATES: Record<string, string[]> = {
  'status.${dot.key}': ['ok', 'disabled', 'stale', 'failing'].map((k) => `status.${k}`),
  'controls.p${p}': ['7d', '28d', '90d', '12m'].map((p) => `controls.p${p}`),
  'controls.${d}': ['desktop', 'mobile', 'tablet'].map((d) => `controls.${d}`),
  'clicks.${k}': ['cta', 'link', 'faq', 'lang', 'nav', 'outbound', 'mailto', 'tel'].map((k) => `clicks.${k}`),
  'clicks.${kind}': ['cta', 'link', 'faq', 'lang', 'nav', 'outbound', 'mailto', 'tel'].map((k) => `clicks.${k}`),
  'sources.${ch}': ['ai', 'search', 'social', 'referral', 'direct', 'internal'].map((k) => `sources.${k}`),
  'later.${id}': ['funnels', 'paths', 'audience', 'coverage'].map((k) => `later.${k}`),
  'pages.${k}': ['path', 'pageviews', 'entries', 'exitRate', 'bounce', 'medianTime', 'scroll50', 'scroll90'].map((k) => `pages.${k}`),
  'sources.${k}': ['source', 'medium', 'campaign', 'visits', 'converting'].map((k) => `sources.${k}`),
  "glance.basis${visitors.basis === 'month' ? 'Month' : visitors.basis}": ['glance.basis7d', 'glance.basis28d', 'glance.basisMonth'],
};

function usedKeys(src: string): string[] {
  const keys: string[] = [];
  for (const m of src.matchAll(/\bt\(\s*(['`])((?:(?!\1).)+)\1/g)) {
    const key = m[2];
    if (!key.includes('${')) keys.push(key);
    else {
      expect(TEMPLATES[key], `unknown template key ${key}`).toBeDefined();
      keys.push(...TEMPLATES[key]);
    }
  }
  return keys;
}

describe('dashboard analytics copy', () => {
  it('has the same keys in DE and EN', () => {
    expect(flatten(en.dashboard.analytics).sort()).toEqual(flatten(de.dashboard.analytics).sort());
    expect(en.dashboard.subnav.analytics).toBe('Analytics');
    expect(de.dashboard.subnav.analytics).toBe('Analytics');
  });

  it('has every key the page components use', () => {
    for (const locale of [de, en]) {
      const all = new Set(flatten(locale.dashboard.analytics));
      for (const f of SHELL_FILES) for (const k of usedKeys(read(f))) expect(all.has(k), `${f}: ${k}`).toBe(true);
      for (const k of usedKeys(read('src/components/analytics/NeverTrackSwitch.tsx'))) expect(all.has(`browser.${k}`), k).toBe(true);
    }
  });
});
