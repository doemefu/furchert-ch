import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getToken = vi.fn();
vi.mock('next-auth/jwt', () => ({ getToken }));

const { POST } = await import('./route');

// Behind Cloudflare Tunnel the request URL the app sees is internal
// (HOSTNAME=0.0.0.0 in the image), not the public origin.
const internalRequest = () =>
  new NextRequest('http://0.0.0.0:3000/api/federated-logout', {
    method: 'POST',
    headers: { 'sec-fetch-site': 'same-origin' },
  });

describe('POST /api/federated-logout', () => {
  beforeEach(() => {
    vi.stubEnv('AUTH_URL', 'https://furchert.ch');
    vi.stubEnv('AUTH_SECRET', 'test-only-not-a-secret');
    getToken.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // The form POST's redirect target must be the public origin: browsers apply
  // the enforced CSP `form-action` to it, and an internal origin is
  // unreachable anyway (#42).
  it('sends a visitor without a session home to the public origin', async () => {
    getToken.mockResolvedValue(null);
    const res = await POST(internalRequest());
    expect(res.headers.get('location')).toBe('https://furchert.ch/');
  });

  it('sends a session without id_token home to the public origin', async () => {
    getToken.mockResolvedValue({ sub: 'u1' });
    const res = await POST(internalRequest());
    expect(res.headers.get('location')).toBe('https://furchert.ch/');
  });

  it('redirects a full session to the IdP end-session endpoint', async () => {
    getToken.mockResolvedValue({ sub: 'u1', idToken: 'id-token-placeholder' });
    const res = await POST(internalRequest());
    const location = new URL(res.headers.get('location') ?? '');
    expect(location.origin + location.pathname).toBe('https://auth.furchert.ch/connect/logout');
    expect(location.searchParams.get('post_logout_redirect_uri')).toBe('https://furchert.ch');
  });
});
