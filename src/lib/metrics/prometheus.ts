// Minimal typed client for the Prometheus HTTP API's instant-query endpoint
// (issue #17). Server-only: imported exclusively from
// `lib/metrics/cluster.ts`, which runs during SSR in `DashboardShell`. The
// Prometheus URL and any response data never reach the browser. No new
// dependency — uses the platform `fetch`.
import { METRICS_ENV } from '@/metrics.env';

export interface PromSample {
  metric: Record<string, string>;
  value: number;
}

interface PrometheusQueryResponse {
  status: string;
  data?: {
    resultType?: string;
    result?: Array<{ metric: Record<string, string>; value: [number, string] }>;
  };
}

// Runs a PromQL instant query and returns its vector samples. Throws on any
// non-2xx response or a response shape that is not a successful vector —
// callers (`getLiveCluster`) treat a throw the same as a timeout via
// `Promise.allSettled`.
export async function queryInstant(promql: string): Promise<PromSample[]> {
  const res = await fetch(`${METRICS_ENV.PROMETHEUS_URL}/api/v1/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ query: promql }),
    cache: 'no-store',
    signal: AbortSignal.timeout(2500),
  });

  if (!res.ok) {
    throw new Error(`Prometheus query failed: HTTP ${res.status}`);
  }

  const json = (await res.json()) as PrometheusQueryResponse;
  if (json.status !== 'success' || json.data?.resultType !== 'vector') {
    throw new Error(
      `Prometheus query returned an unexpected response (status=${json.status}, resultType=${json.data?.resultType ?? 'none'})`,
    );
  }

  const samples: PromSample[] = [];
  for (const item of json.data.result ?? []) {
    const raw = item.value?.[1];
    const value = typeof raw === 'string' ? parseFloat(raw) : NaN;
    if (Number.isFinite(value)) {
      samples.push({ metric: item.metric, value });
    }
  }
  return samples;
}
