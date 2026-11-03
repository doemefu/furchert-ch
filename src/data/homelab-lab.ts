// Content for the public homelab section on /projects/homelab: the live-status
// rows and the static showcase. Public by design: no versions, hostnames,
// IPs, ports, node names or third-party product names in the status rows.
// The workload each row is measured from lives server-side only, in
// `lib/metrics/labStatus.ts`; the browser only ever sees these opaque ids.
import type { Locale } from '@/i18n/routing';

// Only services with a public hostname. Internal workloads (data collection,
// GitOps controllers, databases) are deliberately not listed: their status
// would tell an attacker when monitoring or patching is down.
export const LAB_SERVICE_IDS = [
  'website',
  'identity',
  'iot',
  'automation',
  'assistant',
  'monitoring',
] as const;
export type LabServiceId = (typeof LAB_SERVICE_IDS)[number];

// Switch to false to show up/down only (no uptime is queried or returned).
export const SHOW_UPTIME = true;
export const LAB_UPTIME_WINDOW_DAYS = 14;

// Date of the last change to the static showcase text. Shown on the page and
// used as `dateModified` in the JSON-LD. Update it when the copy changes.
export const LAB_CONTENT_UPDATED = '2026-11-03';

export const LAB_SERVICES: Record<LabServiceId, Record<Locale, { label: string; desc: string }>> = {
  website: {
    de: { label: 'Diese Website', desc: 'Öffentliche Seite und geschütztes Dashboard' },
    en: { label: 'This website', desc: 'Public site and protected dashboard' },
  },
  identity: {
    de: { label: 'Login-Dienst', desc: 'Eigener OIDC-Identity-Provider' },
    en: { label: 'Login service', desc: 'Own OIDC identity provider' },
  },
  iot: {
    de: { label: 'IoT-Plattform', desc: 'Terrarium-Steuerung, Messwerte und Live-Ansicht' },
    en: { label: 'IoT platform', desc: 'Terrarium control, readings and live view' },
  },
  automation: {
    de: { label: 'Workflow-Automation', desc: 'Automatisierte Abläufe' },
    en: { label: 'Workflow automation', desc: 'Automated workflows' },
  },
  assistant: {
    de: { label: 'KI-Chat-Assistent', desc: 'Chat-Oberfläche für einen Verein' },
    en: { label: 'AI chat assistant', desc: 'Chat interface for a club' },
  },
  monitoring: {
    de: { label: 'Metriken-Dashboards', desc: 'Messwerte und Alarme des Clusters' },
    en: { label: 'Metrics dashboards', desc: 'Cluster metrics and alerts' },
  },
};

export interface LabShowcaseItem {
  id: string;
  icon: string;
  i18n: Record<Locale, { title: string; text: string }>;
  /** Public repositories only. */
  repos: ReadonlyArray<{ label: string; href: string }>;
}

const GH = 'https://github.com/doemefu';

export const LAB_SHOWCASE: ReadonlyArray<LabShowcaseItem> = [
  {
    id: 'cluster',
    icon: 'server',
    i18n: {
      de: {
        title: 'Cluster und GitOps',
        text: '4 Rechner (2 Raspberry Pi, 2 MacBook Air) bilden einen k3s-Cluster. Ansible richtet sie ein, und was im Git-Repository steht, rollt Flux automatisch aus.',
      },
      en: {
        title: 'Cluster and GitOps',
        text: '4 machines (2 Raspberry Pis, 2 MacBook Airs) form a k3s cluster. Ansible sets them up, and whatever is in the Git repository is rolled out automatically by Flux.',
      },
    },
    repos: [{ label: 'homelab', href: `${GH}/homelab` }],
  },
  {
    id: 'identity',
    icon: 'lock',
    i18n: {
      de: {
        title: 'Eigener Login-Dienst',
        text: 'Ein selbst gebauter OIDC-Login-Dienst. Wer sich im geschützten Dashboard dieser Website anmeldet, wird dort geprüft; die anderen Dienste vertrauen denselben Tokens.',
      },
      en: {
        title: 'Own login service',
        text: 'A self-built OIDC login service. Anyone signing in to the protected dashboard of this website is checked there; the other services trust the same tokens.',
      },
    },
    repos: [{ label: 'homelab-auth-service', href: `${GH}/homelab-auth-service` }],
  },
  {
    id: 'iot',
    icon: 'chip',
    i18n: {
      de: {
        title: 'IoT: Terrarium-Steuerung',
        text: 'Ein ESP32 steuert ein Terrarium. Die Messwerte laufen per MQTT in eine Zeitreihen-Datenbank und live ins Dashboard.',
      },
      en: {
        title: 'IoT: terrarium control',
        text: 'An ESP32 controls a terrarium. The readings flow via MQTT into a time-series database and live into the dashboard.',
      },
    },
    repos: [
      { label: 'homelab-device-service', href: `${GH}/homelab-device-service` },
      { label: 'Terra1', href: `${GH}/Terra1` },
    ],
  },
  {
    id: 'network',
    icon: 'chart',
    i18n: {
      de: {
        title: 'Netzwerk-Monitoring',
        text: 'Der Netzwerkverkehr des Homelabs wird gesammelt und ausgewertet. Die Ergebnisse erscheinen im geschützten Dashboard.',
      },
      en: {
        title: 'Network monitoring',
        text: 'The homelab’s network traffic is collected and analysed. The results appear in the protected dashboard.',
      },
    },
    repos: [{ label: 'homelab-data-service', href: `${GH}/homelab-data-service` }],
  },
  {
    id: 'ai',
    icon: 'ai',
    i18n: {
      de: {
        title: 'KI und Automation',
        text: 'Workflow-Automation und ein KI-Chat-Assistent für einen Verein laufen im eigenen Cluster.',
      },
      en: {
        title: 'AI and automation',
        text: 'Workflow automation and an AI chat assistant for a club run in the own cluster.',
      },
    },
    repos: [],
  },
  {
    id: 'site',
    icon: 'globe',
    i18n: {
      de: {
        title: 'Diese Website',
        text: 'Auch furchert.ch läuft im Cluster, hinter einem Cloudflare Tunnel und ohne offene Ports.',
      },
      en: {
        title: 'This website',
        text: 'furchert.ch itself runs in the cluster as well, behind a Cloudflare Tunnel and with no open ports.',
      },
    },
    repos: [{ label: 'furchert-ch', href: `${GH}/furchert-ch` }],
  },
];
