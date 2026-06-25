// Liveness/readiness target for k8s probes. Static 200 — no locale redirect
// (the next-intl middleware matcher already excludes /api). No auth, no env read,
// so probes never flap on an upstream (IdP) outage.
export const dynamic = 'force-static';

export function GET() {
  return Response.json({ status: 'ok' });
}
