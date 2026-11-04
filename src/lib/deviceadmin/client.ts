// Server-only typed client for device-service's REST API (#45; contract:
// device-service README "REST Endpoints" + "Schedules"). Every call takes the
// signed-in admin's bearer token (`lib/authadmin/accessToken.ts`) and returns
// a `DeviceAdminResult` instead of throwing, so a failure renders an honest
// state and nothing is ever fabricated.
//
// Logging: `[deviceadmin]` prefix, endpoint name + HTTP status only — never
// tokens, request bodies or error bodies.
import 'server-only';
import { DEVICEADMIN_ENV, shouldAttemptDeviceAdmin } from '@/deviceadmin.env';
import type { DeviceField } from './fields';

// ── response shapes ─────────────────────────────────────────────────────────

/** `DeviceStateDto`. Every field but id/name is nullable on the producer side. */
export interface DeviceState {
  id: number;
  name: string;
  mqttOnline: boolean | null;
  temperature: number | null;
  humidity: number | null;
  /** "0"/"1" from MQTT ("off"/"on" in older rows) — see `fields.ts` `switchState`. */
  light: string | null;
  nightLight: string | null;
  rain: string | null;
  /** `LocalDateTime.toString()` in UTC, no offset — see `fields.ts` `parseServiceTime`. */
  lastSeen: string | null;
}

/**
 * `ScheduleDto`. The `schedules` columns are nullable, so a hand-edited or
 * legacy row can lack a device, field, payload or expression; `state` is null
 * for a non-standard payload, `nextRun` for an inactive or unevaluable one.
 */
export interface Schedule {
  id: number;
  deviceName: string | null;
  field: string | null;
  state: 0 | 1 | null;
  payload: string | null;
  cronExpression: string | null;
  active: boolean;
  /** ISO-8601 with offset. */
  nextRun: string | null;
}

export interface ScheduleBody {
  deviceName: string;
  field: DeviceField;
  state: 0 | 1;
  cronExpression: string;
  active: boolean;
}

// ── result type ─────────────────────────────────────────────────────────────

export type DeviceAdminFailureKind =
  | 'disabled' // local dev without DEVICE_SERVICE_URL
  | 'unavailable' // network error, timeout, 5xx
  | 'unauthorized' // 401: token expired, revoked or not accepted
  | 'forbidden' // 403: caller is not ADMIN at device-service
  | 'not_found' // 404: unknown id, or endpoint not deployed
  | 'bad_request' // 400: validation, unknown device, malformed body
  | 'unexpected'; // body does not match the documented shape

export interface DeviceAdminFailure {
  ok: false;
  kind: DeviceAdminFailureKind;
  /** device-service's `error` text for a 400 (shown to the admin, never logged). */
  message?: string;
  /** device-service's `details` ("field: message") as field → message; `_` holds unattributed entries. */
  details?: Record<string, string>;
}

export type DeviceAdminResult<T> = { ok: true; data: T } | DeviceAdminFailure;

// ── shape guards ────────────────────────────────────────────────────────────

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const strOrNull = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const numOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const isId = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v > 0;

export function parseDevice(v: unknown): DeviceState | null {
  if (!isObj(v) || !isId(v.id) || typeof v.name !== 'string') return null;
  return {
    id: v.id,
    name: v.name,
    mqttOnline: typeof v.mqttOnline === 'boolean' ? v.mqttOnline : null,
    temperature: numOrNull(v.temperature),
    humidity: numOrNull(v.humidity),
    light: strOrNull(v.light),
    nightLight: strOrNull(v.nightLight),
    rain: strOrNull(v.rain),
    lastSeen: strOrNull(v.lastSeen),
  };
}

export function parseSchedule(v: unknown): Schedule | null {
  if (!isObj(v) || !isId(v.id) || typeof v.active !== 'boolean') return null;
  return {
    id: v.id,
    deviceName: strOrNull(v.deviceName),
    field: strOrNull(v.field),
    state: v.state === 0 || v.state === 1 ? v.state : null,
    payload: strOrNull(v.payload),
    cronExpression: strOrNull(v.cronExpression),
    active: v.active,
    nextRun: strOrNull(v.nextRun),
  };
}

function listOf<T>(parse: (v: unknown) => T | null): (v: unknown) => T[] | null {
  return (v) => {
    if (!Array.isArray(v)) return null;
    const out: T[] = [];
    for (const raw of v) {
      const item = parse(raw);
      if (!item) return null;
      out.push(item);
    }
    return out;
  };
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

const MAX_DETAILS = 20;
const MAX_TEXT = 300;

async function readErrorBody(res: Response): Promise<Pick<DeviceAdminFailure, 'message' | 'details'>> {
  try {
    const json: unknown = await res.json();
    if (!isObj(json)) return {};
    const out: Pick<DeviceAdminFailure, 'message' | 'details'> = {};
    if (typeof json.error === 'string') out.message = json.error.slice(0, MAX_TEXT);
    if (Array.isArray(json.details)) {
      const details: Record<string, string> = {};
      let count = 0;
      for (const entry of json.details) {
        if (typeof entry !== 'string') continue;
        // "deviceName: unknown device: terra9" → split on the first ": " only.
        const at = entry.indexOf(': ');
        const key = at > 0 ? entry.slice(0, at) : '_';
        const text = (at > 0 ? entry.slice(at + 2) : entry).slice(0, MAX_TEXT);
        if (details[key] === undefined) {
          if (count >= MAX_DETAILS) break;
          count++;
          details[key] = text;
        } else {
          details[key] = `${details[key]}; ${text}`;
        }
      }
      if (count > 0) out.details = details;
    }
    return out;
  } catch {
    return {};
  }
}

function kindFor(status: number): DeviceAdminFailureKind {
  if (status === 400) return 'bad_request';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  return status >= 500 ? 'unavailable' : 'unexpected';
}

async function call(c: Call): Promise<DeviceAdminResult<Response>> {
  if (!shouldAttemptDeviceAdmin()) return { ok: false, kind: 'disabled' };
  let res: Response;
  try {
    res = await fetch(`${DEVICEADMIN_ENV.DEVICE_SERVICE_URL}${c.path}`, {
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
    console.warn(`[deviceadmin] ${c.name}: unreachable`);
    return { ok: false, kind: 'unavailable' };
  }
  if (!res.ok && !c.acceptStatus?.includes(res.status)) {
    console.warn(`[deviceadmin] ${c.name}: HTTP ${res.status}`);
    const kind = kindFor(res.status);
    const detail = kind === 'bad_request' ? await readErrorBody(res) : {};
    return { ok: false, kind, ...detail };
  }
  return { ok: true, data: res };
}

async function callJson<T>(c: Call, parse: (v: unknown) => T | null): Promise<DeviceAdminResult<T>> {
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
    console.warn(`[deviceadmin] ${c.name}: unexpected response shape`);
    return { ok: false, kind: 'unexpected' };
  }
  return { ok: true, data };
}

async function callNoContent(c: Call): Promise<DeviceAdminResult<null>> {
  const r = await call(c);
  return r.ok ? { ok: true, data: null } : r;
}

// ── devices ─────────────────────────────────────────────────────────────────

export function listDevices(token: string): Promise<DeviceAdminResult<DeviceState[]>> {
  return callJson({ name: 'devices.list', method: 'GET', path: '/devices', token }, listOf(parseDevice));
}

/** ADMIN. Publishes `<name>/<field>/man` (QoS 1, not retained); 200 means "published", not "done". */
export function controlDevice(
  token: string,
  id: number,
  command: { field: DeviceField; state: 0 | 1 },
): Promise<DeviceAdminResult<null>> {
  return callNoContent({ name: 'devices.control', method: 'POST', path: `/devices/${id}/control`, token, body: command });
}

// ── schedules ───────────────────────────────────────────────────────────────

export function listSchedules(token: string): Promise<DeviceAdminResult<Schedule[]>> {
  return callJson({ name: 'schedules.list', method: 'GET', path: '/schedules', token }, listOf(parseSchedule));
}

export function getSchedule(token: string, id: number): Promise<DeviceAdminResult<Schedule>> {
  return callJson({ name: 'schedules.get', method: 'GET', path: `/schedules/${id}`, token }, parseSchedule);
}

export function createSchedule(token: string, body: ScheduleBody): Promise<DeviceAdminResult<Schedule>> {
  return callJson({ name: 'schedules.create', method: 'POST', path: '/schedules', token, body }, parseSchedule);
}

/** Full replace — every field is required, so `active` can never flip by omission. */
export function updateSchedule(token: string, id: number, body: ScheduleBody): Promise<DeviceAdminResult<Schedule>> {
  return callJson({ name: 'schedules.update', method: 'PUT', path: `/schedules/${id}`, token, body }, parseSchedule);
}

export function deleteSchedule(token: string, id: number): Promise<DeviceAdminResult<null>> {
  return callNoContent({ name: 'schedules.delete', method: 'DELETE', path: `/schedules/${id}`, token });
}

// ── public health (actuator, permitAll) ─────────────────────────────────────

export function getHealth(): Promise<DeviceAdminResult<{ status: string }>> {
  return callJson({ name: 'health', method: 'GET', path: '/actuator/health', acceptStatus: [503] }, (v) =>
    isObj(v) && typeof v.status === 'string' ? { status: v.status } : null,
  );
}
