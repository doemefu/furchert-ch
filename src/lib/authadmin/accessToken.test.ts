import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JWT } from 'next-auth/jwt';

vi.mock('next/headers', () => ({ headers: vi.fn() }));
vi.mock('next-auth/jwt', () => ({ getToken: vi.fn() }));

const { resolveAdminAccessToken, clearAdminTokenCache } = await import('./accessToken');

const NOW = 1_800_000_000;

beforeEach(() => clearAdminTokenCache());

describe('resolveAdminAccessToken', () => {
  it('reports a missing session or a session without a stored token', async () => {
    expect(await resolveAdminAccessToken(null, NOW)).toEqual({ ok: false, reason: 'no_session' });
    expect(await resolveAdminAccessToken({ role: 'ADMIN' } as JWT, NOW)).toEqual({ ok: false, reason: 'no_token' });
  });

  it('returns a still-valid access token without refreshing', async () => {
    const refresh = vi.fn();
    const jwt = { accessToken: 'at', refreshToken: 'rt', accessTokenExpiresAt: NOW + 600 } as JWT;
    expect(await resolveAdminAccessToken({ ...jwt, sub: 'dominic' }, NOW, refresh)).toEqual({ ok: true, token: 'at', subject: 'dominic' });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('refreshes within the expiry skew and caches the result', async () => {
    const refresh = vi.fn().mockResolvedValue({ token: 'fresh', expiresAt: NOW + 900 });
    const jwt = { accessToken: 'at', refreshToken: 'rt', accessTokenExpiresAt: NOW + 30 } as JWT;
    expect(await resolveAdminAccessToken(jwt, NOW, refresh)).toEqual({ ok: true, token: 'fresh', subject: null });
    expect(await resolveAdminAccessToken(jwt, NOW + 10, refresh)).toEqual({ ok: true, token: 'fresh', subject: null });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith('rt', NOW);
  });

  it('de-duplicates concurrent refreshes', async () => {
    let release: (v: { token: string; expiresAt: number }) => void = () => {};
    const refresh = vi.fn().mockReturnValue(new Promise((r) => (release = r)));
    const jwt = { accessToken: 'at', refreshToken: 'rt', accessTokenExpiresAt: NOW - 1 } as JWT;
    const a = resolveAdminAccessToken(jwt, NOW, refresh);
    const b = resolveAdminAccessToken(jwt, NOW, refresh);
    release({ token: 'fresh', expiresAt: NOW + 900 });
    expect(await Promise.all([a, b])).toEqual([
      { ok: true, token: 'fresh', subject: null },
      { ok: true, token: 'fresh', subject: null },
    ]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('reports expired when the refresh fails or no refresh token exists', async () => {
    const jwt = { accessToken: 'at', refreshToken: 'rt', accessTokenExpiresAt: NOW - 1 } as JWT;
    expect(await resolveAdminAccessToken(jwt, NOW, vi.fn().mockResolvedValue(null))).toEqual({ ok: false, reason: 'expired' });
    expect(await resolveAdminAccessToken({ accessToken: 'at', accessTokenExpiresAt: NOW - 1 } as JWT, NOW)).toEqual({
      ok: false,
      reason: 'expired',
    });
  });

  it('does not retry a failed refresh within the back-off window', async () => {
    const jwt = { accessToken: 'at', refreshToken: 'dead', accessTokenExpiresAt: NOW - 1 } as JWT;
    const refresh = vi.fn().mockResolvedValue(null);
    await resolveAdminAccessToken(jwt, NOW, refresh);
    expect(await resolveAdminAccessToken(jwt, NOW + 10, refresh)).toEqual({ ok: false, reason: 'expired' });
    expect(refresh).toHaveBeenCalledTimes(1);
    await resolveAdminAccessToken(jwt, NOW + 31, refresh);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('refreshes when the expiry is unknown', async () => {
    const refresh = vi.fn().mockResolvedValue({ token: 'fresh', expiresAt: NOW + 900 });
    expect(await resolveAdminAccessToken({ accessToken: 'at', refreshToken: 'rt' } as JWT, NOW, refresh)).toEqual({ ok: true, token: 'fresh', subject: null });
  });
});
