// Ported verbatim from the prototype (shared.jsx CLUSTER_NODES).
// Static for V1; live metrics are deferred (see OVERVIEW.md).
export interface ClusterNode {
  name: string;
  type: string;
  role: 'control-plane' | 'worker';
  status: 'Ready' | 'NotReady';
  cpu: string;
  mem: string;
}

export const CLUSTER_NODES: ClusterNode[] = [
  { name: 'rpi-01', type: 'Raspberry Pi 4', role: 'control-plane', status: 'Ready', cpu: '12%', mem: '34%' },
  { name: 'rpi-02', type: 'Raspberry Pi 4', role: 'worker', status: 'Ready', cpu: '8%', mem: '28%' },
  { name: 'mba-01', type: 'MacBook Air M1', role: 'worker', status: 'Ready', cpu: '6%', mem: '41%' },
  { name: 'mba-02', type: 'MacBook Air M1', role: 'worker', status: 'Ready', cpu: '9%', mem: '37%' },
];
