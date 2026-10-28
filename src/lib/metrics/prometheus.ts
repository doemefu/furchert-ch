// Minimal typed client for the Prometheus HTTP API's instant-query endpoint
// (issue #17). Server-only: imported exclusively from
// `lib/metrics/cluster.ts`, which runs during SSR in `DashboardShell`. The
// Prometheus URL and any response data never reach the browser. No new
// dependency — uses the platform `fetch`.
import 'server-only';
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

export interface PromSeries {
  metric: Record<string, string>;
  // tMs is epoch milliseconds (Prometheus seconds x 1000); v is always finite.
  points: Array<{ tMs: number; v: number }>;
}

// Epoch seconds, integers.
export interface RangeParams {
  startSec: number;
  endSec: number;
  stepSec: number;
}

interface PrometheusRangeResponse {
  status: string;
  data?: {
    resultType?: string;
    result?: Array<{ metric: Record<string, string>; values?: Array<[number, string]> }>;
  };
}

// Runs a PromQL range query and returns its matrix series. Throws on any
// non-2xx response or a response shape that is not a successful matrix.
// Non-finite samples (NaN, +/-Inf) are dropped; series left with no points are
// omitted. The timeout is a parameter because range queries over long windows
// read more data than the instant queries above.
export async function queryRange(
  promql: string,
  range: RangeParams,
  timeoutMs = 5000,
): Promise<PromSeries[]> {
  const res = await fetch(`${METRICS_ENV.PROMETHEUS_URL}/api/v1/query_range`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      query: promql,
      start: String(range.startSec),
      end: String(range.endSec),
      step: String(range.stepSec),
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    throw new Error(`Prometheus range query failed: HTTP ${res.status}`);
  }

  const json = (await res.json()) as PrometheusRangeResponse;
  if (json.status !== 'success' || json.data?.resultType !== 'matrix') {
    throw new Error(
      `Prometheus range query returned an unexpected response (status=${json.status}, resultType=${json.data?.resultType ?? 'none'})`,
    );
  }

  const series: PromSeries[] = [];
  for (const item of json.data.result ?? []) {
    const points: PromSeries['points'] = [];
    for (const sample of item.values ?? []) {
      const [ts, raw] = sample;
      const v = typeof raw === 'string' ? parseFloat(raw) : NaN;
      if (typeof ts === 'number' && Number.isFinite(ts) && Number.isFinite(v)) {
        points.push({ tMs: Math.round(ts * 1000), v });
      }
    }
    if (points.length > 0) {
      series.push({ metric: item.metric, points });
    }
  }
  return series;
}
