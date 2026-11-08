import { describe, expect, it } from 'vitest';
import {
  clearVisitorCookie,
  currentVisitorId,
  hasSessionCookie,
  mintVisitorCookie,
  readVisitorCookie,
  visitorCookieExpiry,
} from './cookie';

const id = '3f0c2a1e-8b7d-4c6e-9a5f-1b2c3d4e5f60';

describe('fa_vid', () => {
  it('reads the cookie value and accepts only well-formed current-version ids', () => {
    expect(readVisitorCookie(`a=1; fa_vid=${id}.1; b=2`)).toBe(`${id}.1`);
    expect(readVisitorCookie('a=1')).toBeNull();
    expect(currentVisitorId(`${id}.1`)).toBe(id);
    for (const v of [`${id}.2`, `${id}`, `${id.toUpperCase()}.1`, 'x.1', '', null]) expect(currentVisitorId(v), String(v)).toBeNull();
  });

  it('mints with the exact attributes and a fixed expiry of consentDate + 365 d, 00:00 UTC', () => {
    expect(visitorCookieExpiry('2026-11-08')).toBe('Mon, 08 Nov 2027 00:00:00 GMT');
    expect(mintVisitorCookie(id, '2026-11-08', true)).toBe(
      `fa_vid=${id}.1; Path=/; Expires=Mon, 08 Nov 2027 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax`,
    );
    expect(mintVisitorCookie(id, '2026-11-08', false)).not.toContain('Secure');
  });

  it('clears with Max-Age=0 and the same path and flags', () => {
    expect(clearVisitorCookie(true)).toBe('fa_vid=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax');
  });

  it('detects the Auth.js session cookie by name only, incl. chunks', () => {
    expect(hasSessionCookie('__Secure-authjs.session-token=abc')).toBe(true);
    expect(hasSessionCookie('x=1; authjs.session-token.0=abc')).toBe(true);
    expect(hasSessionCookie('authjs.csrf-token=abc; fa_vid=x')).toBe(false);
    expect(hasSessionCookie(null)).toBe(false);
  });
});
