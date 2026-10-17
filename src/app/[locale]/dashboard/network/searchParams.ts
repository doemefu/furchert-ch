// Search-param parsers for /[locale]/dashboard/network (NM-1, #61). Every
// value from the URL passes through one of these before it reaches
// data-service; anything malformed falls back to a safe default or is
// dropped. Split out of page.tsx so it can be unit-tested (#81) — page files
// may only export Next's route fields.
import { isIP } from 'node:net';
import { LOGIN_OUTCOMES, type LoginOutcome, type TimeWindow } from '@/lib/netmon/client';
import { NETWORK_RANGES, type NetworkRange } from './NetworkShell';

// The API's cursor is opaque; cap what we are willing to echo back to it.
const MAX_CURSOR_LENGTH = 512;

export type SearchParams = Record<string, string | string[] | undefined>;

export function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function parseRange(v: string | undefined): NetworkRange {
  return NETWORK_RANGES.includes(v as NetworkRange) ? (v as NetworkRange) : '24h';
}

// Returns the IP only if it is a syntactically valid IPv4/IPv6 literal.
// Invalid input is dropped silently — it is never logged (§10: no IPs in
// logs) and never forwarded to data-service.
export function parseIp(v: string | undefined): { ip?: string; invalid: boolean } {
  if (v === undefined || v === '') return { invalid: false };
  const trimmed = v.trim();
  // `%` would allow IPv6 zone IDs (`fe80::1%eth0`), which are meaningless
  // for public client IPs and awkward in a URL path segment.
  if (trimmed.includes('%')) return { invalid: true };
  return isIP(trimmed) === 0 ? { invalid: true } : { ip: trimmed, invalid: false };
}

// The firewall window pinned by a paging link (`fwFrom`/`fwTo`), so older
// pages use the same window as the cursor that produced them. Accepted only
// as second-precision UTC instants with 0 < to − from ≤ 30 d (§7.1).
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const MAX_WINDOW_MS = 30 * 24 * 3600 * 1000;

export function parsePinnedWindow(from: string | undefined, to: string | undefined): TimeWindow | undefined {
  if (!from || !to || !INSTANT.test(from) || !INSTANT.test(to)) return undefined;
  const span = Date.parse(to) - Date.parse(from);
  if (!Number.isFinite(span) || span <= 0 || span > MAX_WINDOW_MS) return undefined;
  return { from, to };
}

export function parseCursor(v: string | undefined): string | undefined {
  if (!v || v.length > MAX_CURSOR_LENGTH) return undefined;
  return v;
}

// Login-events outcome filter (NM-4): only the three API values pass.
export function parseOutcome(v: string | undefined): LoginOutcome | undefined {
  return LOGIN_OUTCOMES.includes(v as LoginOutcome) ? (v as LoginOutcome) : undefined;
}
