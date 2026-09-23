// Lazy env accessor for the optional data-service network-monitoring source
// (NM-1, #61; contract: infrastructure/docs/060-network-monitoring.md §8).
// Mirrors `metrics.env.ts`: read at request time, never throws, never blocks
// `pnpm build`. A missing or unreachable data-service degrades
// /dashboard/network to honest "unavailable" states (see `lib/netmon/client.ts`).
//
// The client-credentials secret is NOT read here: it reuses the existing
// `OIDC_CLIENT_ID` / `OIDC_CLIENT_SECRET` via `auth.env.ts` (no new secret).

const DEFAULT_DATA_SERVICE_URL = 'http://data-service.apps.svc.cluster.local:8082';
const DEFAULT_DATA_SERVICE_TOKEN_URL = 'http://auth-service.apps.svc.cluster.local:8080/oauth2/token';

function readUrl(name: 'DATA_SERVICE_URL' | 'DATA_SERVICE_TOKEN_URL', fallback: string): string {
  const v = process.env[name];
  // Trailing slash stripped for the same reason as `metrics.env.ts`: the
  // client concatenates `/api/netmon/...` onto the base URL.
  return (v && v.length > 0 ? v : fallback).replace(/\/$/, '');
}

export const NETMON_ENV = {
  get DATA_SERVICE_URL(): string {
    return readUrl('DATA_SERVICE_URL', DEFAULT_DATA_SERVICE_URL);
  },
  get DATA_SERVICE_TOKEN_URL(): string {
    return readUrl('DATA_SERVICE_TOKEN_URL', DEFAULT_DATA_SERVICE_TOKEN_URL);
  },
};

// Local dev has no in-cluster DNS: outside production, skip every netmon
// fetch unless BOTH overrides are configured, instead of stalling the render
// for the full timeout on the in-cluster default (same idea as
// `shouldAttemptMetrics()`; the token URL default is just as unreachable).
export function shouldAttemptNetmon(): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  const isSet = (v: string | undefined) => Boolean(v && v.length > 0);
  return isSet(process.env.DATA_SERVICE_URL) && isSet(process.env.DATA_SERVICE_TOKEN_URL);
}
