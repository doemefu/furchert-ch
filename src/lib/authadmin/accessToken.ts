// Server-only access to the signed-in admin's own OIDC access token for the
// /dashboard/auth proxy (#44; ../auth-service/INTERFACES.md §4). The token
// pair was persisted on the encrypted session JWT at sign-in
// (`auth.config.ts`); this module reads it with `getToken` and never hands it
// to the browser — only Server Components and Server Actions import it.
//
// Access tokens live 15 min, the session 7 d. RSC renders cannot rewrite the
// session cookie, so an expired access token is refreshed in memory with the
// stored refresh token (auth-service reuses refresh tokens for `furchert-ch`)
// and cached until shortly before expiry, keyed by a SHA-256 of the refresh
// token so the raw token is never used as a map key. Tokens are never logged.
import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { getToken, type JWT } from 'next-auth/jwt';
import { AUTH_ENV } from '@/auth.env';
import { AUTHADMIN_ENV, shouldAttemptAuthAdmin } from '@/authadmin.env';

export type AdminTokenResult =
  /** `subject` = the admin's own `sub` (auth-service username), for self-protection checks. */
  | { ok: true; token: string; subject: string | null }
  /** `no_token`: session predates #44 (no access token stored). `expired`: refresh failed or impossible. */
  | { ok: false; reason: 'no_session' | 'no_token' | 'expired' };

// Treat a token as expired this long before its `exp`, so it cannot lapse
// between this check and auth-service validating it.
const EXPIRY_SKEW_S = 60;
const MAX_CACHE_ENTRIES = 50;
// A failed refresh is remembered briefly so a dead refresh token does not
// cost a token-endpoint round-trip on every render and action.
const FAILED_REFRESH_TTL_S = 30;

interface Refreshed {
  token: string;
  expiresAt: number;
}

const cache = new Map<string, Refreshed>();
const failed = new Map<string, number>(); // key → retry-after (epoch s)
const inFlight = new Map<string, Promise<Refreshed | null>>();

// RFC 6749 §2.3.1 Basic auth (same encoding as `lib/netmon/token.ts`).
function basicAuth(clientId: string, clientSecret: string): string {
  const pair = `${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`;
  return `Basic ${Buffer.from(pair, 'utf8').toString('base64')}`;
}

async function refreshAccessToken(refreshToken: string, nowS: number): Promise<Refreshed | null> {
  // Same local-dev guard as the REST client: no stall on the in-cluster FQDN.
  if (!shouldAttemptAuthAdmin()) return null;
  try {
    const res = await fetch(`${AUTHADMIN_ENV.AUTH_SERVICE_URL}/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: basicAuth(AUTH_ENV.OIDC_CLIENT_ID, AUTH_ENV.OIDC_CLIENT_SECRET),
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      // Status only — never the body (it can echo the grant) or the token.
      console.warn(`[authadmin] token refresh failed: HTTP ${res.status}`);
      return null;
    }
    const json = (await res.json()) as { access_token?: unknown; expires_in?: unknown };
    if (typeof json.access_token !== 'string' || json.access_token.length === 0) return null;
    const lifetime =
      typeof json.expires_in === 'number' && Number.isFinite(json.expires_in) && json.expires_in > 0
        ? json.expires_in
        : 120;
    return { token: json.access_token, expiresAt: nowS + lifetime };
  } catch {
    console.warn('[authadmin] token refresh failed: unreachable');
    return null;
  }
}

function remember<V>(map: Map<string, V>, key: string, value: V, isLive: (v: V) => boolean): void {
  map.delete(key); // re-insert at the end; never evict another entry for an update
  for (const [k, v] of map) if (!isLive(v)) map.delete(k);
  // Insertion-ordered Map: drop the oldest entry once the cap is reached.
  if (map.size >= MAX_CACHE_ENTRIES) {
    const oldest = map.keys().next().value;
    if (oldest !== undefined) map.delete(oldest);
  }
  map.set(key, value);
}

/**
 * Pure core of {@link getAdminAccessToken}: decides from the session JWT
 * whether the stored access token is usable or must be refreshed. Exported
 * for unit tests; `refresh` is injectable for the same reason.
 */
export async function resolveAdminAccessToken(
  jwt: JWT | null,
  nowS: number,
  refresh: (refreshToken: string, nowS: number) => Promise<Refreshed | null> = refreshAccessToken,
): Promise<AdminTokenResult> {
  if (!jwt) return { ok: false, reason: 'no_session' };
  if (!jwt.accessToken) return { ok: false, reason: 'no_token' };
  const exp = jwt.accessTokenExpiresAt;
  const subject = typeof jwt.sub === 'string' && jwt.sub.length > 0 ? jwt.sub : null;
  if (typeof exp === 'number' && exp - EXPIRY_SKEW_S > nowS) return { ok: true, token: jwt.accessToken, subject };
  if (!jwt.refreshToken) return { ok: false, reason: 'expired' };

  const key = createHash('sha256').update(jwt.refreshToken).digest('hex');
  const hit = cache.get(key);
  if (hit && hit.expiresAt - EXPIRY_SKEW_S > nowS) return { ok: true, token: hit.token, subject };
  const retryAfter = failed.get(key);
  if (retryAfter !== undefined && retryAfter > nowS) return { ok: false, reason: 'expired' };

  let pending = inFlight.get(key);
  if (!pending) {
    pending = refresh(jwt.refreshToken, nowS).finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
  }
  const refreshed = await pending;
  if (!refreshed) {
    cache.delete(key);
    remember(failed, key, nowS + FAILED_REFRESH_TTL_S, (t) => t > nowS);
    return { ok: false, reason: 'expired' };
  }
  failed.delete(key);
  remember(cache, key, refreshed, (v) => v.expiresAt > nowS);
  return { ok: true, token: refreshed.token, subject };
}

/** Test hook: forget every cached refresh result. */
export function clearAdminTokenCache(): void {
  cache.clear();
  failed.clear();
  inFlight.clear();
}

// Reads the session JWT from the request cookies. Cookie name and salt must
// match how Auth.js set the cookie (same rule as `api/federated-logout`).
async function readSessionJwt(): Promise<JWT | null> {
  const secureCookie = process.env.NODE_ENV === 'production';
  const cookieName = secureCookie ? '__Secure-authjs.session-token' : 'authjs.session-token';
  try {
    return await getToken({
      req: { headers: await headers() },
      secret: AUTH_ENV.AUTH_SECRET,
      secureCookie,
      salt: cookieName,
      cookieName,
    });
  } catch {
    return null;
  }
}

/** Returns a usable bearer token for auth-service's admin API, or why there is none. */
export async function getAdminAccessToken(): Promise<AdminTokenResult> {
  return resolveAdminAccessToken(await readSessionJwt(), Math.floor(Date.now() / 1000));
}
