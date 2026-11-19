// Navigation structure shared by the desktop nav and the phone menu. Homelab is
// deliberately absent: the dashboard link lives in the footer only.
export const BUSINESS_NAV = ['automation', 'contact'] as const;
export const ABOUT_NAV = ['about', 'it', 'rowing', 'projects'] as const;
export const DESKTOP_NAV = ['automation', 'about', 'it', 'rowing', 'projects'] as const;

export type NavKey = (typeof BUSINESS_NAV)[number] | (typeof ABOUT_NAV)[number];

/** True when `pathname` (locale-less) is the page `key` or below it. */
export function isNavActive(pathname: string, key: string): boolean {
  return pathname === `/${key}` || pathname.startsWith(`/${key}/`);
}
