// Server-only client-credentials tokens from auth-service, one cache per
// scope (netmon:read for /dashboard/network, analytics:write for the web
// analytics forward queue; spec 100 §11: one token per scope, never
// combined). The cache lives on `globalThis` under the given symbol key, so
// route handlers and Server Actions in the same process share it. Tokens are
// never logged; only HTTP status codes are.
import 'server-only';
import { basicAuth } from '@/lib/auth/shared';

// Cache until `exp − 60 s` (060 §7.5). Tokens live 15 min.
const EXPIRY_SKEW_MS = 60_000;
// Used only if the token response omits `expires_in` — conservative.
const FALLBACK_LIFETIME_MS = 120_000;
const TIMEOUT_MS = 5_000;

interface TokenState {
  cached: { value: string; refreshAt: number } | null;
  inFlight: Promise<string> | null;
}

export interface ClientCredentialsDeps {
  tokenUrl: () => string;
  clientId: () => string;
  clientSecret: () => string;
  fetch?: typeof fetch;
  now?: () => number;
}

export interface ClientCredentialsToken {
  /** A valid bearer token; throws on any failure (network, non-2xx, bad body). */
  get(): Promise<string>;
  /** Drops the cached token, e.g. after a 401 from the resource server. */
  invalidate(): void;
}

export function createClientCredentialsToken(
  scope: string,
  symbolKey: string,
  deps: ClientCredentialsDeps,
): ClientCredentialsToken {
  const now = deps.now ?? Date.now;
  const key = Symbol.for(symbolKey);
  const g = globalThis as typeof globalThis & { [k: symbol]: TokenState | undefined };
  const state = (): TokenState => (g[key] ??= { cached: null, inFlight: null });

  async function requestToken(): Promise<string> {
    const res = await (deps.fetch ?? fetch)(deps.tokenUrl(), {
      method: 'POST',
      headers: {
        Authorization: basicAuth(deps.clientId(), deps.clientSecret()),
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({ grant_type: 'client_credentials', scope }),
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`token request failed: HTTP ${res.status}`);
    const json = (await res.json()) as { access_token?: unknown; expires_in?: unknown };
    if (typeof json.access_token !== 'string' || json.access_token.length === 0) {
      throw new Error('token response without access_token');
    }
    const lifetimeMs =
      typeof json.expires_in === 'number' && Number.isFinite(json.expires_in) && json.expires_in > 0
        ? Math.max(json.expires_in * 1000 - EXPIRY_SKEW_MS, 0)
        : FALLBACK_LIFETIME_MS;
    state().cached = { value: json.access_token, refreshAt: now() + lifetimeMs };
    return json.access_token;
  }

  return {
    get() {
      const s = state();
      if (s.cached && now() < s.cached.refreshAt) return Promise.resolve(s.cached.value);
      s.inFlight ??= requestToken().finally(() => {
        state().inFlight = null;
      });
      return s.inFlight;
    },
    invalidate() {
      state().cached = null;
    },
  };
}
