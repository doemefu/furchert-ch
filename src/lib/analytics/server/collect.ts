// Handlers of `POST /api/v` (spec 100 §5.3) and `POST /api/v/forget` (§5.4),
// free of Next so they are tested with plain Fetch requests. The route files
// only wire the real dependencies. Every non-error outcome is 204 with an
// empty body and `Cache-Control: no-store`; error bodies are empty too. The
// only `Set-Cookie` values are the `fa_vid` mint and clear.
//
// WA-5 (#157) inserts step 7 (bot list, prefetch) and step 8 (collect rate
// limits) into handleCollect, and the forget limiter, queue purge and
// synchronous erasure into handleForget.
import { ANALYTICS_CONSENT_VERSION, consentExpired, utcDay } from '../consent';
import { clearVisitorCookie, currentVisitorId, hasSessionCookie, mintVisitorCookie, readVisitorCookie } from './cookie';
import { canonicalEvent, canonicalViewport, parseEnvelope } from './envelope';
import { toForwardEvent, type EdgeDropReason, type ForwardEvent } from './forwardModel';
import { isJsonContentType, isSameOrigin, readCappedBody } from './request';
import { deviceContext } from './ua';

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
}

function empty(status: number, extra: Record<string, string> = {}): Response {
  return new Response(null, { status, headers: { 'Cache-Control': 'no-store', ...extra } });
}

/** 405 for every method but POST (M9); the forget route clears the cookie on it too. */
export function methodNotAllowed(clearCookie: boolean, secure: boolean): Response {
  return empty(405, { Allow: 'POST', ...(clearCookie ? { 'Set-Cookie': clearVisitorCookie(secure) } : {}) });
}

/** Steps 2 to 4, shared by both routes. Returns an error status or the body text. */
async function guard(req: Request, deps: CollectDeps): Promise<{ status: number } | { text: string }> {
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
    const envelope = parseEnvelope(checked.text); // step 9
    if (!envelope) return empty(400);
    const receivedAtMs = deps.now();
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

/**
 * WA-2b forget: cookie-only, never mints, never limited, unaffected by the
 * kill switches and the signed-in drop. Every response clears `fa_vid` (the
 * WA-5 limiter's 429 will be the only exception).
 */
export async function handleForget(req: Request, deps: Pick<CollectDeps, 'expectedOrigin' | 'secureCookies'>): Promise<Response> {
  const clear = { 'Set-Cookie': clearVisitorCookie(deps.secureCookies) };
  try {
    const checked = await guard(req, deps as CollectDeps);
    return empty('status' in checked ? checked.status : 204, clear);
  } catch {
    return empty(400, clear);
  }
}
