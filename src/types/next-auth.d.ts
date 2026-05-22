import type { DefaultSession } from 'next-auth';

// Module augmentation so the role claim is typed and the access/id tokens are
// available server-side on the JWT (never exposed to the browser session).
declare module 'next-auth' {
  interface Session {
    user: {
      role?: 'USER' | 'ADMIN';
    } & DefaultSession['user'];
  }
  interface User {
    role?: 'USER' | 'ADMIN';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: 'USER' | 'ADMIN';
    // access_token is intentionally not persisted yet (see auth.config.ts jwt
    // callback); Phase 6 adds it back with chunk-aware cookie handling.
    idToken?: string;
  }
}
