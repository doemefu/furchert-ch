// Public live status for the homelab block on /projects/homelab. No auth, no
// input: the request (including any query string) is ignored, so there is one
// cache key and the in-process cache in `labStatus.ts` decides when Prometheus
// is asked. Always HTTP 200 with the allowlisted shape; failures read as
// "unknown". `force-dynamic` per the repo rule for route handlers
// (DEPLOYMENT.md), not left to the Next 16 default. No CORS headers: only the
// site's own page calls this. `/api` is disallowed in robots.txt.
import { getLabStatus, unknownStatus } from '@/lib/metrics/labStatus';

export const dynamic = 'force-dynamic';

export async function GET() {
  let body;
  try {
    body = await getLabStatus();
  } catch {
    body = unknownStatus();
  }
  return Response.json(body, { headers: { 'Cache-Control': 'public, max-age=30' } });
}
