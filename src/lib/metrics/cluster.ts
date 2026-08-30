// Server-only live cluster metrics for the dashboard (issue #17).
// `getLiveCluster()` runs the node + workload instant queries against
// Prometheus and merges them into a `LiveCluster`. Any failure — Prometheus
// unreachable, an empty result union, a malformed response — degrades to
// `null`; `DashboardShell` then renders the known node hardware with honest
// "—" placeholders instead of fabricating data. A single failed query does
// not fail the whole result: `Promise.allSettled` lets the others through.
import { NODE_HARDWARE } from '@/data/cluster-nodes';
import { shouldAttemptMetrics } from '@/metrics.env';
import { queryInstant } from './prometheus';

export interface LiveNode {
  name: string;
  type: string;
  role: 'control-plane' | 'worker';
  status: 'online' | 'offline' | 'unknown';
  cpuPct?: number;
  memPct?: number;
}

export interface LiveCluster {
  nodes: LiveNode[];
  /** Keyed `${kind}/${namespace}/${name}` → available replica count. */
  workloads: Record<string, number>;
}

// nodename carries the human-readable node name (node_uname_info joined in
// via `on(instance) group_left(nodename)`); the ready query keys by `node`.
const CPU_QUERY =
  '(100 * (1 - avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])))) * on(instance) group_left(nodename) node_uname_info';
const MEM_QUERY =
  '(100 * (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * on(instance) group_left(nodename) node_uname_info';
const READY_QUERY = 'kube_node_status_condition{condition="Ready",status="true"}';
const WORKLOADS_QUERY = 'kube_deployment_status_replicas_available{namespace=~"apps|monitoring|flux-system"}';

function clampPct(value: number): number {
  return Math.min(100, Math.max(0, value));
}

// Terse, message-only log — never a stack, never more than a short reason.
// The Prometheus URL is not a secret, but there is no need to log it either.
function unavailable(reason: string): null {
  console.warn(`[metrics] Prometheus unavailable: ${reason}`);
  return null;
}

export async function getLiveCluster(): Promise<LiveCluster | null> {
  if (!shouldAttemptMetrics()) return null;

  const [cpuRes, memRes, readyRes, workloadsRes] = await Promise.allSettled([
    queryInstant(CPU_QUERY),
    queryInstant(MEM_QUERY),
    queryInstant(READY_QUERY),
    queryInstant(WORKLOADS_QUERY),
  ]);

  if (
    cpuRes.status === 'rejected' &&
    memRes.status === 'rejected' &&
    readyRes.status === 'rejected' &&
    workloadsRes.status === 'rejected'
  ) {
    return unavailable('all queries failed');
  }

  const cpuByNode = new Map<string, number>();
  if (cpuRes.status === 'fulfilled') {
    for (const s of cpuRes.value) {
      const name = s.metric.nodename;
      if (name) cpuByNode.set(name, clampPct(s.value));
    }
  }

  const memByNode = new Map<string, number>();
  if (memRes.status === 'fulfilled') {
    for (const s of memRes.value) {
      const name = s.metric.nodename;
      if (name) memByNode.set(name, clampPct(s.value));
    }
  }

  // Value 1 = Ready, value 0 = NotReady — the series always carries a
  // sample either way, so presence alone must not be read as "Ready".
  const readyByNode = new Map<string, number>();
  if (readyRes.status === 'fulfilled') {
    for (const s of readyRes.value) {
      const name = s.metric.node;
      if (name) readyByNode.set(name, s.value);
    }
  }

  const nodeNames = new Set<string>([...cpuByNode.keys(), ...memByNode.keys(), ...readyByNode.keys()]);
  if (nodeNames.size === 0) {
    return unavailable('no node samples in the query results');
  }

  const sortedNames = [...nodeNames].sort((a, b) => {
    const aControlPlane = NODE_HARDWARE[a]?.role === 'control-plane';
    const bControlPlane = NODE_HARDWARE[b]?.role === 'control-plane';
    if (aControlPlane !== bControlPlane) return aControlPlane ? -1 : 1;
    return a.localeCompare(b);
  });

  const nodes: LiveNode[] = sortedNames.map((name) => {
    const hardware = NODE_HARDWARE[name] ?? { type: 'Node', role: 'worker' as const };
    const ready = readyByNode.get(name);
    const status: LiveNode['status'] = ready === undefined ? 'unknown' : ready === 1 ? 'online' : 'offline';
    return {
      name,
      type: hardware.type,
      role: hardware.role,
      status,
      cpuPct: cpuByNode.get(name),
      memPct: memByNode.get(name),
    };
  });

  const workloads: Record<string, number> = {};
  if (workloadsRes.status === 'fulfilled') {
    for (const s of workloadsRes.value) {
      const { namespace, deployment } = s.metric;
      if (namespace && deployment) {
        workloads[`deployment/${namespace}/${deployment}`] = s.value;
      }
    }
  }

  return { nodes, workloads };
}
