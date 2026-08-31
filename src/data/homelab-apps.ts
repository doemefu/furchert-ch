// Ported from the prototype (shared.jsx HOMELAB_APPS), corrected against the
// real cluster (issue #17): dropped tiles with no live deployment
// (Aemtlifyer, Longhorn), replaced ArgoCD with the real Flux CD GitOps
// controller, demoted Personal Agent to a static repo link, and fixed the
// IoT Platform URL. 'repo' is null when there is no public repo.
//
// `status` is the static default for tiles without a `workload` — for
// workload-backed tiles it is overwritten server-side in `DashboardShell`
// with the live Prometheus-derived status, so it defaults to 'unknown'
// rather than fabricating an 'online' value here.
export type AppStatus = 'online' | 'wip' | 'repo' | 'offline' | 'unknown';

export interface HomelabApp {
  name: string;
  desc: string;
  url: string;
  status: AppStatus;
  cat: string;
  repo: string | null;
  /** Present when the tile's status is derived from a live k8s Deployment. */
  workload?: { kind: 'deployment'; namespace: string; name: string };
}

export const HOMELAB_APPS: HomelabApp[] = [
  { name: 'IoT Platform',   desc: 'Device & sensor data management', url: 'https://device.furchert.ch',               status: 'unknown', cat: 'Apps',       repo: 'https://github.com/doemefu/homelab-device-service', workload: { kind: 'deployment', namespace: 'apps', name: 'device-service' } },
  { name: 'n8n',            desc: 'Workflow automation engine',      url: 'https://n8n.furchert.ch',                  status: 'unknown', cat: 'Automation', repo: 'https://github.com/doemefu/homelab-n8n', workload: { kind: 'deployment', namespace: 'apps', name: 'n8n' } },
  { name: 'Personal Agent', desc: 'AI assistant & task automation',  url: 'https://github.com/doemefu/personalAgent', status: 'repo',    cat: 'AI',         repo: 'https://github.com/doemefu/personalAgent' },
  { name: 'Grafana',        desc: 'Cluster & application metrics',   url: 'https://grafana.furchert.ch',              status: 'unknown', cat: 'Monitoring', repo: null, workload: { kind: 'deployment', namespace: 'monitoring', name: 'kube-prometheus-stack-grafana' } },
  { name: 'Flux CD',        desc: 'GitOps deployment management',    url: 'https://github.com/doemefu/homelab',       status: 'unknown', cat: 'Infra',      repo: null, workload: { kind: 'deployment', namespace: 'flux-system', name: 'kustomize-controller' } },
  { name: 'Auth Service',   desc: 'Identity & access management',    url: 'https://auth.furchert.ch',                 status: 'unknown', cat: 'Infra',      repo: 'https://github.com/doemefu/homelab-auth-service', workload: { kind: 'deployment', namespace: 'apps', name: 'auth-service' } },
  { name: 'Karaokee',       desc: 'SoPra FS26 — group karaoke app',  url: 'https://karaokee.furchert.ch',             status: 'wip',     cat: 'Apps',       repo: 'https://github.com/doemefu/very-cool-karaoke-client' },
  { name: 'Club Assist',    desc: 'RCRJ club management AI',         url: 'https://club.furchert.ch',                 status: 'unknown', cat: 'AI',         repo: null, workload: { kind: 'deployment', namespace: 'apps', name: 'open-webui' } },
  { name: 'Terra1',         desc: 'ESP32 microcontroller firmware',  url: 'https://github.com/doemefu/Terra1',        status: 'repo',    cat: 'IoT',        repo: 'https://github.com/doemefu/Terra1' },
];
