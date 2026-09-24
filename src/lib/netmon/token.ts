// Server-only client-credentials token for data-service's read API
// (NM-1, #61; contract: infrastructure/docs/060-network-monitoring.md §7.5).
// Imported exclusively by `lib/netmon/client.ts`, which runs during SSR of
// /dashboard/network after the ADMIN check. The token never reaches the
// browser and is never logged — only HTTP status codes are.
//
// Reuses the existing `furchert-ch` OIDC client (no new secret): auth-service
// grants it `client_credentials` with scope `netmon:read` (auth-service V6).
import { AUTH_ENV } from '@/auth.env';
import { NETMON_ENV } from '@/netmon.env';

const SCOPE = 'netmon:read';
// §7.5: cache until `exp − 60 s`. Tokens live 15 min.
const EXPIRY_SKEW_MS = 60_000;
// Used only if the token response omits `expires_in` — conservative.
const FALLBACK_LIFETIME_MS = 120_000;

interface CachedToken {
  value: string;
  refreshAt: number;
}

let cached: CachedToken | null = null;
// De-duplicates concurrent renders that all miss the cache at once.
let inFlight: Promise<string> | null = null;

// RFC 6749 §2.3.1: client_id and client_secret are form-urlencoded before
// Base64 in HTTP Basic auth. Spring Authorization Server URL-decodes them.
function basicAuth(clientId: string, clientSecret: string): string {
  const pair = `${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`;
  return `Basic ${Buffer.from(pair, 'utf8').toString('base64')}`;
}

async function requestToken(): Promise<string> {
  // AUTH_ENV throws with an actionable message if the OIDC env is missing;
  // the caller treats any throw as "data-service unavailable".
  const res = await fetch(NETMON_ENV.DATA_SERVICE_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(AUTH_ENV.OIDC_CLIENT_ID, AUTH_ENV.OIDC_CLIENT_SECRET),
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: SCOPE }),
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    // Status only — the OAuth2 error body is not logged or surfaced.
    throw new Error(`token request failed: HTTP ${res.status}`);
  }

  const json = (await res.json()) as { access_token?: unknown; expires_in?: unknown };
  if (typeof json.access_token !== 'string' || json.access_token.length === 0) {
    throw new Error('token response without access_token');
  }

  const lifetimeMs =
    typeof json.expires_in === 'number' && Number.isFinite(json.expires_in) && json.expires_in > 0
      ? Math.max(json.expires_in * 1000 - EXPIRY_SKEW_MS, 0)
      : FALLBACK_LIFETIME_MS;
  cached = { value: json.access_token, refreshAt: Date.now() + lifetimeMs };
  return json.access_token;
}

// Returns a valid bearer token, fetching a new one when the cache is empty or
// within 60 s of expiry. Throws on any failure (network, non-2xx, bad body).
export async function getNetmonToken(): Promise<string> {
  if (cached && Date.now() < cached.refreshAt) return cached.value;
  if (!inFlight) {
    inFlight = requestToken().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

// Drops the cached token, e.g. after data-service answered 401 (key rotation,
// auth-service restart with a new signing key).
export function invalidateNetmonToken(): void {
  cached = null;
}
