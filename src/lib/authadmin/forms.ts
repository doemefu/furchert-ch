// Shared form contract for the /dashboard/auth Server Actions (#44): input
// validation mirroring auth-service's bean-validation rules
// (../auth-service/INTERFACES.md §4 + §8) and the serialisable action state.
// Pure module — imported by the Server Actions (authoritative check) and by
// the client forms (inline hints), so the two cannot drift.
import { USER_ROLES, USER_STATUSES, type UserRole, type UserStatus } from './userFields';

export type ActionErrorCode =
  | 'session' // no session, no stored token, or token rejected → sign in again
  | 'forbidden' // not ADMIN (here or at auth-service)
  | 'self' // would delete, deactivate or demote the signed-in admin's own account
  | 'validation'
  | 'conflict'
  | 'notFound'
  | 'unavailable'
  | 'unexpected';

export type ActionState =
  | { status: 'idle' }
  /** `created` carries a new device client's one-time secret — rendered once, never stored. */
  | { status: 'ok'; created?: { clientId: string; clientSecret: string } }
  | { status: 'error'; code: ActionErrorCode; message?: string; fieldErrors?: Record<string, string> };

export const IDLE: ActionState = { status: 'idle' };

// A pragmatic email check — auth-service's @Email is authoritative.
const EMAIL = /^[^\s@]+@[^\s@]+$/;
const CLIENT_ID = /^[a-z0-9-]{3,32}$/;

export type FieldErrors = Record<string, string>;

const str = (v: FormDataEntryValue | null): string => (typeof v === 'string' ? v : '');

export function checkUsername(v: string): string | null {
  return v.length >= 3 && v.length <= 50 ? null : 'username';
}
export function checkEmail(v: string): string | null {
  return v.length <= 100 && EMAIL.test(v) ? null : 'email';
}
export function checkPassword(v: string): string | null {
  return v.length >= 8 && v.length <= 72 ? null : 'password';
}
export function checkClientId(v: string): string | null {
  return CLIENT_ID.test(v) ? null : 'clientId';
}
export function checkDescription(v: string): string | null {
  return v.length <= 200 ? null : 'description';
}

/** Positive integer id from a form field, or null. */
export function parseId(v: FormDataEntryValue | null): number | null {
  const s = str(v);
  if (!/^[1-9]\d{0,17}$/.test(s)) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) ? n : null;
}

const asRoleValue = (v: string): UserRole | null => (USER_ROLES.includes(v as UserRole) ? (v as UserRole) : null);
const asStatusValue = (v: string): UserStatus | null =>
  USER_STATUSES.includes(v as UserStatus) ? (v as UserStatus) : null;

type Parsed<T> = { ok: true; value: T } | { ok: false; fieldErrors: FieldErrors };

function collect<T>(value: T, checks: Array<[string, string | null]>): Parsed<T> {
  const fieldErrors: FieldErrors = {};
  for (const [field, err] of checks) if (err) fieldErrors[field] = err;
  return Object.keys(fieldErrors).length > 0 ? { ok: false, fieldErrors } : { ok: true, value };
}

export function parseCreateUser(fd: FormData): Parsed<{ username: string; email: string; password: string; role: UserRole }> {
  const username = str(fd.get('username')).trim();
  const email = str(fd.get('email')).trim();
  // Passwords are taken verbatim — whitespace is significant.
  const password = str(fd.get('password'));
  const role = asRoleValue(str(fd.get('role')));
  return collect({ username, email, password, role: role ?? 'USER' }, [
    ['username', checkUsername(username)],
    ['email', checkEmail(email)],
    ['password', checkPassword(password)],
    ['role', role ? null : 'role'],
  ]);
}

export function parseUpdateUser(
  fd: FormData,
): Parsed<{ id: number; username: string; email: string; role: UserRole; status: UserStatus }> {
  const id = parseId(fd.get('id'));
  const username = str(fd.get('username')).trim();
  const email = str(fd.get('email')).trim();
  const role = asRoleValue(str(fd.get('role')));
  const status = asStatusValue(str(fd.get('status')));
  return collect({ id: id ?? 0, username, email, role: role ?? 'USER', status: status ?? 'ACTIVE' }, [
    ['id', id ? null : 'id'],
    ['username', checkUsername(username)],
    ['email', checkEmail(email)],
    ['role', role ? null : 'role'],
    ['status', status ? null : 'status'],
  ]);
}

export function parseResetPassword(fd: FormData): Parsed<{ id: number; newPassword: string }> {
  const id = parseId(fd.get('id'));
  const newPassword = str(fd.get('newPassword'));
  return collect({ id: id ?? 0, newPassword }, [
    ['id', id ? null : 'id'],
    ['newPassword', checkPassword(newPassword)],
  ]);
}

export function parseCreateDeviceClient(fd: FormData): Parsed<{ clientId: string; description?: string }> {
  const clientId = str(fd.get('clientId')).trim();
  const description = str(fd.get('description')).trim();
  return collect({ clientId, ...(description ? { description } : {}) }, [
    ['clientId', checkClientId(clientId)],
    ['description', checkDescription(description)],
  ]);
}

export function parseClientIdField(fd: FormData): string | null {
  const v = str(fd.get('clientId'));
  return checkClientId(v) ? null : v;
}
