// The visitor-id cookie `fa_vid` (spec 100 §4.2, K2): set only by the server,
// `<uuid v4>.<consent version>`, HttpOnly, SameSite=Lax, Path=/, fixed expiry
// consentDate + 365 days at 00:00 UTC, never sliding; `Secure` in production.
import { ANALYTICS_CONSENT_VERSION, CONSENT_LIFETIME_DAYS } from '../consent';

export const VISITOR_COOKIE = 'fa_vid';
const VALUE = /^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(\d{1,4})$/;

/** Reads `fa_vid` from a Cookie header (first occurrence). */
export function readVisitorCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === VISITOR_COOKIE) return part.slice(i + 1).trim();
  }
  return null;
}

/** The visitor id if the cookie is well-formed and of the current consent version. */
export function currentVisitorId(value: string | null): string | null {
  const m = value ? VALUE.exec(value) : null;
  return m && Number(m[2]) === ANALYTICS_CONSENT_VERSION ? m[1] : null;
}

/** consentDate + 365 days, 00:00 UTC, as an HTTP date. */
export function visitorCookieExpiry(consentDate: string): string {
  const ms = Date.parse(`${consentDate}T00:00:00Z`) + CONSENT_LIFETIME_DAYS * 86_400_000;
  return new Date(ms).toUTCString();
}

export function mintVisitorCookie(visitorId: string, consentDate: string, secure: boolean): string {
  return [
    `${VISITOR_COOKIE}=${visitorId}.${ANALYTICS_CONSENT_VERSION}`,
    'Path=/',
    `Expires=${visitorCookieExpiry(consentDate)}`,
    'HttpOnly',
    ...(secure ? ['Secure'] : []),
    'SameSite=Lax',
  ].join('; ');
}

export function clearVisitorCookie(secure: boolean): string {
  return [`${VISITOR_COOKIE}=`, 'Max-Age=0', 'Path=/', 'HttpOnly', ...(secure ? ['Secure'] : []), 'SameSite=Lax'].join('; ');
}

/** Auth.js session cookie present (presence only, §5.3 step 6; chunked names included). */
export function hasSessionCookie(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  return cookieHeader
    .split(';')
    .map((p) => p.split('=', 1)[0].trim())
    .some((name) => name.startsWith('__Secure-authjs.session-token') || name.startsWith('authjs.session-token'));
}
