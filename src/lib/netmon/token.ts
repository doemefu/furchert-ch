// Server-only client-credentials token for data-service's read API
// (NM-1, #61; contract: infrastructure/docs/060-network-monitoring.md §7.5).
// Imported exclusively by `lib/netmon/client.ts`, which runs during SSR of
// /dashboard/network after the ADMIN check. The token never reaches the
// browser and is never logged — only HTTP status codes are.
//
// Reuses the existing `furchert-ch` OIDC client (no new secret): auth-service
// grants it `client_credentials` with scope `netmon:read` (auth-service V6).
// Caching and de-duplication live in the shared factory (#154).
import 'server-only';
import { AUTH_ENV } from '@/auth.env';
import { createClientCredentialsToken } from '@/lib/auth/clientCredentialsToken';
import { NETMON_ENV } from '@/netmon.env';

const token = createClientCredentialsToken('netmon:read', 'furchert.netmon.token', {
  tokenUrl: () => NETMON_ENV.DATA_SERVICE_TOKEN_URL,
  // AUTH_ENV throws with an actionable message if the OIDC env is missing;
  // the caller treats any throw as "data-service unavailable".
  clientId: () => AUTH_ENV.OIDC_CLIENT_ID,
  clientSecret: () => AUTH_ENV.OIDC_CLIENT_SECRET,
});

// Returns a valid bearer token, fetching a new one when the cache is empty or
// within 60 s of expiry. Throws on any failure (network, non-2xx, bad body).
export function getNetmonToken(): Promise<string> {
  return token.get();
}

// Drops the cached token, e.g. after data-service answered 401 (key rotation,
// auth-service restart with a new signing key).
export function invalidateNetmonToken(): void {
  token.invalidate();
}
