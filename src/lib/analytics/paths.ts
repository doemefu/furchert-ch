// Path rules for first-party web analytics (spec 100 §3.3, §4.1). WA-2b adds
// TRACKED_PATHS and NAV_TARGETS here. Kept free of other imports so the
// footer link can use it without pulling in the consent controller.

/** Locale-free paths where the bar never shows and nothing starts (§4.1). */
export function isBarSuppressedPath(path: string): boolean {
  return path === '/dashboard' || path.startsWith('/dashboard/');
}
