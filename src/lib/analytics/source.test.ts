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
  'src/lib/analytics/formHooks.ts',
  'src/components/analytics/ids.ts',
  'src/components/analytics/lazy.tsx',
  'src/components/analytics/Analytics.tsx',
  'src/components/analytics/ConsentBar.tsx',
  'src/components/analytics/PrivacySettingsLink.tsx',
];

describe('go-live switch', () => {
  it('ANALYTICS_UI_ENABLED is true since the WA-6 go-live (#158); a rollback changes it and this test together', () => {
    expect(code('src/lib/analytics/flags.ts')).toMatch(/export const ANALYTICS_UI_ENABLED: boolean = true;/);
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

  it('loads both entry points client-only, so no page preloads their chunks (F1)', () => {
    const lazy = code('src/components/analytics/lazy.tsx');
    expect(lazy.match(/dynamic\(/g)).toHaveLength(2);
    expect(lazy.match(/\{ ssr: false \}/g)).toHaveLength(2);
  });

  it('mounts <Analytics /> after the footer and outside <main>', () => {
    const layout = code('src/app/[locale]/layout.tsx');
    expect(layout.indexOf('<LazyAnalytics')).toBeGreaterThan(layout.indexOf('</main>'));
    expect(layout.indexOf('<LazyAnalytics')).toBeGreaterThan(layout.indexOf('<Footer />'));
  });
});

describe('nothing before consent', () => {
  // Device properties, lifecycle hooks and transports the consent layer must
  // never touch (§1.4, §3.9). The one exception (WA-5 #157, §4.1): the
  // controller's browser singleton reads the GPC/DNT signal, checked below.
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

  // The only navigator use allowed: the GPC/DNT signal in the controller singleton.
  const SIGNAL = /const n = navigator as Navigator & \{ globalPrivacyControl\?: boolean \};\s*return n\.globalPrivacyControl === true \|\| n\.doNotTrack === '1';/;

  // WA-6 (#158, owner decision): the bar waits for the first interaction. The only
  // scroll listener allowed is this one-shot list (passive, removed after firing,
  // never sends anything; behaviour pinned in controller.test.ts).
  const FIRST_INTERACTION = /export const FIRST_INTERACTION_EVENTS = \['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'\] as const;/;

  it('the controller listens for scroll only in the one-shot first-interaction list (WA-6)', () => {
    const src = code('src/lib/analytics/controller.ts');
    expect(src).toMatch(FIRST_INTERACTION);
    expect(src.replace(FIRST_INTERACTION, '').match(/['"]scroll['"]/g)).toBeNull();
  });

  it('the controller reads navigator only for globalPrivacyControl and doNotTrack (§4.1)', () => {
    const src = code('src/lib/analytics/controller.ts');
    expect(src).toMatch(SIGNAL);
    expect(src.replace(SIGNAL, '').match(/\bnavigator\b|\bn\.\w+/g)).toBeNull();
  });

  for (const file of CONSENT_FILES) {
    it(`${file} reads no device property and adds no scroll/unload listener`, () => {
      const src = code(file).replace(SIGNAL, '').replace(FIRST_INTERACTION, '');
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

describe('WA-2b wiring (#154)', () => {
  const TRACKER_FILES = ['index.ts', 'clicks.ts', 'engagement.ts', 'transport.ts'].map((f) => `src/lib/analytics/tracker/${f}`);

  it('the browser talks only to /api/v and /api/v/forget, and both routes exist', () => {
    for (const file of [...CONSENT_FILES, ...TRACKER_FILES]) {
      for (const m of code(file).matchAll(/['"`](\/api\/[^'"`]*)['"`]/g)) {
        expect(['/api/v', '/api/v/forget'], `${file}: ${m[1]}`).toContain(m[1]);
      }
    }
    expect(code('src/lib/analytics/tracker/transport.ts')).toMatch(/COLLECT_URL = '\/api\/v'/);
    expect(code('src/lib/analytics/forget.ts')).toMatch(/FORGET_ENDPOINT = '\/api\/v\/forget'/);
    for (const route of ['src/app/api/v/route.ts', 'src/app/api/v/forget/route.ts']) expect(code(route)).toMatch(/export function POST/);
  });

  it('the contact form reaches the consent layer only through formHooks (H2)', () => {
    const form = code('src/app/[locale]/contact/ContactForm.tsx');
    const imports = [...form.matchAll(/from '(@\/lib\/analytics\/[^']+)'/g)].map((m) => m[1]);
    expect(imports).toEqual(['@/lib/analytics/formHooks']);
    const hooks = code('src/lib/analytics/formHooks.ts');
    for (const marker of ['fa_forget_pending', 'fa-first-flush', 'consent-inner', 'fa-privacy-settings', 'fa_consent']) {
      expect(hooks, marker).not.toContain(marker);
    }
    expect(hooks).not.toMatch(/from '\.\/(controller|consent|tracker)/);
  });

  it('the tracker is loaded only by a dynamic import in the controller', () => {
    const controller = code('src/lib/analytics/controller.ts');
    expect(controller).toMatch(/import\('\.\/tracker'\)/);
    expect(controller).not.toMatch(/from '\.\/tracker/);
    for (const file of ['src/components/analytics/Analytics.tsx', 'src/components/analytics/lazy.tsx', 'src/components/analytics/PrivacySettingsLink.tsx']) {
      expect(code(file), file).not.toMatch(/analytics\/tracker/);
    }
  });

  it('registry.ts stays out of the consent controller and the footer button (H1)', () => {
    for (const file of CONSENT_FILES) expect(code(file), file).not.toMatch(/['/]registry'/);
    expect(code('src/lib/analytics/paths.ts')).not.toMatch(/^import /m);
  });
});
