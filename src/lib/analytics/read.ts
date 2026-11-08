// Server-only client for data-service's web analytics read API (spec 100
// §8.1, §8.2, §9.1; data-service INTERFACES.md §1c; WA-4a #155). Called only
// from the /dashboard/analytics Server Components after the ADMIN check.
// Every fetcher returns an `AnalyticsResult` instead of throwing, so a failed
// section never takes down the page and nothing is fabricated.
//
// Token: client_credentials with scope analytics:read only (one token per
// scope). Logging: `[analytics] <endpoint> …` with the HTTP status only;
// never tokens, never URLs with a query string.
import 'server-only';
import { AUTH_ENV } from '@/auth.env';
import { createClientCredentialsToken } from '@/lib/auth/clientCredentialsToken';
import { NETMON_ENV, shouldAttemptNetmon } from '@/netmon.env';

// ── Response shapes (data-service ReadDtos @ 2a48af5; every field present) ──

export interface Period {
  from: string;
  to: string;
}
/** `from`/`to`/`previous` null and `days` 0 in the empty state. */
export interface Range {
  from: string | null;
  to: string | null;
  days: number;
  lastCompleteDay: string | null;
  previous: Period | null;
}
export interface Filters {
  applied: Record<string, string>;
  ignored: string[];
}
export interface CollectorStatus {
  name: string;
  enabled: boolean;
  lastSuccessAt: string | null;
  lastWindowEnd: string | null;
  consecutiveFailures: number;
  lastErrorCode: string | null;
  stale: boolean;
}
export interface StatusResponse {
  collectors: CollectorStatus[];
  lastCompleteDay: string | null;
  provisionalDay: string | null;
  rawRetentionStart: string | null;
  definitionVersion: number;
  ingest: { lastEventAt: string | null; eventsToday: number; dailyCap: number | null; capped: boolean | null };
}
export interface Counts {
  visits: number;
  newVisits: number;
  returningVisits: number;
  engagedVisits: number;
  offerVisits: number;
  engagedOfferVisits: number;
  contactIntentVisits: number;
  formStartVisits: number;
  convertingVisits: number;
  conversions: number;
  pageviews: number;
  excludedVisits: number;
  enquiriesTotal: number;
}
export interface ValueBasis {
  value: number | null;
  basis: string;
}
export interface DailyPoint {
  day: string;
  visits: number;
  offerVisits: number;
  engagedVisits: number;
  contactIntentVisits: number;
  convertingVisits: number;
  pageviews: number;
  enquiries: number;
}
export interface OverviewResponse {
  range: Range;
  filters: Filters;
  current: Counts;
  previous: Counts | null;
  visitors: { current: ValueBasis | null; previous: ValueBasis | null } | null;
  daily: DailyPoint[];
}
export interface PageItem {
  path: string;
  pageviews: number;
  pageviewsByLocale: { de: number; en: number };
  visitsViewed: number;
  entries: number;
  exits: number;
  landingEngagedVisits: number;
  landingConvertingVisits: number;
  engagementSamples: number;
  engagedMsSum: number;
  /** 8 buckets: 0–5 s, 5–10 s, 10–30 s, 30–60 s, 1–2 min, 2–5 min, 5–10 min, > 10 min. */
  engagedHistogram: number[];
  scrollSamples: number;
  scrollReached: { p25: number; p50: number; p75: number; p90: number; p100: number };
}
export interface PagesResponse {
  range: Range;
  filters: Filters;
  items: PageItem[];
}
export interface DetailClick {
  kind: string;
  target: string | null;
  area: string;
  clicks: number;
  visits: number;
  convertingVisits: number;
}
export interface PageDetailResponse {
  range: Range;
  filters: Filters;
  summary: PageItem | null;
  previous: { path: string; count: number }[] | null;
  next: { path: string; count: number }[] | null;
  clicks: DetailClick[];
  sections: { reached: { section: string; pageviews: number }[]; deepestAtExit: { section: string; visits: number }[] } | null;
  faqOpens: { faq: string; opens: number; visits: number }[] | null;
  daily: { day: string; pageviews: number; visitsViewed: number }[];
}
export interface ClickItem {
  kind: string;
  target: string | null;
  path: string;
  area: string;
  clicks: number;
  visits: number;
  convertingVisits: number;
  pageVisits: number | null;
}
export interface ClicksResponse {
  range: Range;
  filters: Filters;
  items: ClickItem[];
}
export interface ChannelItem {
  channel: string;
  visits: number;
  newVisits: number;
  engagedVisits: number;
  offerVisits: number;
  convertingVisits: number;
}
export interface SourcesResponse {
  range: Range;
  filters: Filters;
  channels: ChannelItem[];
  referrers: { domain: string; channel: string; visits: number; convertingVisits: number }[];
  campaigns: { source: string | null; medium: string | null; campaign: string | null; visits: number; convertingVisits: number }[];
  converters: {
    byLandingChannel: { channel: string | null; convertingVisits: number; conversions: number }[];
    byFirstChannel: { channel: string | null; convertingVisits: number; conversions: number }[];
    byEntryPath: { path: string; convertingVisits: number; conversions: number }[];
  };
}

// ── Result type ────────────────────────────────────────────────────────────

export type AnalyticsFailure =
  | { ok: false; kind: 'disabled' }
  | { ok: false; kind: 'unreachable' }
  | { ok: false; kind: 'problem'; status: number; code: string }
  | { ok: false; kind: 'malformed' };
export type AnalyticsResult<T> = { ok: true; data: T } | AnalyticsFailure;

export interface RangeQuery {
  from?: string;
  to?: string;
  compare?: 'previous' | 'none';
  locale?: 'de' | 'en';
  device?: 'desktop' | 'mobile' | 'tablet';
}

// ── Transport ──────────────────────────────────────────────────────────────

const token = createClientCredentialsToken('analytics:read', 'furchert.analytics.read-token', {
  tokenUrl: () => NETMON_ENV.DATA_SERVICE_TOKEN_URL,
  clientId: () => AUTH_ENV.OIDC_CLIENT_ID,
  clientSecret: () => AUTH_ENV.OIDC_CLIENT_SECRET,
});

type Query = Record<string, string | number | undefined>;

export function buildUrl(path: string, query: Query): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '') params.set(k, String(v));
  const qs = params.toString();
  return `${NETMON_ENV.DATA_SERVICE_URL.replace(/\/+$/, '')}/api/webanalytics${path}${qs ? `?${qs}` : ''}`;
}

const PROBLEM_CODES = new Set(['invalid_window', 'invalid_parameter', 'not_found', 'unauthorized', 'forbidden', 'internal']);

async function get(url: string): Promise<Response> {
  return fetch(url, {
    headers: { Authorization: `Bearer ${await token.get()}`, Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
}

async function getJson<T>(endpoint: string, path: string, query: Query, isValid: (b: unknown) => b is T): Promise<AnalyticsResult<T>> {
  if (!shouldAttemptNetmon()) return { ok: false, kind: 'disabled' };
  const url = buildUrl(path, query);
  let res: Response;
  try {
    res = await get(url);
    if (res.status === 401) {
      await res.body?.cancel();
      token.invalidate();
      res = await get(url);
    }
  } catch {
    console.warn(`[analytics] ${endpoint} unavailable`);
    return { ok: false, kind: 'unreachable' };
  }
  if (!res.ok) {
    let code = 'internal';
    try {
      const body = (await res.json()) as { code?: unknown };
      if (typeof body.code === 'string' && PROBLEM_CODES.has(body.code)) code = body.code;
    } catch {
      // non-JSON error body
    }
    console.warn(`[analytics] ${endpoint} failed: HTTP ${res.status}`);
    return { ok: false, kind: 'problem', status: res.status, code };
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    console.warn(`[analytics] ${endpoint} returned a non-JSON body`);
    return { ok: false, kind: 'malformed' };
  }
  if (!isValid(body)) {
    console.warn(`[analytics] ${endpoint} returned an unexpected shape`);
    return { ok: false, kind: 'malformed' };
  }
  return { ok: true, data: body };
}

// ── Shape guards (what the UI relies on) ───────────────────────────────────

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStrOrNull = (v: unknown) => v === null || typeof v === 'string';
const isArr = (v: unknown, each: (x: unknown) => boolean) => Array.isArray(v) && v.every(each);

export function isRange(v: unknown): v is Range {
  return (
    isObj(v) && isNum(v.days) && isStrOrNull(v.from) && isStrOrNull(v.to) && isStrOrNull(v.lastCompleteDay) &&
    (v.previous === null || (isObj(v.previous) && typeof v.previous.from === 'string' && typeof v.previous.to === 'string'))
  );
}
const isFilters = (v: unknown): v is Filters => isObj(v) && isObj(v.applied) && isArr(v.ignored, (x) => typeof x === 'string');
const ranged = (v: unknown): v is Record<string, unknown> & { range: Range; filters: Filters } => isObj(v) && isRange(v.range) && isFilters(v.filters);
const COUNT_KEYS: (keyof Counts)[] = ['visits', 'newVisits', 'returningVisits', 'engagedVisits', 'offerVisits', 'engagedOfferVisits', 'contactIntentVisits', 'formStartVisits', 'convertingVisits', 'conversions', 'pageviews', 'excludedVisits', 'enquiriesTotal'];
const isCounts = (v: unknown): v is Counts => isObj(v) && COUNT_KEYS.every((k) => isNum(v[k]));
export function isPageItem(v: unknown): v is PageItem {
  return (
    isObj(v) && typeof v.path === 'string' && isNum(v.pageviews) && isObj(v.pageviewsByLocale) &&
    isArr(v.engagedHistogram, isNum) && (v.engagedHistogram as unknown[]).length === 8 && isObj(v.scrollReached) &&
    ['visitsViewed', 'entries', 'exits', 'landingEngagedVisits', 'landingConvertingVisits', 'engagementSamples', 'scrollSamples'].every((k) => isNum(v[k]))
  );
}

export const isStatus = (v: unknown): v is StatusResponse =>
  isObj(v) && isArr(v.collectors, isObj) && isStrOrNull(v.lastCompleteDay) && isStrOrNull(v.provisionalDay) && isObj(v.ingest);
export const isOverview = (v: unknown): v is OverviewResponse =>
  ranged(v) && isCounts(v.current) && (v.previous === null || isCounts(v.previous)) && isArr(v.daily, isObj) && (v.visitors === null || isObj(v.visitors));
export const isPages = (v: unknown): v is PagesResponse => ranged(v) && isArr(v.items, isPageItem);
export const isPageDetail = (v: unknown): v is PageDetailResponse =>
  ranged(v) && (v.summary === null || isPageItem(v.summary)) && isArr(v.clicks, isObj) && isArr(v.daily, isObj) &&
  (v.faqOpens === null || isArr(v.faqOpens, isObj)) && (v.sections === null || isObj(v.sections));
export const isClicks = (v: unknown): v is ClicksResponse => ranged(v) && isArr(v.items, isObj);
export const isSources = (v: unknown): v is SourcesResponse =>
  ranged(v) && isArr(v.channels, isObj) && isArr(v.referrers, isObj) && isArr(v.campaigns, isObj) && isObj(v.converters) &&
  isArr(v.converters.byLandingChannel, isObj) && isArr(v.converters.byFirstChannel, isObj) && isArr(v.converters.byEntryPath, isObj);

// ── Fetchers ───────────────────────────────────────────────────────────────

const rangeQuery = (q: RangeQuery): Query => ({ from: q.from, to: q.to, compare: q.compare, locale: q.locale, device: q.device });

export const getStatus = () => getJson('status', '/status', {}, isStatus);
export const getOverview = (q: RangeQuery) => getJson('overview', '/overview', rangeQuery(q), isOverview);
export const getPages = (q: RangeQuery) => getJson('pages', '/pages', { ...rangeQuery(q), limit: 100 }, isPages);
export const getPageDetail = (q: RangeQuery, path: string) => getJson('pages/detail', '/pages/detail', { ...rangeQuery(q), path }, isPageDetail);
export const getClicks = (q: RangeQuery, kind?: string) => getJson('clicks', '/clicks', { ...rangeQuery(q), kind, limit: 100 }, isClicks);
export const getSources = (q: RangeQuery) => getJson('sources', '/sources', { ...rangeQuery(q), limit: 100 }, isSources);
