// Path registry for the tracker and the collect route (spec 100 §3.3, §5.5,
// §6.2; WA-2b #154).
import { describe, expect, it } from 'vitest';
import { PAGE_LAST_MODIFIED } from '@/lib/seo/pages';
import { NAV_TARGETS, TRACKED_PATHS, canonicalNavTarget, canonicalPath, isTracked } from './registry';

const PATH_RULE = /^\/([a-z0-9][a-z0-9-]{0,63}(\/[a-z0-9][a-z0-9-]{0,63}){0,2})?$/;

describe('TRACKED_PATHS', () => {
  it('equals the sitemap pages minus the legal pages (literal list, H1)', () => {
    const expected = Object.keys(PAGE_LAST_MODIFIED)
      .filter((p) => p !== '/imprint' && p !== '/privacy')
      .sort();
    expect([...TRACKED_PATHS].sort()).toEqual(expected);
  });

  it('holds no dashboard path and only §6.2-shaped paths', () => {
    for (const p of TRACKED_PATHS) {
      expect(p.startsWith('/dashboard'), p).toBe(false);
      expect(p, p).toMatch(PATH_RULE);
      expect(p.length).toBeLessThanOrEqual(200);
    }
  });

  it('NAV_TARGETS adds exactly the legal pages and /dashboard', () => {
    expect([...NAV_TARGETS].sort()).toEqual([...TRACKED_PATHS, '/imprint', '/privacy', '/dashboard'].sort());
  });
});

describe('canonicalPath', () => {
  it('splits the locale and strips query, fragment and trailing slash', () => {
    expect(canonicalPath('/de/automation')).toEqual({ path: '/automation', locale: 'de' });
    expect(canonicalPath('/en/automation/?utm_source=x#faq')).toEqual({ path: '/automation', locale: 'en' });
    expect(canonicalPath('/de')).toEqual({ path: '/', locale: 'de' });
    expect(canonicalPath('/en/')).toEqual({ path: '/', locale: 'en' });
    expect(canonicalPath('/de/projects/homelab')).toEqual({ path: '/projects/homelab', locale: 'de' });
  });

  it('rejects paths without a locale, foreign origins and garbage', () => {
    for (const raw of ['/automation', '/fr/automation', 'https://evil.example/de', '//evil.example/de', '', 'javascript:alert(1)']) {
      expect(canonicalPath(raw), raw).toBeNull();
    }
  });

  it('isTracked drops the legal pages and unknown paths', () => {
    expect(isTracked('/automation')).toBe(true);
    expect(isTracked('/imprint')).toBe(false);
    expect(isTracked('/privacy')).toBe(false);
    expect(isTracked('/dashboard')).toBe(false);
    expect(isTracked('/nope')).toBe(false);
  });
});

describe('canonicalNavTarget (M2: the client sends the raw pathname)', () => {
  it('maps registered targets to the locale-free form, everything else to (other)', () => {
    expect(canonicalNavTarget('/de/automation')).toBe('/automation');
    expect(canonicalNavTarget('/en/privacy')).toBe('/privacy');
    expect(canonicalNavTarget('/de/dashboard')).toBe('/dashboard');
    expect(canonicalNavTarget('/de/dashboard/network')).toBe('(other)');
    expect(canonicalNavTarget('/de/unknown')).toBe('(other)');
    expect(canonicalNavTarget('not a path')).toBe('(other)');
    for (const t of NAV_TARGETS) expect(canonicalNavTarget(`/de${t === '/' ? '' : t}`)).toBe(t);
  });
});
