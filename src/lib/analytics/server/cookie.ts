// The visitor-id cookie `fa_vid` (spec 100 §4.2, K2): set only by the server,
// `<uuid v4>.<consent version>`, HttpOnly, SameSite=Lax, Path=/, fixed expiry
// consentDate + 365 days at 00:00 UTC, never sliding; `Secure` in production.
// `fa_forget` (§4.2, §5.4; WA-5 #157): the ids whose erasure is still pending,
// up to four UUIDs joined by "." (review M5), HttpOnly, SameSite=Strict,
// Path=/api/v/forget, 30 days.
import { ANALYTICS_CONSENT_VERSION, CONSENT_LIFETIME_DAYS } from '../consent';

export const VISITOR_COOKIE = 'fa_vid';
export const FORGET_COOKIE = 'fa_forget';
export const FORGET_COOKIE_MAX_IDS = 4;
const FORGET_MAX_AGE_S = 30 * 86_400;
/** UUID v4, lowercase: the one id pattern of both cookies (review L12). */
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const VALUE = new RegExp(`^(${UUID})\\.(\\d{1,4})$`);
const FORGET_VALUE = new RegExp(`^${UUID}(?:\\.${UUID}){0,${FORGET_COOKIE_MAX_IDS - 1}}$`);

/** Reads a cookie from a Cookie header (first occurrence). */
export function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

/** Reads `fa_vid` from a Cookie header (first occurrence). */
export function readVisitorCookie(cookieHeader: string | null): string | null {
  return readCookie(cookieHeader, VISITOR_COOKIE);
}

/** The visitor id of a well-formed `fa_vid` of any consent version (forget erases stale ids too). */
export function anyVisitorId(value: string | null): string | null {
  const m = value ? VALUE.exec(value) : null;
  return m ? m[1] : null;
}

/** The ids of a well-formed `fa_forget` (1 to 4 UUIDs), else null. */
export function parseForgetCookie(value: string): string[] | null {
  return FORGET_VALUE.test(value) ? value.split('.') : null;
}

export function setForgetCookie(ids: string[], secure: boolean): string {
  return [`${FORGET_COOKIE}=${ids.join('.')}`, 'Path=/api/v/forget', `Max-Age=${FORGET_MAX_AGE_S}`, 'HttpOnly', ...(secure ? ['Secure'] : []), 'SameSite=Strict'].join('; ');
}

export function clearForgetCookie(secure: boolean): string {
  return [`${FORGET_COOKIE}=`, 'Path=/api/v/forget', 'Max-Age=0', 'HttpOnly', ...(secure ? ['Secure'] : []), 'SameSite=Strict'].join('; ');
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
