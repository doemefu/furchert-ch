import type { NextAuthConfig } from 'next-auth';

// Edge-safe Auth.js v5 config (no Node-only imports) — consumed by `auth.ts`.
// Generic OIDC provider against the homelab auth-service. Discovery happens at
// sign-in time (Node route handler), not at module load, so empty env at build
// time is fine. Tokens are kept server-side only (see callbacks + worklog D-C).
//
// `checks` is intentionally NOT set: Auth.js derives them from the issuer's
// discovery document (PKCE is advertised by the Spring Authorization Server).

export type Role = 'USER' | 'ADMIN';

// Defence-in-depth: every layer that touches `role` (profile mapping, jwt
// callback, session callback, RSC render) passes it through this normaliser.
// Anything that isn't the literal string 'ADMIN' — missing, null, a typo,
// a forged claim, a corrupted JWT — collapses to the non-privileged 'USER'.
export const asRole = (v: unknown): Role => (v === 'ADMIN' ? 'ADMIN' : 'USER');

// Issuer is env-driven so staging and prod target different IdPs; the literal
// fallback exists only so this module is importable in places (storybook,
// edge build snapshots) where env isn't wired. Runtime env presence is
// asserted by `src/auth.env.ts` before any sign-in attempt proceeds.
const ISSUER = process.env.OIDC_ISSUER ?? 'https://auth.furchert.ch';

export const authConfig = {
  trustHost: true,
  session: { strategy: 'jwt' },
  providers: [
    {
      id: 'furchert-ch',
      name: 'furchert.ch',
      type: 'oidc',
      issuer: ISSUER,
      // The `?? ''` keeps this provider config buildable in environments
      // without real OIDC env (CI build, edge bundle snapshot). The real
      // fail-loud check lives in `src/auth.env.ts`, called from every route
      // handler that performs sign-in / logout. An empty string here that
      // reaches an actual sign-in would error opaquely at the IdP; the env
      // assertion stops it earlier with a clear message.
      clientId: process.env.OIDC_CLIENT_ID ?? '',
      clientSecret: process.env.OIDC_CLIENT_SECRET ?? '',
      authorization: { params: { scope: 'openid profile email' } },
      // Map custom claims into the user object on first sign-in. The role
      // check defends against missing AND any non-'ADMIN' value (spoofed,
      // null, typo); only the literal 'ADMIN' grants privilege.
      profile(profile: Record<string, unknown>) {
        const sub = profile.sub;
        if (typeof sub !== 'string' || sub.length === 0) {
          // A missing `sub` is a protocol violation by the IdP. Refuse rather
          // than silently producing an empty-string `id` that could collide
          // across users.
          throw new Error('OIDC profile missing required `sub` claim');
        }
        return {
          id: sub,
          name: (profile.name as string | undefined) ?? null,
          email: (profile.email as string | undefined) ?? null,
          role: asRole(profile.role),
        };
      },
    },
  ],
  callbacks: {
    jwt({ token, user, account }) {
      // First sign-in: persist role + id_token onto the JWT (server-side only).
      // We deliberately do NOT persist the access_token yet: it would enlarge
      // the session cookie (risking Auth.js cookie chunking, which complicates
      // logout) and nothing needs it before Phase 6. Phase 6 will reintroduce
      // access_token persistence together with chunk-aware cookie clearing.
      //
      // Re-normalise the role here even though `profile()` already did: if a
      // future code path ever populates `user` from somewhere other than
      // `profile()` (account linking, custom adapter, second provider) the
      // narrowing still holds.
      if (user) token.role = asRole(user.role);
      if (account?.id_token) token.idToken = account.id_token;
      return token;
    },
    session({ session, token }) {
      // Expose ONLY the role to the browser session — never the tokens (D-C).
      // Re-normalise once more so a corrupted JWT can't surface a non-'ADMIN'
      // value as anything other than 'USER'.
      if (session.user) session.user.role = asRole(token.role);
      return session;
    },
  },
} satisfies NextAuthConfig;
