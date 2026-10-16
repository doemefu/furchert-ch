// Lazy env accessor for the auth-service admin REST API used by
// /dashboard/auth (#44; contract: ../auth-service/INTERFACES.md §4 + §8).
// Mirrors `netmon.env.ts`: read at request time, never throws, never blocks
// `pnpm build`. A missing or unreachable auth-service degrades the page to
// honest "unavailable" states (see `lib/authadmin/client.ts`).
//
// No new secret: requests carry the signed-in admin's own OIDC access token,
// and the refresh grant reuses `OIDC_CLIENT_ID` / `OIDC_CLIENT_SECRET`.

const DEFAULT_AUTH_SERVICE_URL = 'http://auth-service.apps.svc.cluster.local:8080';

export const AUTHADMIN_ENV = {
  get AUTH_SERVICE_URL(): string {
    const v = process.env.AUTH_SERVICE_URL;
    // Trailing slash stripped: the client concatenates `/api/v1/...`.
    return (v && v.length > 0 ? v : DEFAULT_AUTH_SERVICE_URL).replace(/\/$/, '');
  },
};

// Local dev has no in-cluster DNS: outside production, skip every admin
// fetch unless the override is configured (same idea as `shouldAttemptNetmon()`).
export function shouldAttemptAuthAdmin(): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  const v = process.env.AUTH_SERVICE_URL;
  return Boolean(v && v.length > 0);
}
