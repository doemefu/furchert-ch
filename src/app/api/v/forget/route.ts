// Forget: clears `fa_vid` and erases the visitor's events (spec 100 §4.4,
// §5.4; WA-2b #154, durable erasure WA-5 #157). Called by the consent
// controller on Decline, withdrawal, a GPC/DNT signal and the never-track
// switch. Not affected by the kill switches or the signed-in drop; never
// mints. The logic lives in src/lib/analytics/server/collect.ts.
import { handleForget, methodNotAllowed } from '@/lib/analytics/server/collect';
import { ANALYTICS_ENV } from '@/lib/analytics/server/env';
import { forgetDeps } from '@/lib/analytics/server/runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request): Promise<Response> {
  return handleForget(req, forgetDeps());
}

const notAllowed = () => methodNotAllowed(true, ANALYTICS_ENV.secureCookies);
export { notAllowed as GET, notAllowed as PUT, notAllowed as PATCH, notAllowed as DELETE, notAllowed as OPTIONS };
