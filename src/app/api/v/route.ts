// Same-origin collect route of first-party web analytics (spec 100 §5.1 to
// §5.3; WA-2b #154). The tracker posts consented event batches here; the
// logic lives in src/lib/analytics/server/collect.ts. Dark while
// ANALYTICS_UI_ENABLED is false (step 5 answers 204 and keeps nothing).
import { handleCollect, methodNotAllowed } from '@/lib/analytics/server/collect';
import { ANALYTICS_ENV } from '@/lib/analytics/server/env';
import { collectDeps } from '@/lib/analytics/server/runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request): Promise<Response> {
  return handleCollect(req, collectDeps());
}

const notAllowed = () => methodNotAllowed(false, ANALYTICS_ENV.secureCookies);
export { notAllowed as GET, notAllowed as PUT, notAllowed as PATCH, notAllowed as DELETE, notAllowed as OPTIONS };
