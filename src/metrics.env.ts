// Lazy env accessor for the optional Prometheus metrics source (issue #17).
// Mirrors the read-at-request-time pattern of `auth.env.ts`, but — unlike
// OIDC — this source is optional by design: a missing or unreachable
// Prometheus degrades the dashboard to an honest fallback UI (see
// `lib/metrics/cluster.ts`). It never throws and never blocks `pnpm build`.

const DEFAULT_PROMETHEUS_URL = 'http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090';

function readPrometheusUrl(): string {
  const v = process.env.PROMETHEUS_URL;
  // Strip a trailing slash for the same reason as `auth.env.ts`'s
  // `OIDC_ISSUER`: it would otherwise produce a double slash when
  // concatenated with `/api/v1/query` in `lib/metrics/prometheus.ts`.
  return (v && v.length > 0 ? v : DEFAULT_PROMETHEUS_URL).replace(/\/$/, '');
}

// Read lazily (at property access, i.e. request time) rather than at module
// import, matching `AUTH_ENV` — keeps the build green regardless of env.
export const METRICS_ENV = {
  get PROMETHEUS_URL(): string {
    return readPrometheusUrl();
  },
};

// Local dev has no in-cluster DNS, so an unset `PROMETHEUS_URL` would
// otherwise stall every dashboard render for the full fetch timeout before
// falling back. Outside production, skip the fetch entirely when no override
// is configured (see `.env.local.example` for the port-forward alternative).
export function shouldAttemptMetrics(): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  return Boolean(process.env.PROMETHEUS_URL && process.env.PROMETHEUS_URL.length > 0);
}
