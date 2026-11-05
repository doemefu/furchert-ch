// Pure device-state helpers for /dashboard/devices (#45). Shared by the
// server-only REST client, the page (server-side formatting) and the client
// panels, so it must stay free of server-only imports.
//
// Contract (device-service README "REST Endpoints" / `DeviceStateDto`):
// switch states are strings — the MQTT parser stores "0"/"1", older rows may
// say "off"/"on" — and `lastSeen` is `LocalDateTime.toString()` without an
// offset, written in the service's time zone, which is UTC.

export const DEVICE_FIELDS = ['light', 'nightLight', 'rain'] as const;
export type DeviceField = (typeof DEVICE_FIELDS)[number];

export function isDeviceField(v: unknown): v is DeviceField {
  return typeof v === 'string' && (DEVICE_FIELDS as readonly string[]).includes(v);
}

export type SwitchState = 'on' | 'off' | 'unknown';

export function switchState(raw: string | null): SwitchState {
  const v = raw?.trim().toLowerCase();
  if (v === '1' || v === 'on') return 'on';
  if (v === '0' || v === 'off') return 'off';
  return 'unknown';
}

const TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:\d{2})?$/;

/**
 * Epoch ms of a device-service timestamp, or null. An offset-less value is
 * read as UTC (device-service's zone); an explicit `Z`/`±hh:mm` is honoured.
 */
export function parseServiceTime(raw: string | null): number | null {
  if (typeof raw !== 'string') return null;
  const m = TIME.exec(raw.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s = '0', frac = '0', zone] = m;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  const hour = Number(h);
  const minute = Number(mi);
  const second = Number(s);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) return null;
  const ms = Number(frac.padEnd(3, '0').slice(0, 3));
  const utc = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  // Reject roll-overs such as 31 February.
  if (new Date(utc).getUTCDate() !== day) return null;
  if (!zone || zone === 'Z') return utc;
  const sign = zone.startsWith('-') ? -1 : 1;
  const offsetMin = sign * (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(4, 6)));
  return utc - offsetMin * 60_000;
}

/** Sensors report every 30 s; no message for this long means the device is not reporting. */
export const STALE_AFTER_MS = 10 * 60_000;

/**
 * - `never`: no message ever received.
 * - `offline`: the broker flag says offline (LWT or MqttState 0).
 * - `stale`: the flag still says online, but nothing arrived for STALE_AFTER_MS —
 *   e.g. the broker restarted while the device was down, so no LWT was sent.
 * - `live`: online and reporting.
 */
export type Freshness = 'live' | 'stale' | 'offline' | 'never';

export function freshness(mqttOnline: boolean | null, lastSeenMs: number | null, nowMs: number): Freshness {
  if (lastSeenMs === null) return 'never';
  if (mqttOnline !== true) return 'offline';
  const age = Math.max(0, nowMs - lastSeenMs);
  return age >= STALE_AFTER_MS ? 'stale' : 'live';
}

/**
 * Manual commands are published without the retain flag: a device that is not
 * reporting would never receive them while the API still answers 200.
 */
export function canControl(f: Freshness): boolean {
  return f === 'live';
}
