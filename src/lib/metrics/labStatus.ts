import 'server-only';
// Public homelab status (the live block on /projects/homelab). Server-only.
// For a fixed allowlist of public-facing workloads it asks Prometheus
// (kube-state-metrics) whether at least one pod is ready now ("up") and what
// share of the last 14 days that was true. The answer carries opaque ids and
// two numbers per service, nothing else: no namespaces, workload names, hosts,
// versions or error texts. Any failure degrades to "unknown", never to "down".
// Queries are constants (no input reaches PromQL). The result is cached
// in-process: status 60 s, uptime 15 min, last good value served for a while
// if a refresh fails, and one load at a time, so request volume never reaches
// Prometheus.
import { LAB_SERVICE_IDS, LAB_UPTIME_WINDOW_DAYS, SHOW_UPTIME, type LabServiceId } from '@/data/homelab-lab';
import { shouldAttemptMetrics } from '@/metrics.env';
import { queryInstant, type PromSample } from './prometheus';

export type LabStatusValue = 'up' | 'down' | 'unknown';

export interface LabServiceStatus {
  id: LabServiceId;
  status: LabStatusValue;
  /** Percent over the window, one decimal, floored. Absent when uptime is switched off. */
  uptime?: number | null;
}

export interface LabStatusResponse {
  windowDays: number;
  services: LabServiceStatus[];
}

// id -> workload. Server-side only; never serialised.
export const LAB_WORKLOADS: ReadonlyArray<{ id: LabServiceId; namespace: string; deployment: string }> = [
  { id: 'website', namespace: 'apps', deployment: 'furchert-ch' },
  { id: 'identity', namespace: 'apps', deployment: 'auth-service' },
  { id: 'iot', namespace: 'apps', deployment: 'device-service' },
  { id: 'automation', namespace: 'apps', deployment: 'n8n' },
  { id: 'assistant', namespace: 'apps', deployment: 'open-webui' },
  { id: 'monitoring', namespace: 'monitoring', deployment: 'kube-prometheus-stack-grafana' },
];

const NAMESPACES = [...new Set(LAB_WORKLOADS.map((w) => w.namespace))].join('|');
const DEPLOYMENTS = LAB_WORKLOADS.map((w) => w.deployment).join('|');
const SEL = `{namespace=~"${NAMESPACES}", deployment=~"${DEPLOYMENTS}"}`;

// `max by` drops the scrape-target labels (pod, instance, job): a
// kube-state-metrics restart would otherwise split a workload into several
// partial series.
const AVAILABLE = `max by (namespace, deployment) (kube_deployment_status_replicas_available${SEL})`;
const SPEC = `max by (namespace, deployment) (kube_deployment_spec_replicas${SEL})`;

export const AVAILABLE_QUERY = AVAILABLE;
export const SPEC_QUERY = SPEC;

// 1 while at least one pod is ready, 0 while none is; only evaluated while the
// workload is meant to run (desired > 0), so a workload scaled to zero is "no
// data", not downtime.
const UP_EXPR = `(${AVAILABLE} >= bool 1) and on (namespace, deployment) (${SPEC} > 0)`;
const WINDOW = `${LAB_UPTIME_WINDOW_DAYS}d:5m`;
export const UPTIME_QUERY = `avg_over_time((${UP_EXPR})[${WINDOW}])`;
export const COVERAGE_QUERY = `count_over_time((${UP_EXPR})[${WINDOW}])`;

// Samples a full window holds at the 5 minute subquery step.
export const EXPECTED_SAMPLES = (LAB_UPTIME_WINDOW_DAYS * 24 * 60) / 5;
// Below this share of the window the uptime is not shown (new or long-paused workload).
const MIN_COVERAGE = 0.9;

const STATUS_TTL_MS = 60_000;
const STATUS_RETRY_MS = 15_000;
const STATUS_MAX_STALE_MS = 5 * 60_000;
const UPTIME_TTL_MS = 15 * 60_000;
const UPTIME_RETRY_MS = 5 * 60_000;
const UPTIME_MAX_STALE_MS = 60 * 60_000;
const UPTIME_TIMEOUT_MS = 4000;

// Finite value of the sample that matches this exact workload (the regex in
// the queries is only a pre-filter), the largest one if there are several.
function pick(samples: PromSample[], namespace: string, deployment: string): number | undefined {
  let best: number | undefined;
  for (const s of samples) {
    if (s.metric.namespace !== namespace || s.metric.deployment !== deployment) continue;
    if (!Number.isFinite(s.value)) continue;
    if (best === undefined || s.value > best) best = s.value;
  }
  return best;
}

export function buildStatusRows(available: PromSample[], spec: PromSample[]): Map<LabServiceId, LabStatusValue> {
  const rows = new Map<LabServiceId, LabStatusValue>();
  for (const w of LAB_WORKLOADS) {
    const desired = pick(spec, w.namespace, w.deployment);
    const ready = pick(available, w.namespace, w.deployment);
    if (desired === undefined || !(desired > 0) || ready === undefined) {
      rows.set(w.id, 'unknown');
    } else {
      rows.set(w.id, ready >= 1 ? 'up' : 'down');
    }
  }
  return rows;
}

export function buildUptimeRows(avg: PromSample[], count: PromSample[]): Map<LabServiceId, number | null> {
  const rows = new Map<LabServiceId, number | null>();
  for (const w of LAB_WORKLOADS) {
    const ratio = pick(avg, w.namespace, w.deployment);
    const samples = pick(count, w.namespace, w.deployment);
    if (ratio === undefined || samples === undefined || samples / EXPECTED_SAMPLES < MIN_COVERAGE) {
      rows.set(w.id, null);
      continue;
    }
    const clamped = Math.min(1, Math.max(0, ratio));
    // Floor, never round up: 99.97 % is shown as 99.9, only a perfect window as 100.
    rows.set(w.id, Math.floor(clamped * 1000 + 1e-9) / 10);
  }
  return rows;
}

export interface Cache<T> {
  get(): Promise<T | null>;
}

// TTL cache with one load at a time. A failed refresh serves the last good
// value for up to `maxStaleMs` and is not retried sooner than `retryMs`.
export function createCache<T>(opts: {
  ttlMs: number;
  retryMs: number;
  maxStaleMs: number;
  load: () => Promise<T>;
  now: () => number;
  onError: (err: unknown) => void;
}): Cache<T> {
  let value: T | undefined;
  let at = -Infinity;
  let failedAt = -Infinity;
  let inflight: Promise<T | null> | null = null;
  const usable = (): T | null => (value !== undefined && opts.now() - at <= opts.maxStaleMs ? value : null);
  return {
    get() {
      const t = opts.now();
      if (value !== undefined && t - at < opts.ttlMs) return Promise.resolve(value);
      if (inflight) return inflight;
      if (t - failedAt < opts.retryMs) return Promise.resolve(usable());
      inflight = opts
        .load()
        .then(
          (v) => {
            value = v;
            at = opts.now();
            return v as T | null;
          },
          (err: unknown) => {
            failedAt = opts.now();
            opts.onError(err);
            return usable();
          },
        )
        .finally(() => {
          inflight = null;
        });
      return inflight;
    },
  };
}

// `name: message` only, URLs redacted, no cause or stack.
function reasonOf(err: unknown): string {
  if (typeof err !== 'object' || err === null) return 'unknown error';
  const { name, message } = err as { name?: unknown; message?: unknown };
  const text = `${typeof name === 'string' ? name : 'Error'}: ${typeof message === 'string' ? message : ''}`;
  return text.replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, '<url>').slice(0, 200);
}

export interface LabStatusDeps {
  query: (promql: string, timeoutMs?: number) => Promise<PromSample[]>;
  now: () => number;
  metricsEnabled: () => boolean;
  showUptime: boolean;
  log: (message: string) => void;
}

export function createLabStatusProvider(deps: LabStatusDeps): { get(): Promise<LabStatusResponse> } {
  const onError = (what: string) => (err: unknown) => deps.log(`[lab-status] ${what} unavailable: ${reasonOf(err)}`);

  const statusCache = createCache<Map<LabServiceId, LabStatusValue>>({
    ttlMs: STATUS_TTL_MS,
    retryMs: STATUS_RETRY_MS,
    maxStaleMs: STATUS_MAX_STALE_MS,
    now: deps.now,
    onError: onError('status'),
    load: async () => {
      const [available, spec] = await Promise.all([deps.query(AVAILABLE_QUERY), deps.query(SPEC_QUERY)]);
      // kube-state-metrics being down looks like an empty result: unknown, not down.
      if (available.length === 0 || spec.length === 0) throw new Error('empty result');
      return buildStatusRows(available, spec);
    },
  });

  const uptimeCache = createCache<Map<LabServiceId, number | null>>({
    ttlMs: UPTIME_TTL_MS,
    retryMs: UPTIME_RETRY_MS,
    maxStaleMs: UPTIME_MAX_STALE_MS,
    now: deps.now,
    onError: onError('uptime'),
    load: async () => {
      const [avg, count] = await Promise.all([
        deps.query(UPTIME_QUERY, UPTIME_TIMEOUT_MS),
        deps.query(COVERAGE_QUERY, UPTIME_TIMEOUT_MS),
      ]);
      if (avg.length === 0 || count.length === 0) throw new Error('empty result');
      return buildUptimeRows(avg, count);
    },
  });

  return {
    async get() {
      if (!deps.metricsEnabled()) {
        return {
          windowDays: LAB_UPTIME_WINDOW_DAYS,
          services: LAB_SERVICE_IDS.map((id) => ({
            id,
            status: 'unknown' as const,
            ...(deps.showUptime ? { uptime: null } : {}),
          })),
        };
      }
      const [status, uptime] = await Promise.all([
        statusCache.get(),
        deps.showUptime ? uptimeCache.get() : Promise.resolve(null),
      ]);
      return {
        windowDays: LAB_UPTIME_WINDOW_DAYS,
        services: LAB_SERVICE_IDS.map((id) => ({
          id,
          status: status?.get(id) ?? ('unknown' as const),
          ...(deps.showUptime ? { uptime: uptime?.get(id) ?? null } : {}),
        })),
      };
    },
  };
}

// All services unknown, for a failure outside the provider (it handles its own).
export function unknownStatus(): LabStatusResponse {
  return {
    windowDays: LAB_UPTIME_WINDOW_DAYS,
    services: LAB_SERVICE_IDS.map((id) => ({
      id,
      status: 'unknown' as const,
      ...(SHOW_UPTIME ? { uptime: null } : {}),
    })),
  };
}

const provider = createLabStatusProvider({
  query: queryInstant,
  now: Date.now,
  metricsEnabled: shouldAttemptMetrics,
  showUptime: SHOW_UPTIME,
  log: (message) => console.warn(message),
});

export const getLabStatus = (): Promise<LabStatusResponse> => provider.get();
