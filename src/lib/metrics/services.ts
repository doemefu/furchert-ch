import 'server-only';
// Server-only orchestration for the ADMIN-only `/dashboard/services` page
// (issue #47). `getServiceHealth()` runs five Prometheus queries in parallel
// and hands the results to the pure report builder in `serviceHealth.ts`.
// Like `cluster.ts`, a failed query group degrades honestly (`available`
// flags in the report; an empty group counts as failed while workloads exist);
// only a missing inventory degrades to `null`.
import { SERVICE_HEALTH_EXCLUDE, SERVICE_HEALTH_NAMESPACES } from '@/data/service-health';
import { shouldAttemptMetrics } from '@/metrics.env';
import { queryInstant, queryRange } from './prometheus';
import { buildHourGrid, buildServiceHealthReport, type ServiceHealthReport } from './serviceHealth';

// Pod name → workload name. Lazy, so a Deployment pod whose 5-char suffix is
// all digits still resolves to the Deployment, not to `<name>-<hash>`.
export const POD_RE = '^(.+?)(?:-[a-z0-9]{8,10}-[a-z0-9]{5}|-[0-9]+)$';

// Namespaces are DNS labels, so they need no regex escaping.
const NSM = `namespace=~"${SERVICE_HEALTH_NAMESPACES.join('|')}"`;

// Desired replicas decide which rows exist; desired = 0 is kept.
export const INVENTORY_QUERY = `label_replace(label_replace(
  max by (namespace, deployment) (kube_deployment_spec_replicas{${NSM}}),
  "workload", "$1", "deployment", "(.+)"), "kind", "Deployment", "", "")
or
label_replace(label_replace(
  max by (namespace, statefulset) (kube_statefulset_replicas{${NSM}}),
  "workload", "$1", "statefulset", "(.+)"), "kind", "StatefulSet", "", "")`;

// Hourly ratio of sample sums = time-weighted available share of desired
// replica-time. `> 0` drops hours with desired 0 all hour (no data, not down).
export const AVAILABILITY_QUERY = `label_replace(label_replace(
  clamp_max(
    sum by (namespace, deployment) (sum_over_time(kube_deployment_status_replicas_available{${NSM}}[1h]))
    /
    (sum by (namespace, deployment) (sum_over_time(kube_deployment_spec_replicas{${NSM}}[1h])) > 0),
  1),
  "workload", "$1", "deployment", "(.+)"), "kind", "Deployment", "", "")
or
label_replace(label_replace(
  clamp_max(
    sum by (namespace, statefulset) (sum_over_time(kube_statefulset_status_replicas_ready{${NSM}}[1h]))
    /
    (sum by (namespace, statefulset) (sum_over_time(kube_statefulset_replicas{${NSM}}[1h])) > 0),
  1),
  "workload", "$1", "statefulset", "(.+)"), "kind", "StatefulSet", "", "")`;

export const RESTARTS_QUERY = `sum by (namespace, workload) (
  label_replace(
    increase(kube_pod_container_status_restarts_total{${NSM}}[1h]),
    "workload", "$1", "pod", "${POD_RE}")
)`;

// Highest container per workload as a share of its limit; the request is the
// fallback basis only where a container has no limit (`basis` label says which).
function usageQuery(usage: string, resource: string, unit: string): string {
  const ratio = (kind: 'limits' | 'requests', basis: 'limit' | 'request') => `label_replace(
        ${usage}
        / on (namespace, pod, container)
        (max by (namespace, pod, container) (kube_pod_container_resource_${kind}{${NSM}, resource="${resource}", unit="${unit}"}) > 0),
        "basis", "${basis}", "", "")`;
  return `topk by (namespace, workload) (1,
  label_replace(
    (
      ${ratio('limits', 'limit')}
      or on (namespace, pod, container)
      ${ratio('requests', 'request')}
    ),
    "workload", "$1", "pod", "${POD_RE}")
)`;
}

export const CPU_QUERY = usageQuery(
  `max by (namespace, pod, container) (rate(container_cpu_usage_seconds_total{${NSM}, container!="", container!="POD"}[5m]))`,
  'cpu',
  'core',
);
export const MEM_QUERY = usageQuery(
  `max by (namespace, pod, container) (container_memory_working_set_bytes{${NSM}, container!="", container!="POD"})`,
  'memory',
  'byte',
);

// Terse, message-only log: no URL, no PromQL, no stack.
function unavailable(reason: string): null {
  console.warn(`[metrics] Prometheus unavailable: ${reason}`);
  return null;
}

// `name: message` of a rejection, nothing else (no `cause`, no stack). A URL
// inside the message (e.g. fetch's "Failed to parse URL from …") is redacted.
function reasonOf(err: unknown): string {
  if (typeof err !== 'object' || err === null) return 'unknown error';
  const { name, message } = err as { name?: unknown; message?: unknown };
  const text = `${typeof name === 'string' ? name : 'Error'}: ${typeof message === 'string' ? message : ''}`;
  return text.replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, '<url>').slice(0, 200);
}

export async function getServiceHealth(now: Date = new Date()): Promise<ServiceHealthReport | null> {
  if (!shouldAttemptMetrics()) return null;

  const grid = buildHourGrid(now.getTime());
  const settled = await Promise.allSettled([
    queryInstant(INVENTORY_QUERY),
    queryRange(AVAILABILITY_QUERY, grid.range),
    queryRange(RESTARTS_QUERY, grid.range),
    queryInstant(CPU_QUERY),
    queryInstant(MEM_QUERY),
  ]);
  const [inventoryRes, availabilityRes, restartsRes, cpuRes, memRes] = settled;

  // With a non-empty inventory, a fulfilled but empty group means the data is
  // missing (e.g. a scrape gap), not that everything is fine: it is reported
  // and passed on as failed, so the page shows a partial notice instead of
  // zero restarts (green) or silent "—" usage.
  const inventoryOk = inventoryRes.status === 'fulfilled' && inventoryRes.value.length > 0;
  const failures: string[] = [];
  function settle<T>(res: PromiseSettledResult<T[]>, label: string, emptyIsFailure: boolean): T[] | null {
    if (res.status === 'rejected') {
      failures.push(`${label} (${reasonOf(res.reason)})`);
      return null;
    }
    if (emptyIsFailure && res.value.length === 0) {
      failures.push(`${label} (empty result)`);
      return null;
    }
    return res.value;
  }
  const inventory = settle(inventoryRes, 'inventory', false);
  const availability = settle(availabilityRes, 'availability', inventoryOk);
  const restarts = settle(restartsRes, 'restarts', inventoryOk);
  const cpu = settle(cpuRes, 'cpu', inventoryOk);
  const mem = settle(memRes, 'mem', inventoryOk);

  if (settled.every((res) => res.status === 'rejected')) {
    return unavailable(`all service-health queries failed: ${failures.join(', ')}`);
  }
  if (failures.length > 0) console.warn(`[metrics] Prometheus queries failed: ${failures.join(', ')}`);

  if (inventory === null) return unavailable('service inventory query failed');
  // kube-state-metrics being down looks exactly like an empty inventory.
  if (inventory.length === 0) return unavailable('no workload series');

  return buildServiceHealthReport({
    grid,
    inventory,
    availability,
    restarts,
    cpu,
    mem,
    exclude: SERVICE_HEALTH_EXCLUDE,
  });
}
