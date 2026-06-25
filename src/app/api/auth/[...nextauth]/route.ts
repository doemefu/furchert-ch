// Auth.js v5 catch-all route handler. Lives under /api, which the next-intl
// middleware matcher already excludes (no locale prefix).
import { handlers } from '@/auth';
import { assertAuthEnv } from '@/auth.env';

const { GET: rawGet, POST: rawPost } = handlers;

// Fail loud if OIDC env is missing on the first request, rather than letting
// `getToken` silently return null and the federated-logout become a no-op.
// Wrapped (not called at module load) so `pnpm build` still works without env.
export const GET: typeof rawGet = (req) => {
  assertAuthEnv();
  return rawGet(req);
};
export const POST: typeof rawPost = (req) => {
  assertAuthEnv();
  return rawPost(req);
};
