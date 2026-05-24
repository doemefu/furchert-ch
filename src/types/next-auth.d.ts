import type { DefaultSession } from 'next-auth';
import type { Role } from '@/auth.config';

// Module augmentation so the role claim is typed and the id token is
// available server-side on the JWT (never exposed to the browser session).
declare module 'next-auth' {
  // ┌─────────────────────────────────────────────────────────────────────┐
  // │ Browser-visible session shape. NEVER add `accessToken` / `idToken`  │
  // │ here — server-only token fields belong on `JWT` in the              │
  // │ `next-auth/jwt` augmentation below. Adding tokens here would ship   │
  // │ them in the encrypted session cookie that the browser reads via     │
  // │ `useSession()`, leaking them to the client. The deliberate          │
  // │ asymmetry between this interface and the `JWT` interface below is   │
  // │ the security boundary.                                              │
  // └─────────────────────────────────────────────────────────────────────┘
  interface Session {
    user: {
      role?: Role;
    } & DefaultSession['user'];
  }
  interface User {
    role?: Role;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: Role;
    // access_token is intentionally not persisted yet (see auth.config.ts jwt
    // callback); Phase 6 adds it back with chunk-aware cookie handling.
    idToken?: string;
  }
}
