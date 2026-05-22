import type { NextAuthConfig } from 'next-auth';

// Edge-safe Auth.js v5 config (no Node-only imports) — consumed by `auth.ts`.
// Generic OIDC provider against the homelab auth-service. Discovery happens at
// sign-in time (Node route handler), not at module load, so empty env at build
// time is fine. Tokens are kept server-side only (see callbacks + worklog D-C).
//
// `checks` is intentionally NOT set: Auth.js derives them from the issuer's
// discovery document (PKCE is advertised by the Spring Authorization Server).
export const authConfig = {
  trustHost: true,
  session: { strategy: 'jwt' },
  providers: [
    {
      id: 'furchert-ch',
      name: 'furchert.ch',
      type: 'oidc',
      issuer: 'https://auth.furchert.ch',
      clientId: process.env.OIDC_CLIENT_ID ?? '',
      clientSecret: process.env.OIDC_CLIENT_SECRET ?? '',
      authorization: { params: { scope: 'openid profile email' } },
      // Map custom claims into the user object on first sign-in. Fail closed:
      // a missing `role` is treated as the non-privileged 'USER' (worklog F-Q3).
      profile(profile: Record<string, unknown>) {
        return {
          id: String(profile.sub ?? ''),
          name: (profile.name as string | undefined) ?? null,
          email: (profile.email as string | undefined) ?? null,
          // Explicit equality, not a cast: a spoofed/malformed value can only
          // ever resolve to the non-privileged 'USER'. Phase 6 admin gates
          // check `role === 'ADMIN'` against this validated value.
          role: profile.role === 'ADMIN' ? 'ADMIN' : 'USER',
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
      if (user) token.role = (user as { role?: 'USER' | 'ADMIN' }).role ?? 'USER';
      if (account) token.idToken = account.id_token;
      return token;
    },
    session({ session, token }) {
      // Expose ONLY the role to the browser session — never the tokens (D-C).
      if (session.user) session.user.role = token.role ?? 'USER';
      return session;
    },
  },
} satisfies NextAuthConfig;
