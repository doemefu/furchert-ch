// Runtime assertion that OIDC env is present. Imported by route handlers and
// the dashboard RSC, NOT by `auth.config.ts` (which must stay buildable without
// real env values). Values are read lazily through a Proxy so `pnpm build` —
// which evaluates modules but never sign-in attempts — does not throw.
//
// The assertion exists because the previous `?? ''` fallbacks for
// OIDC_CLIENT_ID / OIDC_CLIENT_SECRET / AUTH_SECRET let a misconfigured
// deployment degrade into a *silent* failure (`getToken` returns null,
// federated logout becomes a no-op, the user appears logged in to the IdP
// indefinitely). Fail-loud is the only safe default.

type AuthEnvKey = 'OIDC_ISSUER' | 'OIDC_CLIENT_ID' | 'OIDC_CLIENT_SECRET' | 'AUTH_SECRET';

const ISSUER_FALLBACK = 'https://auth.furchert.ch';

function read(key: AuthEnvKey): string {
  const v = process.env[key];
  if (key === 'OIDC_ISSUER') return v && v.length > 0 ? v : ISSUER_FALLBACK;
  if (!v || v.length === 0) {
    throw new Error(
      `[auth] required env var ${key} is missing or empty. ` +
        `See DEPLOYMENT.md (production: secretKeyRef) or .env.local.example (local).`,
    );
  }
  return v;
}

// Lazy-reading proxy: env is read on first property access (request time),
// not at module import. That keeps the build green even without real env,
// while still failing loud at the first sign-in / logout attempt.
export const AUTH_ENV = new Proxy({} as Record<AuthEnvKey, string>, {
  get(_target, prop: string) {
    return read(prop as AuthEnvKey);
  },
});

// Force-read every required key. Called from the Auth.js route handler so a
// misconfigured deployment fails on the very first request to /api/auth/*
// rather than at a later, more confusing point (a 500 inside discovery, a
// silent `getToken` returning null, a federated-logout no-op).
export function assertAuthEnv(): void {
  // Side-effecting reads; each property access triggers the Proxy `get` →
  // throws if any required key is missing.
  void AUTH_ENV.OIDC_CLIENT_ID;
  void AUTH_ENV.OIDC_CLIENT_SECRET;
  void AUTH_ENV.AUTH_SECRET;
  void AUTH_ENV.OIDC_ISSUER;
}
