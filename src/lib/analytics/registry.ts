// Path registry of first-party web analytics (spec 100 §3.3, §5.5, §6.2;
// WA-2b #154). Used by the tracker chunk and the collect route only, never by
// the consent controller or the footer button (their chunks must stay small).
// A literal list on purpose: importing src/lib/seo/pages.ts would pull SEO
// and lab data into the tracker chunk. registry.test.ts keeps it equal to the
// sitemap pages minus /imprint and /privacy.

export const TRACKED_PATHS = [
  '/',
  '/about',
  '/it',
  '/automation',
  '/rowing',
  '/projects',
  '/contact',
  '/projects/iot-platform',
  '/projects/homelab',
  '/projects/club-assist',
  '/projects/karaokee',
  '/projects/auth-service',
] as const;

export const NAV_TARGETS: readonly string[] = [...TRACKED_PATHS, '/imprint', '/privacy', '/dashboard'];

const TRACKED = new Set<string>(TRACKED_PATHS);
const NAV = new Set<string>(NAV_TARGETS);
const ORIGIN = 'https://furchert.ch';

export type SiteLocale = 'de' | 'en';

/**
 * Locale-free path and locale of a raw same-origin pathname, or null.
 * Drops query and fragment and a trailing slash; requires a `/de` or `/en`
 * prefix. Never throws.
 */
export function canonicalPath(raw: string): { path: string; locale: SiteLocale } | null {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) return null;
  let pathname: string;
  try {
    const url = new URL(raw, ORIGIN);
    if (url.origin !== ORIGIN) return null;
    pathname = url.pathname;
  } catch {
    return null;
  }
  const m = /^\/(de|en)(\/.*)?$/.exec(pathname);
  if (!m) return null;
  const rest = (m[2] ?? '/').replace(/\/+$/, '') || '/';
  return { path: rest, locale: m[1] as SiteLocale };
}

export function isTracked(path: string): boolean {
  return TRACKED.has(path);
}

/** Nav click target in the §6.2 locale-free form, or the literal `(other)`. */
export function canonicalNavTarget(raw: string): string {
  const c = canonicalPath(raw);
  return c && NAV.has(c.path) ? c.path : '(other)';
}
