import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDeviceClient,
  deleteDeviceClient,
  getHealth,
  getJwks,
  listDeviceClients,
  listUsers,
  parseJwks,
  parseUser,
  resetPassword,
  updateUser,
} from './client';

const USER = {
  id: 1,
  username: 'dominic',
  email: 'd@example.com',
  role: 'ADMIN',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
};

function respond(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv('AUTH_SERVICE_URL', 'http://auth.test/');
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('transport', () => {
  it('forwards the bearer token and builds the paged users URL', async () => {
    fetchMock.mockResolvedValue(respond(200, { users: [USER], page: 2, size: 50, totalElements: 101 }));
    const r = await listUsers('tok-123', 2, 50);
    expect(r).toEqual({ ok: true, data: { users: [USER], page: 2, size: 50, totalElements: 101 } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://auth.test/api/v1/users?page=2&size=50');
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBe('Bearer tok-123');
  });

  it('sends JSON bodies for mutations', async () => {
    fetchMock.mockResolvedValue(respond(200, USER));
    await updateUser('t', 7, { username: 'x', role: 'USER' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://auth.test/api/v1/users/7');
    expect(init.method).toBe('PUT');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ username: 'x', role: 'USER' });
  });

  it('treats 204 as success for no-content calls', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    expect(await resetPassword('t', 3, 'new-password')).toEqual({ ok: true, data: null });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ newPassword: 'new-password' });
  });

  it('url-encodes the device client id', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await deleteDeviceClient('t', 'a/b');
    expect(fetchMock.mock.calls[0][0]).toBe('http://auth.test/api/v1/clients/a%2Fb');
  });

  it('calls the public JWKS without a token', async () => {
    fetchMock.mockResolvedValue(respond(200, { keys: [] }));
    await getJwks();
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('reads a DOWN health body from a 503', async () => {
    fetchMock.mockResolvedValue(respond(503, { status: 'DOWN' }));
    expect(await getHealth()).toEqual({ ok: true, data: { status: 'DOWN' } });
  });

  it('is disabled outside production without AUTH_SERVICE_URL', async () => {
    vi.stubEnv('AUTH_SERVICE_URL', '');
    expect(await listDeviceClients('t')).toEqual({ ok: false, kind: 'disabled' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('error mapping', () => {
  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [500, 'unavailable'],
    [503, 'unavailable'],
    [418, 'unexpected'],
  ])('maps HTTP %i to %s', async (status, kind) => {
    fetchMock.mockResolvedValue(respond(status, { error: 'x' }));
    const r = await listDeviceClients('t');
    expect(r).toEqual({ ok: false, kind });
  });

  it('surfaces the message and field errors of a 400', async () => {
    fetchMock.mockResolvedValue(respond(400, { status: 400, error: 'Validation failed', details: { email: 'must be a well-formed email address' } }));
    const r = await listUsers('t', 0, 50);
    expect(r).toEqual({
      ok: false,
      kind: 'bad_request',
      message: 'Validation failed',
      fieldErrors: { email: 'must be a well-formed email address' },
    });
  });

  it('surfaces the message of a 409', async () => {
    fetchMock.mockResolvedValue(respond(409, { error: 'Client already exists: terra1' }));
    const r = await createDeviceClient('t', { clientId: 'terra1' });
    expect(r).toEqual({ ok: false, kind: 'conflict', message: 'Client already exists: terra1' });
  });

  it('maps a network failure to unavailable', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    expect(await listDeviceClients('t')).toEqual({ ok: false, kind: 'unavailable' });
  });

  it('rejects a body that does not match the documented shape', async () => {
    fetchMock.mockResolvedValue(respond(200, { users: [{ ...USER, role: 'ROOT' }], page: 0, size: 50, totalElements: 1 }));
    expect(await listUsers('t', 0, 50)).toEqual({ ok: false, kind: 'unexpected' });
  });

  it('never logs the token', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchMock.mockResolvedValue(respond(401));
    await listDeviceClients('secret-token');
    expect(warn.mock.calls.flat().join(' ')).not.toContain('secret-token');
  });
});

describe('shape guards', () => {
  it('accepts a documented user and rejects unknown status values', () => {
    expect(parseUser(USER)).toEqual(USER);
    expect(parseUser({ ...USER, status: 'DISABLED' })).toBeNull();
    expect(parseUser({ ...USER, id: '1' })).toBeNull();
  });

  it('derives the RSA modulus size from the JWK', () => {
    const n = Buffer.alloc(256, 0xff).toString('base64url');
    expect(parseJwks({ keys: [{ kty: 'RSA', kid: 'k1', alg: 'RS256', use: 'sig', n, e: 'AQAB' }] })).toEqual([
      { kid: 'k1', kty: 'RSA', alg: 'RS256', use: 'sig', bits: 2048 },
    ]);
    expect(parseJwks({ nope: [] })).toBeNull();
  });
});
