import { afterEach, describe, expect, it, vi } from 'vitest';
import { basicAuth, sessionCookie } from './shared';

afterEach(() => vi.unstubAllEnvs());

const decode = (header: string) => Buffer.from(header.replace(/^Basic /, ''), 'base64').toString('utf8');

describe('basicAuth', () => {
  it('encodes id and secret as a Basic credential', () => {
    const secret = 's'.repeat(8);
    const header = basicAuth('furchert-ch', secret);
    expect(header.startsWith('Basic ')).toBe(true);
    expect(decode(header)).toBe(`furchert-ch:${secret}`);
  });

  it('percent-encodes both parts before Base64 (RFC 6749 §2.3.1)', () => {
    const secret = ['a', 'b'].join(':') + '/ü*!';
    expect(decode(basicAuth('my client', secret))).toBe('my%20client:a%3Ab%2F%C3%BC*!');
  });
});

describe('sessionCookie', () => {
  it('uses the __Secure- prefixed cookie in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(sessionCookie()).toEqual({ secureCookie: true, cookieName: '__Secure-authjs.session-token' });
  });

  it('uses the plain cookie outside production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(sessionCookie()).toEqual({ secureCookie: false, cookieName: 'authjs.session-token' });
    vi.stubEnv('NODE_ENV', 'test');
    expect(sessionCookie()).toEqual({ secureCookie: false, cookieName: 'authjs.session-token' });
  });
});
