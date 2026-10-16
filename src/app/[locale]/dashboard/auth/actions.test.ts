import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.fn();
const getAdminAccessToken = vi.fn();
const revalidatePath = vi.fn();
const client = {
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  getUser: vi.fn(),
  resetPassword: vi.fn(),
  createDeviceClient: vi.fn(),
  deleteDeviceClient: vi.fn(),
};

vi.mock('@/auth', () => ({ auth }));
vi.mock('next/cache', () => ({ revalidatePath }));
vi.mock('@/lib/authadmin/accessToken', () => ({ getAdminAccessToken }));
vi.mock('@/lib/authadmin/client', async (orig) => ({ ...(await orig<object>()), ...client }));

const actions = await import('./actions');
const IDLE = { status: 'idle' } as const;

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
const validUser = { username: 'alice', email: 'a@x.ch', password: 'x'.repeat(10), role: 'USER' };

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { role: 'ADMIN' } });
  getAdminAccessToken.mockResolvedValue({ ok: true, token: 'admin-token', subject: 'dominic' });
  client.getUser.mockResolvedValue({ ok: true, data: { id: 9, username: 'someone-else' } });
});

describe('role gate', () => {
  it('rejects a missing session', async () => {
    auth.mockResolvedValue(null);
    expect(await actions.createUserAction(IDLE, fd(validUser))).toEqual({ status: 'error', code: 'session' });
    expect(client.createUser).not.toHaveBeenCalled();
  });

  it('treats a throwing auth() as no session', async () => {
    auth.mockRejectedValue(new Error('bad cookie'));
    expect(await actions.deleteUserAction(IDLE, fd({ id: '1' }))).toEqual({ status: 'error', code: 'session' });
  });

  it.each([{ role: 'USER' }, {}, { role: 'admin' }])('rejects a non-ADMIN session (%o)', async (user) => {
    auth.mockResolvedValue({ user });
    expect(await actions.deleteDeviceClientAction(IDLE, fd({ clientId: 'terra1' }))).toEqual({ status: 'error', code: 'forbidden' });
    expect(client.deleteDeviceClient).not.toHaveBeenCalled();
  });

  it('asks to sign in again when no access token is available', async () => {
    getAdminAccessToken.mockResolvedValue({ ok: false, reason: 'no_token' });
    expect(await actions.createUserAction(IDLE, fd(validUser))).toEqual({ status: 'error', code: 'session' });
    expect(client.createUser).not.toHaveBeenCalled();
  });
});

describe('mutations', () => {
  it('checks the session before reporting validation errors', async () => {
    auth.mockResolvedValue(null);
    expect(await actions.createUserAction(IDLE, fd({ ...validUser, email: 'nope' }))).toEqual({ status: 'error', code: 'session' });
  });

  it('validates before calling auth-service', async () => {
    const r = await actions.createUserAction(IDLE, fd({ ...validUser, email: 'nope' }));
    expect(r).toEqual({ status: 'error', code: 'validation', fieldErrors: { email: 'email' } });
    expect(client.createUser).not.toHaveBeenCalled();
  });

  it('creates a user with the admin token and revalidates the page', async () => {
    client.createUser.mockResolvedValue({ ok: true, data: {} });
    expect(await actions.createUserAction(IDLE, fd(validUser))).toEqual({ status: 'ok' });
    expect(client.createUser).toHaveBeenCalledWith('admin-token', validUser);
    expect(revalidatePath).toHaveBeenCalledWith('/[locale]/dashboard/auth', 'page');
  });

  it('updates a user by id', async () => {
    client.updateUser.mockResolvedValue({ ok: true, data: {} });
    await actions.updateUserAction(IDLE, fd({ id: '5', username: 'alice', email: 'a@x.ch', role: 'ADMIN', status: 'INACTIVE' }));
    expect(client.updateUser).toHaveBeenCalledWith('admin-token', 5, { username: 'alice', email: 'a@x.ch', role: 'ADMIN', status: 'INACTIVE' });
  });

  it('refuses to delete the signed-in admin', async () => {
    client.getUser.mockResolvedValue({ ok: true, data: { id: 2, username: 'dominic' } });
    expect(await actions.deleteUserAction(IDLE, fd({ id: '2' }))).toEqual({ status: 'error', code: 'self' });
    expect(client.deleteUser).not.toHaveBeenCalled();
  });

  it.each([
    { role: 'USER', status: 'ACTIVE' },
    { role: 'ADMIN', status: 'INACTIVE' },
  ])('refuses to demote or deactivate the signed-in admin (%o)', async (change) => {
    client.getUser.mockResolvedValue({ ok: true, data: { id: 2, username: 'dominic' } });
    const r = await actions.updateUserAction(IDLE, fd({ id: '2', username: 'dominic', email: 'd@x.ch', ...change }));
    expect(r).toEqual({ status: 'error', code: 'self' });
    expect(client.updateUser).not.toHaveBeenCalled();
  });

  it('lets the admin change their own email', async () => {
    client.getUser.mockResolvedValue({ ok: true, data: { id: 2, username: 'dominic' } });
    client.updateUser.mockResolvedValue({ ok: true, data: {} });
    expect(await actions.updateUserAction(IDLE, fd({ id: '2', username: 'dominic', email: 'new@x.ch', role: 'ADMIN', status: 'ACTIVE' }))).toEqual({ status: 'ok' });
  });

  it('refuses to rename the signed-in admin (would detach the session subject)', async () => {
    client.getUser.mockResolvedValue({ ok: true, data: { id: 2, username: 'dominic' } });
    const r = await actions.updateUserAction(IDLE, fd({ id: '2', username: 'dominic2', email: 'd@x.ch', role: 'ADMIN', status: 'ACTIVE' }));
    expect(r).toEqual({ status: 'error', code: 'self' });
    expect(client.updateUser).not.toHaveBeenCalled();
  });

  it('fails closed when the admin subject is unknown', async () => {
    getAdminAccessToken.mockResolvedValue({ ok: true, token: 'admin-token', subject: null });
    expect(await actions.deleteUserAction(IDLE, fd({ id: '9' }))).toEqual({ status: 'error', code: 'self' });
  });

  it('maps auth-service failures to action errors', async () => {
    client.createUser.mockResolvedValue({ ok: false, kind: 'bad_request', message: 'Username already taken: alice' });
    expect(await actions.createUserAction(IDLE, fd(validUser))).toEqual({
      status: 'error',
      code: 'validation',
      message: 'Username already taken: alice',
      fieldErrors: undefined,
    });
    client.createUser.mockResolvedValue({ ok: false, kind: 'unauthorized' });
    expect(await actions.createUserAction(IDLE, fd(validUser))).toEqual({ status: 'error', code: 'session' });
    client.createUser.mockResolvedValue({ ok: false, kind: 'unavailable' });
    expect(await actions.createUserAction(IDLE, fd(validUser))).toEqual({ status: 'error', code: 'unavailable' });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('returns the one-time device secret only from the create call', async () => {
    client.createDeviceClient.mockResolvedValue({
      ok: true,
      data: { clientId: 'terra1', clientSecret: 's3cr3t', scopes: ['mqtt:pub'], createdAt: null },
    });
    expect(await actions.createDeviceClientAction(IDLE, fd({ clientId: 'terra1', description: 'Greenhouse' }))).toEqual({
      status: 'ok',
      created: { clientId: 'terra1', clientSecret: 's3cr3t' },
    });
    expect(client.createDeviceClient).toHaveBeenCalledWith('admin-token', { clientId: 'terra1', description: 'Greenhouse' });
  });

  it('rejects an invalid client id on revoke', async () => {
    expect(await actions.deleteDeviceClientAction(IDLE, fd({ clientId: '../users' }))).toEqual({
      status: 'error',
      code: 'validation',
      fieldErrors: { clientId: 'clientId' },
    });
    expect(client.deleteDeviceClient).not.toHaveBeenCalled();
  });

  it('does not revalidate after a password reset', async () => {
    client.resetPassword.mockResolvedValue({ ok: true, data: null });
    expect(await actions.resetPasswordAction(IDLE, fd({ id: '2', newPassword: 'longenough' }))).toEqual({ status: 'ok' });
    expect(client.resetPassword).toHaveBeenCalledWith('admin-token', 2, 'longenough');
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
