'use server';

// Server Actions behind /dashboard/devices (#45). Same gate as
// /dashboard/auth (`../auth/actions.ts`): every action re-checks the session
// and the ADMIN role here — the page-level gate is not trusted for mutations —
// then calls device-service with the admin's own access token. device-service
// enforces ADMIN again for every write. Next.js rejects cross-origin Server
// Action POSTs (Origin vs Host check), so no extra CSRF token is needed.
// Inputs are validated before any URL is built; nothing here logs bodies or
// tokens, and no returned state carries the token.
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { asRole } from '@/auth.config';
import { getAdminAccessToken } from '@/lib/authadmin/accessToken';
import {
  controlDevice,
  createSchedule,
  deleteSchedule,
  getSchedule,
  updateSchedule,
  type DeviceAdminFailure,
} from '@/lib/deviceadmin/client';
import { isDeviceField } from '@/lib/deviceadmin/fields';
import {
  parseActive,
  parseControl,
  parseSchedule,
  parseScheduleId,
  type DeviceActionErrorCode,
  type DeviceActionState,
} from '@/lib/deviceadmin/forms';

const PAGE_PATH = '/[locale]/dashboard/devices';

const fail = (
  code: DeviceActionErrorCode,
  extra?: Partial<Extract<DeviceActionState, { status: 'error' }>>,
): DeviceActionState => ({ status: 'error', code, ...extra });

async function requireAdminToken(): Promise<{ ok: true; token: string } | { ok: false; state: DeviceActionState }> {
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
  return { ok: true, token: token.token };
}

function fromFailure(f: DeviceAdminFailure): DeviceActionState {
  switch (f.kind) {
    case 'unauthorized':
      return fail('session');
    case 'forbidden':
      return fail('forbidden');
    case 'bad_request':
      return fail('validation', {
        ...(f.message ? { message: f.message } : {}),
        ...(f.details ? { details: f.details } : {}),
      });
    case 'not_found':
      return fail('notFound');
    case 'unexpected':
      return fail('unexpected');
    default:
      return fail('unavailable');
  }
}

export async function controlDeviceAction(_prev: DeviceActionState, fd: FormData): Promise<DeviceActionState> {
  const admin = await requireAdminToken();
  if (!admin.ok) return admin.state;
  const input = parseControl(fd);
  if (!input.ok) return fail('invalid', { fieldErrors: input.fieldErrors });
  const { id, field, state } = input.value;
  const r = await controlDevice(admin.token, id, { field, state });
  if (!r.ok) return fromFailure(r);
  revalidatePath(PAGE_PATH, 'page');
  return { status: 'ok', sent: { field, state } };
}

export async function saveScheduleAction(_prev: DeviceActionState, fd: FormData): Promise<DeviceActionState> {
  const admin = await requireAdminToken();
  if (!admin.ok) return admin.state;
  const input = parseSchedule(fd);
  if (!input.ok) return fail('invalid', { fieldErrors: input.fieldErrors });
  const { id, ...body } = input.value;
  const r = id === null ? await createSchedule(admin.token, body) : await updateSchedule(admin.token, id, body);
  if (!r.ok) return fromFailure(r);
  revalidatePath(PAGE_PATH, 'page');
  return { status: 'ok', saved: { id: r.data.id, active: r.data.active, nextRun: r.data.nextRun } };
}

export async function deleteScheduleAction(_prev: DeviceActionState, fd: FormData): Promise<DeviceActionState> {
  const admin = await requireAdminToken();
  if (!admin.ok) return admin.state;
  const id = parseScheduleId(fd);
  if (!id) return fail('invalid', { fieldErrors: { id: 'id' } });
  const r = await deleteSchedule(admin.token, id);
  if (!r.ok) return fromFailure(r);
  revalidatePath(PAGE_PATH, 'page');
  return { status: 'ok', deleted: id };
}

// PUT is a full replace, so the toggle re-reads the stored schedule instead
// of trusting fields from the browser, and refuses rows whose payload or
// fields are not the standard shape (a PUT would silently rewrite them).
export async function setScheduleActiveAction(_prev: DeviceActionState, fd: FormData): Promise<DeviceActionState> {
  const admin = await requireAdminToken();
  if (!admin.ok) return admin.state;
  const input = parseActive(fd);
  if (!input.ok) return fail('invalid', { fieldErrors: input.fieldErrors });
  const { id, active } = input.value;
  const current = await getSchedule(admin.token, id);
  if (!current.ok) return fromFailure(current);
  const s = current.data;
  if (s.state === null || !isDeviceField(s.field) || !s.deviceName || !s.cronExpression) return fail('payload');
  const r = await updateSchedule(admin.token, id, {
    deviceName: s.deviceName,
    field: s.field,
    state: s.state,
    cronExpression: s.cronExpression,
    active,
  });
  if (!r.ok) return fromFailure(r);
  revalidatePath(PAGE_PATH, 'page');
  return { status: 'ok', saved: { id: r.data.id, active: r.data.active, nextRun: r.data.nextRun } };
}
