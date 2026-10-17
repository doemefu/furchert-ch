// Server-only typed client for auth-service's admin REST API (#44;
// contract: ../auth-service/INTERFACES.md §4 "REST API" + §8 "IoT Device
// Clients"). Every call takes the signed-in admin's bearer token
// (`accessToken.ts`) and returns an `AuthAdminResult` instead of throwing,
// so a failure renders an honest state and nothing is ever fabricated.
//
// Logging: `[authadmin]` prefix, endpoint name + HTTP status only — never
// tokens, request bodies, passwords or the one-time device client secret.
import 'server-only';
import { AUTHADMIN_ENV, shouldAttemptAuthAdmin } from '@/authadmin.env';
import { USER_ROLES, USER_STATUSES, type UserRole, type UserStatus } from './userFields';

// ── response shapes ─────────────────────────────────────────────────────────

export { USER_ROLES, USER_STATUSES, type UserRole, type UserStatus };

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UserPage {
  users: AdminUser[];
  page: number;
  size: number;
  totalElements: number;
}

export interface DeviceClient {
  clientId: string;
  description: string | null;
  createdAt: string | null;
  scopes: string[];
}

/** POST /api/v1/clients response. `clientSecret` is shown exactly once — never log or persist it. */
export interface CreatedDeviceClient {
  clientId: string;
  clientSecret: string;
  scopes: string[];
  createdAt: string | null;
}

export interface JwksKey {
  kid: string | null;
  kty: string;
  alg: string | null;
  use: string | null;
  /** RSA modulus length in bits, when `n` is present. */
  bits: number | null;
}

// ── result type ─────────────────────────────────────────────────────────────

export type AuthAdminFailureKind =
  | 'disabled' // local dev without AUTH_SERVICE_URL
  | 'unavailable' // network error, timeout, 5xx
  | 'unauthorized' // 401: token expired/revoked
  | 'forbidden' // 403: caller is not ADMIN at auth-service
  | 'not_found' // 404: unknown id, or endpoint not deployed yet
  | 'bad_request' // 400: validation / duplicate username or email
  | 'conflict' // 409: device client id already exists
  | 'unexpected'; // body does not match the documented shape

export interface AuthAdminFailure {
  ok: false;
  kind: AuthAdminFailureKind;
  /** auth-service's `error` message for 400/409 (shown to the admin, never logged). */
  message?: string;
  /** auth-service's per-field validation messages for 400. */
  fieldErrors?: Record<string, string>;
}

export type AuthAdminResult<T> = { ok: true; data: T } | AuthAdminFailure;

// ── shape guards ────────────────────────────────────────────────────────────

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const strOrNull = (v: unknown): string | null => (typeof v === 'string' ? v : null);

export function parseUser(v: unknown): AdminUser | null {
  if (!isObj(v)) return null;
  const { id, username, email, role, status } = v;
  if (typeof id !== 'number' || !Number.isInteger(id)) return null;
  if (typeof username !== 'string' || typeof email !== 'string') return null;
  if (!USER_ROLES.includes(role as UserRole) || !USER_STATUSES.includes(status as UserStatus)) return null;
  return {
    id,
    username,
    email,
    role: role as UserRole,
    status: status as UserStatus,
    createdAt: strOrNull(v.createdAt),
    updatedAt: strOrNull(v.updatedAt),
  };
}

export function parseUserPage(v: unknown): UserPage | null {
  if (!isObj(v) || !Array.isArray(v.users)) return null;
  const { page, size, totalElements } = v;
  if (typeof page !== 'number' || typeof size !== 'number' || typeof totalElements !== 'number') return null;
  const users: AdminUser[] = [];
  for (const raw of v.users) {
    const u = parseUser(raw);
    if (!u) return null;
    users.push(u);
  }
  return { users, page, size, totalElements };
}

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === 'string');

export function parseDeviceClient(v: unknown): DeviceClient | null {
  if (!isObj(v) || typeof v.clientId !== 'string' || !isStringArray(v.scopes)) return null;
  return { clientId: v.clientId, description: strOrNull(v.description), createdAt: strOrNull(v.createdAt), scopes: v.scopes };
}

export function parseCreatedDeviceClient(v: unknown): CreatedDeviceClient | null {
  if (!isObj(v) || typeof v.clientId !== 'string' || typeof v.clientSecret !== 'string' || v.clientSecret.length === 0) return null;
  if (!isStringArray(v.scopes)) return null;
  return { clientId: v.clientId, clientSecret: v.clientSecret, scopes: v.scopes, createdAt: strOrNull(v.createdAt) };
}

// base64url length → bit length of the RSA modulus (leading zero bytes trimmed by the encoder).
function modulusBits(n: unknown): number | null {
  if (typeof n !== 'string' || n.length === 0) return null;
  const bytes = Buffer.from(n, 'base64url');
  if (bytes.length === 0) return null;
  return (bytes.length - 1) * 8 + Math.floor(Math.log2(bytes[0])) + 1;
}

export function parseJwks(v: unknown): JwksKey[] | null {
  if (!isObj(v) || !Array.isArray(v.keys)) return null;
  const keys: JwksKey[] = [];
  for (const k of v.keys) {
    if (!isObj(k) || typeof k.kty !== 'string') return null;
    keys.push({ kid: strOrNull(k.kid), kty: k.kty, alg: strOrNull(k.alg), use: strOrNull(k.use), bits: modulusBits(k.n) });
  }
  return keys;
}

// ── transport ───────────────────────────────────────────────────────────────

interface Call {
  /** Endpoint label for logs — no ids, no query strings. */
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  token?: string;
  body?: unknown;
  /** Non-2xx statuses whose body is still the documented payload (actuator health answers DOWN with 503). */
  acceptStatus?: number[];
}

async function readErrorBody(res: Response): Promise<Pick<AuthAdminFailure, 'message' | 'fieldErrors'>> {
  try {
    const json: unknown = await res.json();
    if (!isObj(json)) return {};
    const message = typeof json.error === 'string' ? json.error.slice(0, 300) : undefined;
    let fieldErrors: Record<string, string> | undefined;
    if (isObj(json.details)) {
      fieldErrors = {};
      for (const [k, val] of Object.entries(json.details)) if (typeof val === 'string') fieldErrors[k] = val.slice(0, 300);
    }
    return { message, fieldErrors };
  } catch {
    return {};
  }
}

function kindFor(status: number): AuthAdminFailureKind {
  if (status === 400) return 'bad_request';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  return status >= 500 ? 'unavailable' : 'unexpected';
}

async function call(c: Call): Promise<AuthAdminResult<Response>> {
  if (!shouldAttemptAuthAdmin()) return { ok: false, kind: 'disabled' };
  let res: Response;
  try {
    res = await fetch(`${AUTHADMIN_ENV.AUTH_SERVICE_URL}${c.path}`, {
      method: c.method,
      headers: {
        Accept: 'application/json',
        ...(c.token ? { Authorization: `Bearer ${c.token}` } : {}),
        ...(c.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: c.body !== undefined ? JSON.stringify(c.body) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    console.warn(`[authadmin] ${c.name}: unreachable`);
    return { ok: false, kind: 'unavailable' };
  }
  if (!res.ok && !c.acceptStatus?.includes(res.status)) {
    console.warn(`[authadmin] ${c.name}: HTTP ${res.status}`);
    const kind = kindFor(res.status);
    const detail = kind === 'bad_request' || kind === 'conflict' ? await readErrorBody(res) : {};
    return { ok: false, kind, ...detail };
  }
  return { ok: true, data: res };
}

async function callJson<T>(c: Call, parse: (v: unknown) => T | null): Promise<AuthAdminResult<T>> {
  const r = await call(c);
  if (!r.ok) return r;
  let json: unknown;
  try {
    json = await r.data.json();
  } catch {
    json = undefined;
  }
  const data = parse(json);
  if (data === null) {
    console.warn(`[authadmin] ${c.name}: unexpected response shape`);
    return { ok: false, kind: 'unexpected' };
  }
  return { ok: true, data };
}

async function callNoContent(c: Call): Promise<AuthAdminResult<null>> {
  const r = await call(c);
  return r.ok ? { ok: true, data: null } : r;
}

// ── users (§4) ──────────────────────────────────────────────────────────────

export function listUsers(token: string, page: number, size: number): Promise<AuthAdminResult<UserPage>> {
  const q = new URLSearchParams({ page: String(page), size: String(size) });
  return callJson({ name: 'users.list', method: 'GET', path: `/api/v1/users?${q}`, token }, parseUserPage);
}

export function getUser(token: string, id: number): Promise<AuthAdminResult<AdminUser>> {
  return callJson({ name: 'users.get', method: 'GET', path: `/api/v1/users/${id}`, token }, parseUser);
}

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  role: UserRole;
}

export function createUser(token: string, input: CreateUserInput): Promise<AuthAdminResult<AdminUser>> {
  return callJson({ name: 'users.create', method: 'POST', path: '/api/v1/users', token, body: input }, parseUser);
}

export interface UpdateUserInput {
  username?: string;
  email?: string;
  role?: UserRole;
  status?: UserStatus;
}

export function updateUser(token: string, id: number, input: UpdateUserInput): Promise<AuthAdminResult<AdminUser>> {
  return callJson({ name: 'users.update', method: 'PUT', path: `/api/v1/users/${id}`, token, body: input }, parseUser);
}

export function deleteUser(token: string, id: number): Promise<AuthAdminResult<null>> {
  return callNoContent({ name: 'users.delete', method: 'DELETE', path: `/api/v1/users/${id}`, token });
}

/** Admin path: auth-service skips the current-password check for ADMIN callers. */
export function resetPassword(token: string, id: number, newPassword: string): Promise<AuthAdminResult<null>> {
  return callNoContent({
    name: 'users.resetPassword',
    method: 'POST',
    path: `/api/v1/users/${id}/reset-password`,
    token,
    body: { newPassword },
  });
}

// ── device clients (§8) ─────────────────────────────────────────────────────

function parseDeviceClients(v: unknown): DeviceClient[] | null {
  if (!Array.isArray(v)) return null;
  const out: DeviceClient[] = [];
  for (const raw of v) {
    const c = parseDeviceClient(raw);
    if (!c) return null;
    out.push(c);
  }
  return out;
}

export function listDeviceClients(token: string): Promise<AuthAdminResult<DeviceClient[]>> {
  return callJson({ name: 'clients.list', method: 'GET', path: '/api/v1/clients', token }, parseDeviceClients);
}

export function createDeviceClient(
  token: string,
  input: { clientId: string; description?: string },
): Promise<AuthAdminResult<CreatedDeviceClient>> {
  return callJson({ name: 'clients.create', method: 'POST', path: '/api/v1/clients', token, body: input }, parseCreatedDeviceClient);
}

export function deleteDeviceClient(token: string, clientId: string): Promise<AuthAdminResult<null>> {
  return callNoContent({
    name: 'clients.delete',
    method: 'DELETE',
    path: `/api/v1/clients/${encodeURIComponent(clientId)}`,
    token,
  });
}

// ── public JWKS (§3) ────────────────────────────────────────────────────────

export function getJwks(): Promise<AuthAdminResult<JwksKey[]>> {
  return callJson({ name: 'jwks', method: 'GET', path: '/oauth2/jwks' }, parseJwks);
}

// ── public health (actuator, permitAll) ─────────────────────────────────────

export function getHealth(): Promise<AuthAdminResult<{ status: string }>> {
  return callJson({ name: 'health', method: 'GET', path: '/actuator/health', acceptStatus: [503] }, (v) =>
    isObj(v) && typeof v.status === 'string' ? { status: v.status } : null,
  );
}
