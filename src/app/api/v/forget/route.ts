// Clears the analytics visitor cookie `fa_vid` (spec 100 §4.4, §5.4; WA-2b
// #154). Called by the consent controller on Decline, withdrawal and the
// never-track switch. Cookie-only until WA-5 (#157) adds the forget limiter
// and the synchronous erasure in data-service. Not affected by the kill
// switches or the signed-in drop; never mints.
import { handleForget, methodNotAllowed } from '@/lib/analytics/server/collect';
import { ANALYTICS_ENV } from '@/lib/analytics/server/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request): Promise<Response> {
  return handleForget(req, { expectedOrigin: ANALYTICS_ENV.expectedOrigin, secureCookies: ANALYTICS_ENV.secureCookies });
}

const notAllowed = () => methodNotAllowed(true, ANALYTICS_ENV.secureCookies);
export { notAllowed as GET, notAllowed as PUT, notAllowed as PATCH, notAllowed as DELETE, notAllowed as OPTIONS };
