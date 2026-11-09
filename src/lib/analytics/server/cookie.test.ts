import { describe, expect, it } from 'vitest';
import {
  anyVisitorId,
  clearForgetCookie,
  parseForgetCookie,
  setForgetCookie,
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

describe('fa_forget (§4.2, WA-5 M5, L12)', () => {
  const b = '9b1d2c3e-4f5a-4b6c-8d7e-0f1a2b3c4d5e';
  const c = '0a1b2c3d-4e5f-4a6b-9c7d-8e9f0a1b2c3d';
  const d = '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
  const e = '2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a';
  it('parses one to four lowercase UUID v4 values joined by "."', () => {
    expect(parseForgetCookie(id)).toEqual([id]);
    expect(parseForgetCookie(`${id}.${b}.${c}.${d}`)).toEqual([id, b, c, d]);
    for (const v of [`${id}.${b}.${c}.${d}.${e}`, `${id}.`, `${id.toUpperCase()}`, `${id}.1`, '', 'x', `${id},${b}`]) expect(parseForgetCookie(v), v).toBeNull();
  });
  it('erases any consent version of fa_vid', () => {
    expect(anyVisitorId(`${id}.1`)).toBe(id);
    expect(anyVisitorId(`${id}.7`)).toBe(id);
    expect(anyVisitorId(`${id}`)).toBeNull();
  });
  it('sets and clears with the exact attributes', () => {
    expect(setForgetCookie([id, b], true)).toBe(`fa_forget=${id}.${b}; Path=/api/v/forget; Max-Age=2592000; HttpOnly; Secure; SameSite=Strict`);
    expect(clearForgetCookie(false)).toBe('fa_forget=; Path=/api/v/forget; Max-Age=0; HttpOnly; SameSite=Strict');
  });
});
