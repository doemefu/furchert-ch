// Ported verbatim from the prototype (shared.jsx HOMELAB_APPS).
// Consumed by the dashboard (Phase 5). 'repo' is null when there is no public repo.
export type AppStatus = 'online' | 'wip' | 'repo';

export interface HomelabApp {
  name: string;
  desc: string;
  url: string;
  status: AppStatus;
  cat: string;
  repo: string | null;
}

export const HOMELAB_APPS: HomelabApp[] = [
  { name: 'IoT Platform',   desc: 'Device & sensor data management',  url: 'https://iot.furchert.ch',        status: 'online', cat: 'Apps',       repo: 'https://github.com/doemefu/homelab-device-service' },
  { name: 'n8n',            desc: 'Workflow automation engine',       url: 'https://n8n.furchert.ch',        status: 'online', cat: 'Automation', repo: 'https://github.com/doemefu/homelab-n8n' },
  { name: 'Aemtlifyer',     desc: 'Club roles & task management',     url: 'https://aemtlifyer.furchert.ch', status: 'online', cat: 'Apps',       repo: 'https://github.com/doemefu/aemtlifyer' },
  { name: 'Personal Agent', desc: 'AI assistant & task automation',   url: 'https://agent.furchert.ch',      status: 'online', cat: 'AI',         repo: 'https://github.com/doemefu/personalAgent' },
  { name: 'Grafana',        desc: 'Cluster & application metrics',    url: 'https://grafana.furchert.ch',    status: 'online', cat: 'Monitoring', repo: null },
  { name: 'ArgoCD',         desc: 'GitOps deployment management',     url: 'https://argocd.furchert.ch',     status: 'online', cat: 'Infra',      repo: null },
  { name: 'Longhorn',       desc: 'Distributed block storage UI',     url: 'https://longhorn.furchert.ch',   status: 'online', cat: 'Infra',      repo: null },
  { name: 'Auth Service',   desc: 'Identity & access management',     url: 'https://auth.furchert.ch',       status: 'online', cat: 'Infra',      repo: 'https://github.com/doemefu/homelab-auth-service' },
  { name: 'Karaokee',       desc: 'SoPra FS26 — group karaoke app',   url: 'https://karaokee.furchert.ch',   status: 'wip',    cat: 'Apps',       repo: 'https://github.com/doemefu/very-cool-karaoke-client' },
  { name: 'Club Assist',    desc: 'RCRJ club management AI',          url: 'https://club.furchert.ch',       status: 'wip',    cat: 'AI',         repo: null },
  { name: 'Terra1',         desc: 'ESP32 microcontroller firmware',   url: 'https://github.com/doemefu/Terra1', status: 'repo', cat: 'IoT',       repo: 'https://github.com/doemefu/Terra1' },
];
