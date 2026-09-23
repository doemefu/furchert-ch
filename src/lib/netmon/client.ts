// Server-only typed client for data-service's netmon read API
// (NM-1, #61; contract: infrastructure/docs/060-network-monitoring.md §7.1–7.4).
// Called only from `NetworkShell` (a Server Component rendered after the
// ADMIN check). No route handler, nothing reaches the browser but rendered
// HTML. Every fetcher returns a `NetmonResult` instead of throwing, so one
// failed section never takes down the page and nothing is ever fabricated.
//
// Logging (§10): `[netmon]` prefix, endpoint name + HTTP status only — never
// tokens, never URLs with query strings, never IP addresses.
import { NETMON_ENV, shouldAttemptNetmon } from '@/netmon.env';
import { getNetmonToken, invalidateNetmonToken } from './token';

// ── §7.2 response shapes ────────────────────────────────────────────────────

export type CollectorErrorCode = 'credentials' | 'rate_limited' | 'upstream' | 'truncated' | 'internal';

export interface CollectorStatus {
  name: string;
  enabled: boolean;
  lastSuccessAt: string | null;
  lastWindowEnd: string | null;
  consecutiveFailures: number;
  lastErrorCode: CollectorErrorCode | string | null;
  stale: boolean;
}

export interface StatusResponse {
  collectors: CollectorStatus[];
}

export interface TopClientIp {
  ip: string;
  requests: number;
  country: string | null;
  asn: number | null;
  asnOrg: string | null;
  blocklisted: boolean;
  abuseScore: number | null;
  firewallEvents: number;
}

export interface InboundSummary {
  window: { from: string; to: string };
  totals: { requests: number; uniqueClientIps: number; sampled: boolean };
  topClientIps: TopClientIp[];
  topCountries: Array<{ country: string | null; requests: number }>;
  topAsns: Array<{ asn: number | null; asnOrg: string | null; requests: number }>;
  topHosts: Array<{ host: string; requests: number }>;
  topPaths: Array<{ host: string; path: string; requests: number }>;
  statuses: Array<{ status: number; requests: number }>;
  timeline: Array<{ bucketStart: string; requests: number }>;
}

export interface FirewallEvent {
  occurredAt: string;
  rayName: string | null;
  clientIp: string;
  country: string | null;
  asn: number | null;
  asnOrg: string | null;
  action: string;
  securitySource: string | null;
  ruleId: string | null;
  host: string | null;
  method: string | null;
  path: string | null;
  userAgent: string | null;
  blocklisted: boolean;
}

export interface FirewallEventsPage {
  items: FirewallEvent[];
  nextCursor: string | null;
}

export interface IpDetail {
  ip: string;
  firstSeen: string | null;
  lastSeen: string | null;
  seenIn: string[];
  country: string | null;
  asn: number | null;
  asnOrg: string | null;
  blocklists: Array<{ list: string; cidr: string; fetchedAt: string | null }>;
  abuseIpDb: { score: number; reports: number; checkedAt: string | null } | null;
  inbound: {
    requests: number;
    topHosts: Array<{ host: string; requests: number }>;
    topPaths: Array<{ host: string; path: string; requests: number }>;
    statuses: Array<{ status: number; requests: number }>;
  } | null;
  firewallEvents: FirewallEvent[];
  // Populated by NM-4 / NM-3; `null` until those ship (§7.2).
  logins: { success: number; failure: number; locked: number } | null;
  lan: { ufwBlocks: number; sshFailed: number } | null;
}

// ── Result type ─────────────────────────────────────────────────────────────

export type NetmonFailure =
  /** Fetch deliberately skipped (local dev without DATA_SERVICE_URL). */
  | { ok: false; kind: 'disabled' }
  /** Network error, timeout, token failure, or a non-problem error body. */
  | { ok: false; kind: 'unreachable' }
  /** data-service answered with an RFC 9457 problem (§7.1 `code`). */
  | { ok: false; kind: 'problem'; status: number; code: string }
  /** 2xx with a body that does not match the §7.2 shape. */
  | { ok: false; kind: 'malformed' };

export type NetmonResult<T> = { ok: true; data: T } | NetmonFailure;

// ── Transport ───────────────────────────────────────────────────────────────

type Query = Record<string, string | number | undefined>;

function buildUrl(path: string, query: Query): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== '') params.set(k, String(v));
  }
  const qs = params.toString();
  return `${NETMON_ENV.DATA_SERVICE_URL}/api/netmon${path}${qs ? `?${qs}` : ''}`;
}

async function authorizedGet(url: string): Promise<Response> {
  const token = await getNetmonToken();
  return fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
}

const PROBLEM_CODES = new Set(['invalid_window', 'invalid_parameter', 'not_found', 'unauthorized', 'forbidden', 'internal']);

async function readProblem(res: Response): Promise<NetmonFailure> {
  let code = 'internal';
  try {
    const body = (await res.json()) as { code?: unknown };
    if (typeof body.code === 'string' && PROBLEM_CODES.has(body.code)) code = body.code;
  } catch {
    // Non-JSON error body (e.g. a proxy page): keep the generic code.
  }
  return { ok: false, kind: 'problem', status: res.status, code };
}

// `endpoint` is a fixed label for logs (never the concrete URL, which may
// carry an IP or a time window).
async function getJson<T>(
  endpoint: string,
  path: string,
  query: Query,
  isValid: (body: unknown) => body is T,
): Promise<NetmonResult<T>> {
  if (!shouldAttemptNetmon()) return { ok: false, kind: 'disabled' };

  const url = buildUrl(path, query);
  let res: Response;
  try {
    res = await authorizedGet(url);
    if (res.status === 401) {
      // Cached token rejected (e.g. signing-key rotation): retry once with a
      // fresh one before reporting the failure.
      invalidateNetmonToken();
      res = await authorizedGet(url);
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown error';
    console.warn(`[netmon] ${endpoint} unavailable: ${reason}`);
    return { ok: false, kind: 'unreachable' };
  }

  if (!res.ok) {
    const failure = await readProblem(res);
    // A 404 on the IP detail means "never seen" — expected, not worth a log.
    if (res.status !== 404) console.warn(`[netmon] ${endpoint} failed: HTTP ${res.status}`);
    return failure;
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    console.warn(`[netmon] ${endpoint} returned a non-JSON body`);
    return { ok: false, kind: 'malformed' };
  }
  if (!isValid(body)) {
    console.warn(`[netmon] ${endpoint} returned an unexpected shape`);
    return { ok: false, kind: 'malformed' };
  }
  return { ok: true, data: body };
}

// ── Shape guards (minimal: the arrays the UI iterates must be arrays) ──────

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function isStatusResponse(v: unknown): v is StatusResponse {
  return isObject(v) && Array.isArray(v.collectors);
}

function isInboundSummary(v: unknown): v is InboundSummary {
  return (
    isObject(v) &&
    isObject(v.totals) &&
    typeof v.totals.requests === 'number' &&
    ['topClientIps', 'topCountries', 'topAsns', 'topHosts', 'topPaths', 'statuses', 'timeline'].every((k) =>
      Array.isArray(v[k]),
    )
  );
}

function isFirewallEventsPage(v: unknown): v is FirewallEventsPage {
  return isObject(v) && Array.isArray(v.items);
}

function isIpDetail(v: unknown): v is IpDetail {
  return (
    isObject(v) &&
    typeof v.ip === 'string' &&
    Array.isArray(v.blocklists) &&
    Array.isArray(v.firewallEvents) &&
    Array.isArray(v.seenIn)
  );
}

// ── Fetchers (§7.2) ─────────────────────────────────────────────────────────

export interface TimeWindow {
  from: string;
  to: string;
}

export function getStatus(): Promise<NetmonResult<StatusResponse>> {
  return getJson('status', '/status', {}, isStatusResponse);
}

export function getInboundSummary(window: TimeWindow): Promise<NetmonResult<InboundSummary>> {
  return getJson('inbound/summary', '/inbound/summary', { ...window, limit: 10 }, isInboundSummary);
}

export function getFirewallEvents(
  window: TimeWindow,
  cursor: string | undefined,
): Promise<NetmonResult<FirewallEventsPage>> {
  return getJson(
    'inbound/firewall-events',
    '/inbound/firewall-events',
    { ...window, limit: 50, cursor },
    isFirewallEventsPage,
  );
}

// `ip` MUST already be validated by the caller (`isIP`); it is still
// percent-encoded here because IPv6 literals contain ':'.
export function getIpDetail(ip: string, window: TimeWindow): Promise<NetmonResult<IpDetail>> {
  return getJson('ips', `/ips/${encodeURIComponent(ip)}`, { ...window }, isIpDetail);
}
