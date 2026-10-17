import { describe, expect, it } from 'vitest';
import { isSameOriginRequest } from './sameOrigin';

const ORIGIN = 'https://furchert.ch';
const check = (h: Record<string, string>) => isSameOriginRequest(new Headers(h), ORIGIN);

describe('isSameOriginRequest', () => {
  it('accepts same-origin and user-initiated (none) fetch metadata', () => {
    expect(check({ 'sec-fetch-site': 'same-origin' })).toBe(true);
    expect(check({ 'sec-fetch-site': 'none' })).toBe(true);
  });

  it('rejects cross-site and same-site fetch metadata, whatever Origin says', () => {
    expect(check({ 'sec-fetch-site': 'cross-site' })).toBe(false);
    expect(check({ 'sec-fetch-site': 'same-site' })).toBe(false);
    expect(check({ 'sec-fetch-site': 'cross-site', origin: ORIGIN })).toBe(false);
    expect(check({ 'sec-fetch-site': 'bogus' })).toBe(false);
  });

  it('falls back to Origin without fetch metadata', () => {
    expect(check({ origin: ORIGIN })).toBe(true);
    expect(check({ origin: 'https://evil.example' })).toBe(false);
    expect(check({ origin: 'https://auth.furchert.ch' })).toBe(false);
    expect(check({ origin: 'http://furchert.ch' })).toBe(false);
    expect(check({ origin: 'null' })).toBe(false);
  });

  it('accepts a request with neither header (not browser cross-site)', () => {
    expect(check({})).toBe(true);
  });
});
