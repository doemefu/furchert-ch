// Form contract for the /dashboard/devices Server Actions (#45): input
// validation mirroring device-service's bean validation (`ControlCommandDto`,
// `ScheduleRequest`; device-service README "Schedules") and the serialisable
// action state. Pure module — the Server Actions use it as the authoritative
// check, the client forms for inline hints.
import { parseId } from '@/lib/authadmin/forms';
import { checkCronSafety } from './cron';
import { isDeviceField, type DeviceField } from './fields';

export type DeviceActionErrorCode =
  | 'session' // no session, no stored token, or token rejected → sign in again
  | 'forbidden' // not ADMIN (here or at device-service)
  | 'invalid' // rejected here, before device-service was called
  | 'validation' // rejected by device-service (400)
  | 'payload' // the schedule's stored payload is not the standard shape, so a toggle would rewrite it
  | 'notFound'
  | 'unavailable'
  | 'unexpected';

export type DeviceActionState =
  | { status: 'idle' }
  | {
      status: 'ok';
      /** Manual command accepted by device-service (published to MQTT, not yet confirmed by the device). */
      sent?: { field: DeviceField; state: 0 | 1 };
      /** Schedule as stored by device-service; `nextRun` is the API's own reading of the expression. */
      saved?: { id: number; active: boolean; nextRun: string | null };
      deleted?: number;
    }
  | {
      status: 'error';
      code: DeviceActionErrorCode;
      /** device-service's `error` text for a 400. */
      message?: string;
      /** Local validation, field → error code (translated in the form). */
      fieldErrors?: Record<string, string>;
      /** device-service's own validation messages, field → message (shown verbatim). */
      details?: Record<string, string>;
    };

export const IDLE: DeviceActionState = { status: 'idle' };

const DEVICE_NAME = /^[a-z0-9-]{3,32}$/;
const MAX_CRON = 100;

const str = (v: FormDataEntryValue | null): string => (typeof v === 'string' ? v : '');

type Parsed<T> = { ok: true; value: T } | { ok: false; fieldErrors: Record<string, string> };

function collect<T>(value: T, checks: Array<[string, string | null]>): Parsed<T> {
  const fieldErrors: Record<string, string> = {};
  for (const [field, err] of checks) if (err) fieldErrors[field] = err;
  return Object.keys(fieldErrors).length > 0 ? { ok: false, fieldErrors } : { ok: true, value };
}

function parseState(v: string): 0 | 1 | null {
  return v === '0' ? 0 : v === '1' ? 1 : null;
}

export function parseControl(fd: FormData): Parsed<{ id: number; field: DeviceField; state: 0 | 1 }> {
  const id = parseId(fd.get('id'));
  const field = str(fd.get('field'));
  const state = parseState(str(fd.get('state')));
  return collect({ id: id ?? 0, field: isDeviceField(field) ? field : 'light', state: state ?? 0 }, [
    ['id', id ? null : 'id'],
    ['field', isDeviceField(field) ? null : 'field'],
    ['state', state === null ? 'state' : null],
  ]);
}

export interface ScheduleInput {
  /** null → create (POST), otherwise full replace (PUT). */
  id: number | null;
  deviceName: string;
  field: DeviceField;
  state: 0 | 1;
  cronExpression: string;
  active: boolean;
}

function checkCron(v: string): string | null {
  if (v.length === 0 || v.length > MAX_CRON) return 'cronExpression';
  return checkCronSafety(v);
}

export function parseSchedule(fd: FormData): Parsed<ScheduleInput> {
  const rawId = str(fd.get('id'));
  const id = rawId === '' ? null : parseId(rawId);
  const deviceName = str(fd.get('deviceName')).trim();
  const field = str(fd.get('field'));
  const state = parseState(str(fd.get('state')));
  const cronExpression = str(fd.get('cronExpression')).trim();
  // An unchecked checkbox is simply absent from the form data.
  const active = fd.get('active') !== null;
  return collect(
    {
      id,
      deviceName,
      field: isDeviceField(field) ? field : 'light',
      state: state ?? 0,
      cronExpression,
      active,
    },
    [
      ['id', rawId !== '' && id === null ? 'id' : null],
      ['deviceName', DEVICE_NAME.test(deviceName) ? null : 'deviceName'],
      ['field', isDeviceField(field) ? null : 'field'],
      ['state', state === null ? 'state' : null],
      ['cronExpression', checkCron(cronExpression)],
    ],
  );
}

/** The active switch posts the TARGET state as "true"/"false". */
export function parseActive(fd: FormData): Parsed<{ id: number; active: boolean }> {
  const id = parseId(fd.get('id'));
  const raw = str(fd.get('active'));
  return collect({ id: id ?? 0, active: raw === 'true' }, [
    ['id', id ? null : 'id'],
    ['active', raw === 'true' || raw === 'false' ? null : 'active'],
  ]);
}

export function parseScheduleId(fd: FormData): number | null {
  return parseId(fd.get('id'));
}
