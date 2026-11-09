// Handlers of `POST /api/v` (spec 100 §5.3) and `POST /api/v/forget` (§5.4),
// free of Next so they are tested with plain Fetch requests. The route files
// only wire the real dependencies. Every non-error outcome is 204 with an
// empty body and `Cache-Control: no-store`; error bodies are empty too. The
// only `Set-Cookie` values are the `fa_vid` mint and clear and the
// `fa_forget` set and clear.
//
// WA-5 (#157): step 7 (bot list, prefetch), step 8 (collect rate limits) and
// the mint limit in handleCollect; the forget limits, queue purge and
// synchronous erasure in handleForget.
import { ANALYTICS_CONSENT_VERSION, consentExpired, utcDay } from '../consent';
import { isBotRequest } from './bots';
import {
  FORGET_COOKIE,
  FORGET_COOKIE_MAX_IDS,
  VISITOR_COOKIE,
  anyVisitorId,
  clearForgetCookie,
  clearVisitorCookie,
  currentVisitorId,
  hasSessionCookie,
  mintVisitorCookie,
  parseForgetCookie,
  readCookie,
  readVisitorCookie,
  setForgetCookie,
} from './cookie';
import { canonicalEvent, canonicalViewport, parseEnvelope } from './envelope';
import { toForwardEvent, type EdgeDropReason, type ForwardEvent } from './forwardModel';
import { checkAll, clientKey, UNKNOWN_KEY, type Limiter } from './limiter';
import { isJsonContentType, isSameOrigin, readCappedBody } from './request';
import { deviceContext } from './ua';

/** §5.8 collect windows; the forget limiters are separate instances. */
export interface CollectLimits {
  requestsPerKey: Limiter; // 20 / 60 s
  requestsGlobal: Limiter; // 300 / 60 s
  eventsPerKey: Limiter; // 200 / 10 min
  eventsGlobal: Limiter; // 2 000 / 60 s
  mintsPerKey: Limiter; // 5 / hour
}

export interface CollectDeps {
  queue: {
    enqueue(events: ForwardEvent[], opts?: { priority?: boolean }): void;
    countDrop(reason: EdgeDropReason, n?: number): void;
  };
  now: () => number;
  uiEnabled: boolean;
  collectEnabled: boolean;
  expectedOrigin: string;
  secureCookies: boolean;
  newVisitorId: () => string;
  limits: CollectLimits;
  count: (key: string, n?: number) => void;
}

const GLOBAL = 'global';

function empty(status: number, extra: Record<string, string> = {}): Response {
  return new Response(null, { status, headers: { 'Cache-Control': 'no-store', ...extra } });
}

/** An empty response with several `Set-Cookie` headers. */
function withCookies(status: number, cookies: string[], extra: Record<string, string> = {}): Response {
  const headers = new Headers({ 'Cache-Control': 'no-store', ...extra });
  for (const c of cookies) headers.append('Set-Cookie', c);
  return new Response(null, { status, headers });
}

const limited = (retryAfterS: number) => empty(429, { 'Retry-After': String(retryAfterS) });

/** 405 for every method but POST (M9); the forget route clears the cookie on it too. */
export function methodNotAllowed(clearCookie: boolean, secure: boolean): Response {
  return empty(405, { Allow: 'POST', ...(clearCookie ? { 'Set-Cookie': clearVisitorCookie(secure) } : {}) });
}

/** Steps 2 to 4, shared by both routes. Returns an error status or the body text. */
async function guard(req: Request, deps: Pick<CollectDeps, 'expectedOrigin'>): Promise<{ status: number } | { text: string }> {
  if (!isJsonContentType(req.headers.get('content-type'))) return { status: 415 };
  if (!isSameOrigin(req.headers, deps.expectedOrigin)) return { status: 403 };
  const body = await readCappedBody(req);
  return body.ok ? { text: body.text } : { status: body.status };
}

export async function handleCollect(req: Request, deps: CollectDeps): Promise<Response> {
  try {
    const checked = await guard(req, deps); // steps 2–4
    if ('status' in checked) return empty(checked.status);
    if (!deps.uiEnabled || !deps.collectEnabled) return empty(204); // step 5
    const cookies = req.headers.get('cookie');
    if (hasSessionCookie(cookies)) {
      deps.queue.countDrop('signed_in'); // unit: requests
      return empty(204); // step 6
    }
    if (isBotRequest(req.headers)) {
      deps.queue.countDrop('bot'); // unit: requests
      return empty(204); // step 7
    }
    const receivedAtMs = deps.now();
    const key = clientKey(req.headers);
    if (key === UNKNOWN_KEY) deps.count('unknownKey');
    const L = deps.limits;
    // Step 8, request windows: checked first, charged only when all pass (M6).
    const byRequest = checkAll([{ limiter: L.requestsPerKey, key }, { limiter: L.requestsGlobal, key: GLOBAL }], receivedAtMs);
    if (!byRequest.ok) {
      deps.queue.countDrop('rate_limited'); // unit: requests
      return limited(byRequest.retryAfterS);
    }
    const envelope = parseEnvelope(checked.text); // step 9
    if (!envelope) return empty(400);
    // Step 8, event windows, with the parsed event count.
    const n = envelope.events.length;
    const byEvents = checkAll([{ limiter: L.eventsPerKey, key, cost: n }, { limiter: L.eventsGlobal, key: GLOBAL, cost: n }], receivedAtMs);
    if (!byEvents.ok) {
      deps.queue.countDrop('rate_limited'); // unit: requests
      return limited(byEvents.retryAfterS);
    }
    // Step 10, before any mint: a withdrawn or absent consent never mints.
    if (envelope.cv !== ANALYTICS_CONSENT_VERSION || consentExpired(envelope.consentDate, utcDay(new Date(receivedAtMs)))) {
      deps.queue.countDrop('consent'); // unit: requests
      return empty(204);
    }
    const kept = [];
    for (const raw of envelope.events) {
      const c = canonicalEvent(raw); // step 11
      if (c.ok) kept.push(c.event);
      else deps.queue.countDrop(c.reason); // unit: events
    }
    if (kept.length === 0) return empty(204); // L11: no mint without a surviving event

    let visitorId = currentVisitorId(readVisitorCookie(cookies)); // step 12
    let setCookie: string | null = null;
    if (!visitorId) {
      // Mint limit 5/h per key: over it the request is dropped (§5.8).
      if (L.mintsPerKey.wouldExceed(key, 1, receivedAtMs)) {
        deps.queue.countDrop('mint_limited', kept.length); // unit: events that would have minted
        return empty(204);
      }
      L.mintsPerKey.charge(key, 1, receivedAtMs);
      visitorId = deps.newVisitorId();
      setCookie = mintVisitorCookie(visitorId, envelope.consentDate, deps.secureCookies);
    }
    const ctx = {
      visitorId,
      receivedAtMs,
      sentAt: envelope.sentAt,
      viewport: canonicalViewport(envelope.viewport),
      device: deviceContext(req.headers),
    }; // step 13
    deps.queue.enqueue(kept.map((c) => toForwardEvent(c, ctx))); // step 14
    return empty(204, setCookie ? { 'Set-Cookie': setCookie } : {}); // step 15
  } catch {
    return empty(400);
  }
}

/** §5.4 forget limits; separate from the collect windows (never shared). */
export interface ForgetLimits {
  perKey: Limiter; // 30 / 60 s
  global: Limiter; // 120 / 60 s (review M8)
}

export interface ForgetDeps {
  expectedOrigin: string;
  secureCookies: boolean;
  now: () => number;
  limits: ForgetLimits;
  queue: { purgeVisitors(ids: string[]): Promise<{ settled: boolean }>; onInFlightSettled(cb: () => void): void };
  eraser: {
    tryAcquire(): boolean;
    release(): void;
    eraseNow(ids: string[]): Promise<string[]>;
    queueRetry(ids: string[]): void;
    reDeleteAfter(settled: Promise<void>, ids: string[]): void;
  };
  count: (key: string, n?: number) => void;
}

/** The newest `FORGET_COOKIE_MAX_IDS` ids (the list is oldest first, `fa_vid` last). */
const newest = (ids: string[]) => ids.slice(-FORGET_COOKIE_MAX_IDS);

/**
 * `POST /api/v/forget` (§5.4; WA-5 #157). Never mints; unaffected by the kill
 * switches and the signed-in drop. Order: guard (steps 1 to 4) → erase slot
 * (4 at once, checked before any window, N4) → global and per-key windows
 * (a 429 keeps `fa_vid`) → ids from `fa_vid` (any version) and `fa_forget`
 * → purge the queue → erase in data-service → 204 (both cookies cleared) or
 * 503 (`fa_forget` = exactly the failed ids, newest 4, N3).
 */
export async function handleForget(req: Request, deps: ForgetDeps): Promise<Response> {
  const clearVid = clearVisitorCookie(deps.secureCookies);
  // Set once the guard passed: an unexpected error afterwards keeps the ids pending (review W2).
  let pendingIds: string[] = [];
  try {
    const cookies = req.headers.get('cookie');
    const forgetRaw = readCookie(cookies, FORGET_COOKIE);
    let pending: string[] = [];
    if (forgetRaw !== null && forgetRaw !== '') {
      const parsed = parseForgetCookie(forgetRaw);
      if (parsed) pending = parsed;
      else deps.count('bad_id');
    }
    const vid = anyVisitorId(readCookie(cookies, VISITOR_COOKIE));
    // Oldest first: the fa_forget order, then the fa_vid id (newest).
    const ids = [...new Set([...pending, ...(vid ? [vid] : [])])];

    const checked = await guard(req, deps);
    if ('status' in checked) {
      // Arch Q5: a request cut off by size or time still leaves its ids pending (err towards erasure).
      const keep = (checked.status === 408 || checked.status === 413) && ids.length > 0;
      return withCookies(checked.status, keep ? [clearVid, setForgetCookie(newest(ids), deps.secureCookies)] : [clearVid]);
    }
    pendingIds = ids;
    if (!deps.eraser.tryAcquire()) {
      deps.count('concurrency');
      return limited(2); // nothing charged, fa_vid kept (N4)
    }
    try {
      const key = clientKey(req.headers);
      if (key === UNKNOWN_KEY) deps.count('unknownKey');
      const allowed = checkAll([{ limiter: deps.limits.global, key: GLOBAL }, { limiter: deps.limits.perKey, key }], deps.now());
      if (!allowed.ok) {
        deps.count('limited');
        return limited(allowed.retryAfterS); // fa_vid kept: the erasure is neither done nor pending
      }
      const clearForget = forgetRaw !== null ? [clearForgetCookie(deps.secureCookies)] : [];
      if (ids.length === 0) return withCookies(204, [clearVid, ...clearForget]);

      const { settled } = await deps.queue.purgeVisitors(ids);
      const failed = await deps.eraser.eraseNow(ids);
      if (!settled) {
        // M3: one more DELETE once the timed-out forward attempt has settled.
        deps.eraser.reDeleteAfter(new Promise<void>((r) => deps.queue.onInFlightSettled(r)), ids);
      }
      deps.count('erased', ids.length - failed.length);
      if (failed.length === 0) return withCookies(204, [clearVid, clearForgetCookie(deps.secureCookies)]);
      deps.count('failed', failed.length);
      deps.eraser.queueRetry(failed); // M7: also an id beyond the cookie's four stays here (N3)
      return withCookies(503, [clearVid, setForgetCookie(newest(failed), deps.secureCookies)]);
    } finally {
      deps.eraser.release();
    }
  } catch {
    if (pendingIds.length === 0) return withCookies(400, [clearVid]);
    // Review W2: err towards erasure; the browser and the server retry the ids.
    try {
      deps.eraser.queueRetry(pendingIds);
    } catch {
      // best effort
    }
    return withCookies(503, [clearVid, setForgetCookie(newest(pendingIds), deps.secureCookies)]);
  }
}
