'use client';

// Client-side SessionProvider so the Header can reflect auth state via
// useSession() WITHOUT calling auth() in the (server) layout — which would
// opt every public page out of static generation (worklog D-B). With no
// `session` prop the provider lazily fetches /api/auth/session on mount, so
// public pages stay statically rendered.
import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
