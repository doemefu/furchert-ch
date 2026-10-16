'use server';

// Server Actions behind /dashboard/auth (#44). Every action re-checks the
// session and the ADMIN role here — the page-level gate is not trusted for
// mutations — then calls auth-service with the admin's own access token
// (`lib/authadmin/accessToken.ts`). The admin cannot delete, deactivate or
// demote their own account (auth-service does not prevent it, and the last
// ADMIN would be locked out). Next.js rejects cross-origin Server
// Action POSTs (Origin vs Host check), so no extra CSRF token is needed.
// Nothing here logs request bodies, passwords or device client secrets.
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { asRole } from '@/auth.config';
import { getAdminAccessToken } from '@/lib/authadmin/accessToken';
import {
  createDeviceClient,
  createUser,
  deleteDeviceClient,
  deleteUser,
  getUser,
  resetPassword,
  updateUser,
  type AuthAdminFailure,
} from '@/lib/authadmin/client';
import {
  parseClientIdField,
  parseCreateDeviceClient,
  parseCreateUser,
  parseId,
  parseResetPassword,
  parseUpdateUser,
  type ActionErrorCode,
  type ActionState,
} from '@/lib/authadmin/forms';

const PAGE_PATH = '/[locale]/dashboard/auth';

const fail = (code: ActionErrorCode, extra?: Partial<Extract<ActionState, { status: 'error' }>>): ActionState => ({
  status: 'error',
  code,
  ...extra,
});

type Admin = { ok: true; token: string; subject: string | null };

async function requireAdminToken(): Promise<Admin | { ok: false; state: ActionState }> {
  let session = null;
  try {
    session = await auth();
  } catch {
    session = null;
  }
  if (!session) return { ok: false, state: fail('session') };
  if (asRole(session.user?.role) !== 'ADMIN') return { ok: false, state: fail('forbidden') };
  const token = await getAdminAccessToken();
  if (!token.ok) return { ok: false, state: fail('session') };
  return { ok: true, token: token.token, subject: token.subject };
}

// True when user `id` is the signed-in admin. An unknown subject fails closed
// (treated as self) so the guard can never be skipped silently.
async function isSelf(admin: Admin, id: number): Promise<{ ok: true; self: boolean } | { ok: false; state: ActionState }> {
  if (!admin.subject) return { ok: true, self: true };
  const target = await getUser(admin.token, id);
  if (!target.ok) return { ok: false, state: fromFailure(target) };
  return { ok: true, self: target.data.username === admin.subject };
}

function fromFailure(f: AuthAdminFailure): ActionState {
  switch (f.kind) {
    case 'unauthorized':
      return fail('session');
    case 'forbidden':
      return fail('forbidden');
    case 'bad_request':
      return fail('validation', { message: f.message, fieldErrors: f.fieldErrors });
    case 'conflict':
      return fail('conflict', { message: f.message });
    case 'not_found':
      return fail('notFound');
    case 'unexpected':
      return fail('unexpected');
    default:
      return fail('unavailable');
  }
}

function done(): ActionState {
  revalidatePath(PAGE_PATH, 'page');
  return { status: 'ok' };
}

export async function createUserAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdminToken();
  if (!admin.ok) return admin.state;
  const input = parseCreateUser(fd);
  if (!input.ok) return fail('validation', { fieldErrors: input.fieldErrors });
  const r = await createUser(admin.token, input.value);
  return r.ok ? done() : fromFailure(r);
}

export async function updateUserAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdminToken();
  if (!admin.ok) return admin.state;
  const input = parseUpdateUser(fd);
  if (!input.ok) return fail('validation', { fieldErrors: input.fieldErrors });
  const { id, ...rest } = input.value;
  // The own account keeps ADMIN, ACTIVE and its username: renaming would
  // detach it from the session's `sub` and defeat this very check.
  const self = await isSelf(admin, id);
  if (!self.ok) return self.state;
  if (self.self && (rest.role !== 'ADMIN' || rest.status !== 'ACTIVE' || rest.username !== admin.subject)) {
    return fail('self');
  }
  const r = await updateUser(admin.token, id, rest);
  return r.ok ? done() : fromFailure(r);
}

export async function deleteUserAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdminToken();
  if (!admin.ok) return admin.state;
  const id = parseId(fd.get('id'));
  if (!id) return fail('validation', { fieldErrors: { id: 'id' } });
  const self = await isSelf(admin, id);
  if (!self.ok) return self.state;
  if (self.self) return fail('self');
  const r = await deleteUser(admin.token, id);
  return r.ok ? done() : fromFailure(r);
}

export async function resetPasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdminToken();
  if (!admin.ok) return admin.state;
  const input = parseResetPassword(fd);
  if (!input.ok) return fail('validation', { fieldErrors: input.fieldErrors });
  const r = await resetPassword(admin.token, input.value.id, input.value.newPassword);
  // A reset does not change any listed field — nothing to revalidate.
  return r.ok ? { status: 'ok' } : fromFailure(r);
}

export async function createDeviceClientAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdminToken();
  if (!admin.ok) return admin.state;
  const input = parseCreateDeviceClient(fd);
  if (!input.ok) return fail('validation', { fieldErrors: input.fieldErrors });
  const r = await createDeviceClient(admin.token, input.value);
  if (!r.ok) return fromFailure(r);
  revalidatePath(PAGE_PATH, 'page');
  return { status: 'ok', created: { clientId: r.data.clientId, clientSecret: r.data.clientSecret } };
}

export async function deleteDeviceClientAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdminToken();
  if (!admin.ok) return admin.state;
  const clientId = parseClientIdField(fd);
  if (clientId === null) return fail('validation', { fieldErrors: { clientId: 'clientId' } });
  const r = await deleteDeviceClient(admin.token, clientId);
  return r.ok ? done() : fromFailure(r);
}
