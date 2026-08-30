// Real cluster node hardware/role facts. These don't change at runtime, so
// they stay static config here rather than being queried from Prometheus.
// Consumed by `lib/metrics/cluster.ts`, which unions this map with live
// per-node CPU/MEM/ready state fetched at render time (issue #17), and by
// `DashboardShell` as the fallback node list when Prometheus is unavailable.
export interface NodeHardware {
  type: string;
  role: 'control-plane' | 'worker';
}

export const NODE_HARDWARE: Record<string, NodeHardware> = {
  raspi5: { type: 'Raspberry Pi 5', role: 'control-plane' },
  raspi4: { type: 'Raspberry Pi 4', role: 'worker' },
  mba1: { type: 'MacBook Air 2020', role: 'worker' },
  mba2: { type: 'MacBook Air 2019', role: 'worker' },
};
