import { describe, expect, it } from 'vitest';
import { parseCreateDeviceClient, parseCreateUser, parseId, parseResetPassword, parseUpdateUser } from './forms';

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

describe('parseId', () => {
  it('accepts positive integers only', () => {
    expect(parseId('42')).toBe(42);
    for (const bad of ['0', '-1', '1.5', 'abc', '', '01', '99999999999999999999']) expect(parseId(bad)).toBeNull();
    expect(parseId(null)).toBeNull();
  });
});

describe('parseCreateUser', () => {
  it('accepts a valid user and trims username/email but not the password', () => {
    // Synthetic value built at runtime (no credential-looking literal for secret scanners).
    const padded = ` ${'x'.repeat(8)} `;
    const r = parseCreateUser(fd({ username: ' alice ', email: ' a@x.ch ', password: padded, role: 'ADMIN' }));
    expect(r).toEqual({ ok: true, value: { username: 'alice', email: 'a@x.ch', password: padded, role: 'ADMIN' } });
  });

  it('reports every invalid field', () => {
    const r = parseCreateUser(fd({ username: 'ab', email: 'nope', password: 'short', role: 'ROOT' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.fieldErrors).sort()).toEqual(['email', 'password', 'role', 'username']);
  });

  it('enforces the 72-character bcrypt password limit', () => {
    const r = parseCreateUser(fd({ username: 'alice', email: 'a@x.ch', password: 'x'.repeat(73), role: 'USER' }));
    expect(r.ok).toBe(false);
  });
});

describe('parseUpdateUser', () => {
  it('requires a valid id and status', () => {
    const ok = parseUpdateUser(fd({ id: '3', username: 'alice', email: 'a@x.ch', role: 'USER', status: 'INACTIVE' }));
    expect(ok).toEqual({ ok: true, value: { id: 3, username: 'alice', email: 'a@x.ch', role: 'USER', status: 'INACTIVE' } });
    const bad = parseUpdateUser(fd({ id: 'x', username: 'alice', email: 'a@x.ch', role: 'USER', status: 'DISABLED' }));
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(Object.keys(bad.fieldErrors).sort()).toEqual(['id', 'status']);
  });
});

describe('parseResetPassword', () => {
  it('validates the new password length', () => {
    expect(parseResetPassword(fd({ id: '1', newPassword: 'longenough' })).ok).toBe(true);
    expect(parseResetPassword(fd({ id: '1', newPassword: 'short' })).ok).toBe(false);
  });
});

describe('parseCreateDeviceClient', () => {
  it('applies the MQTT client id rule and drops an empty description', () => {
    expect(parseCreateDeviceClient(fd({ clientId: 'terra-1', description: '' }))).toEqual({ ok: true, value: { clientId: 'terra-1' } });
    expect(parseCreateDeviceClient(fd({ clientId: 'Terra_1', description: 'x' })).ok).toBe(false);
    expect(parseCreateDeviceClient(fd({ clientId: 'terra1', description: 'x'.repeat(201) })).ok).toBe(false);
  });
});
