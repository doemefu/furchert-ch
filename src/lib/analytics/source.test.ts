// Source guards for the consent layer (spec 100 §1.4, §10.1; WA-2a #153).
// They read the files as text, comments stripped, because the components
// cannot render in the node test environment.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import de from '@/i18n/messages/de.json';
import en from '@/i18n/messages/en.json';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
// Drops block and line comments (not `://` inside strings such as URLs).
const code = (file: string) => read(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const CONSENT_FILES = [
  'src/lib/analytics/flags.ts',
  'src/lib/analytics/consent.ts',
  'src/lib/analytics/forget.ts',
  'src/lib/analytics/trackerPort.ts',
  'src/lib/analytics/controller.ts',
  'src/lib/analytics/paths.ts',
  'src/components/analytics/ids.ts',
  'src/components/analytics/lazy.tsx',
  'src/components/analytics/Analytics.tsx',
  'src/components/analytics/ConsentBar.tsx',
  'src/components/analytics/PrivacySettingsLink.tsx',
];

describe('dark launch', () => {
  it('keeps ANALYTICS_UI_ENABLED false until the WA-6 go-live PR (#158) flips it and this test', () => {
    expect(code('src/lib/analytics/flags.ts')).toMatch(/export const ANALYTICS_UI_ENABLED: boolean = false;/);
  });

  it('renders the analytics components only behind the flag', () => {
    const layout = code('src/app/[locale]/layout.tsx');
    expect(layout).toMatch(/\{ANALYTICS_UI_ENABLED && <LazyAnalytics \/>\}/);
    expect(layout.match(/<LazyAnalytics\b/g)).toHaveLength(1);

    const footer = code('src/components/layout/Footer.tsx');
    expect(footer).toMatch(/\{ANALYTICS_UI_ENABLED && <LazyPrivacySettingsLink\b/);
    expect(footer.match(/<LazyPrivacySettingsLink\b/g)).toHaveLength(1);
  });

  it('imports analytics into the layout and the Footer only through the lazy loaders', () => {
    // A static import would put the consent code into the layout chunk even
    // while the flag is false (Turbopack bundles every imported client component).
    for (const file of ['src/app/[locale]/layout.tsx', 'src/components/layout/Footer.tsx']) {
      const imports = [...code(file).matchAll(/from '(@\/components\/analytics\/[^']+)'/g)].map((m) => m[1]);
      expect(imports, file).toEqual(['@/components/analytics/lazy']);
    }
  });

  it('mounts <Analytics /> after the footer and outside <main>', () => {
    const layout = code('src/app/[locale]/layout.tsx');
    expect(layout.indexOf('<LazyAnalytics')).toBeGreaterThan(layout.indexOf('</main>'));
    expect(layout.indexOf('<LazyAnalytics')).toBeGreaterThan(layout.indexOf('<Footer />'));
  });
});

describe('nothing before consent', () => {
  // Device properties, lifecycle hooks and transports the consent layer must
  // never touch (§1.4, §3.9). GPC/DNT reads arrive with WA-5 (#157).
  const FORBIDDEN: [string, RegExp][] = [
    ['navigator', /\bnavigator\b/],
    ['screen', /\bscreen\./],
    ['innerWidth/innerHeight', /\binner(Width|Height)\b/],
    ['devicePixelRatio', /\bdevicePixelRatio\b/],
    ['document.referrer', /\breferrer\b/],
    ['matchMedia', /\bmatchMedia\b/],
    ['userAgent', /\buserAgent\b/],
    ['document.cookie', /\bdocument\.cookie\b/],
    ['sendBeacon', /\bsendBeacon\b/],
    ['scroll listener', /['"]scroll['"]/],
    ['unload listener', /['"](before)?unload['"]/],
  ];

  for (const file of CONSENT_FILES) {
    it(`${file} reads no device property and adds no scroll/unload listener`, () => {
      const src = code(file);
      for (const [name, pattern] of FORBIDDEN) expect(src, `${file}: ${name}`).not.toMatch(pattern);
    });
  }

  it('sends only to the forget endpoint', () => {
    for (const file of CONSENT_FILES) {
      for (const m of code(file).matchAll(/['"`](\/api\/[^'"`]*)['"`]/g)) {
        expect(m[1], file).toBe('/api/v/forget');
      }
    }
  });
});

describe('consent bar', () => {
  const bar = code('src/components/analytics/ConsentBar.tsx');

  it('offers exactly two equal buttons, Decline first', () => {
    const buttons = [...bar.matchAll(/<Btn(.*?)>\{t\('(\w+)'\)\}<\/Btn>/g)];
    expect(buttons.map((m) => m[2])).toEqual(['decline', 'accept']);
    expect(bar.match(/<Btn\b/g)).toHaveLength(2);
    // Identical props apart from the handler (no variant, size or emphasis).
    const props = buttons.map((m) => m[1].replace(/^\s*onClick=\{.*\}\s*$/, ''));
    expect(props).toEqual(['', '']);
  });

  it('is a labelled, non-modal region', () => {
    expect(bar).toMatch(/role="region"/);
    expect(bar).toMatch(/aria-labelledby=\{CONSENT_TITLE_ID\}/);
    expect(bar).not.toMatch(/aria-modal/);
    expect(bar).toMatch(/e\.key === 'Escape'/);
  });

  it('has no "accept all" or "later" choice in either locale', () => {
    const copy = JSON.stringify([de.analytics, en.analytics]);
    for (const word of [/alle akzeptieren/i, /später/i, /accept all/i, /\blater\b/i]) expect(copy).not.toMatch(word);
  });

  it('keeps the controller out of the footer link (one copy of the consent code)', () => {
    const link = code('src/components/analytics/PrivacySettingsLink.tsx');
    expect(link).not.toMatch(/analytics\/(controller|consent|forget)'/);
  });

  it('sets no aria-expanded on the footer button (it is not a disclosure)', () => {
    expect(code('src/components/analytics/PrivacySettingsLink.tsx')).not.toMatch(/aria-expanded/);
  });
});
