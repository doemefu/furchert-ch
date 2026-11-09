// Ported from the prototype (pages.jsx PageProjects).
// Consumed by /projects + /projects/[slug] (Phase 2).
// DE/EN copy corrected in #160 (no longer prototype verbatim); per-record locale map.
import type { Locale } from '@/i18n/routing';

export type ProjectStatus = 'live' | 'wip' | 'planned' | 'done';

export interface Project {
  slug: string;
  title: string; // proper product name — locale-invariant
  status: ProjectStatus;
  tags: string[]; // locale-invariant
  github: string | null;
  icon: string;
  i18n: Record<Locale, { summary: string; detail: string }>;
}

export const PROJECTS: Project[] = [
  {
    slug: 'iot-platform',
    title: 'IoT Platform: Terra1',
    status: 'live',
    tags: ['ESP32', 'C++', 'MQTT', 'Spring Boot', 'InfluxDB', 'PostgreSQL', 'WebSocket', 'Next.js', 'Kubernetes'],
    github: 'https://github.com/doemefu/homelab-device-service',
    icon: 'chip',
    i18n: {
      de: {
        summary:
          'Vom Sensor bis zum Dashboard: ESP32-Firmware in C++ → MQTT → device-service (Spring Boot, InfluxDB, WebSocket) → Next.js-Dashboard.',
        detail:
          'Ein IoT-System von der Firmware bis zum Dashboard. Der ESP32 im Terrarium sendet Temperatur und Luftfeuchtigkeit per MQTT. Der device-service speichert die Messwerte in InfluxDB, schaltet Licht und Regen nach Zeitplan und meldet Zustände per WebSocket. Ein Admin-Dashboard auf furchert.ch zeigt sie live und erlaubt die Steuerung.',
      },
      en: {
        summary:
          'From sensor to dashboard: ESP32 firmware in C++ → MQTT → device-service (Spring Boot, InfluxDB, WebSocket) → Next.js dashboard.',
        detail:
          'An IoT system from firmware to dashboard. The ESP32 in the terrarium sends temperature and humidity via MQTT. The device-service stores the readings in InfluxDB, switches light and rain on a schedule and reports states over WebSocket. An admin dashboard on furchert.ch shows them live and allows control.',
      },
    },
  },
  {
    slug: 'homelab',
    title: 'Homelab Infrastructure as Code',
    status: 'live',
    tags: ['Ansible', 'k3s', 'Kubernetes', 'Cloudflare', 'Raspberry Pi', 'Longhorn', 'SOPS'],
    github: 'https://github.com/doemefu/homelab',
    icon: 'server',
    i18n: {
      de: {
        summary:
          '4-Node k3s Cluster (2× Raspberry Pi, 2× MacBook Air) via Ansible provisioniert. Longhorn Storage, Cloudflare Tunnel, SOPS/age Secrets.',
        detail:
          'Infrastructure as Code für ein gemischtes Homelab. Alle 4 Nodes werden via Ansible konfiguriert und gehärtet. k3s als leichtgewichtiges Kubernetes, Longhorn für verteilten Block-Storage, Cloudflare Tunnel für sicheren Zugang ohne offene Ports.',
      },
      en: {
        summary:
          '4-node k3s cluster (2× Raspberry Pi, 2× MacBook Air) provisioned via Ansible. Longhorn storage, Cloudflare Tunnel, SOPS/age secrets.',
        detail:
          'Infrastructure as Code for a mixed homelab. All 4 nodes are configured and hardened via Ansible. k3s as lightweight Kubernetes, Longhorn for distributed block storage, Cloudflare Tunnel for secure access without open ports.',
      },
    },
  },
  {
    slug: 'club-assist',
    title: 'RCRJ Club Assist',
    status: 'wip',
    tags: ['Open WebUI', 'LiteLLM', 'n8n', 'PostgreSQL', 'pgvector'],
    github: null,
    icon: 'boat',
    i18n: {
      de: {
        summary:
          'KI-Assistent für die Vereinsführung: entwirft Texte im Ton des Clubs, stellt Traktanden aus Mail, Drive und Kalender zusammen und zieht Pendenzen aus Protokollen.',
        detail:
          'Läuft auf dem eigenen Cluster: Open WebUI als Oberfläche, LiteLLM als Modell-Gateway, n8n für die Abläufe, PostgreSQL mit pgvector als Gedächtnis. Was sich nicht rückgängig machen lässt, etwa ein Versand, gibt ein Mensch frei.',
      },
      en: {
        summary:
          'AI assistant for club leadership: drafts texts in the club\'s tone, assembles agendas from mail, Drive and calendar, and pulls open items from minutes.',
        detail:
          'Runs on my own cluster: Open WebUI as the interface, LiteLLM as the model gateway, n8n for the workflows, PostgreSQL with pgvector as memory. Anything that cannot be undone, such as sending a message, is released by a human.',
      },
    },
  },
  {
    slug: 'karaokee',
    title: 'Karaokee (SoPra FS26)',
    status: 'done',
    tags: ['Spring Boot 4', 'REST', 'OpenAPI', 'React', 'TypeScript'],
    github: 'https://github.com/doemefu/very-cool-karaoke-client',
    icon: 'mic',
    i18n: {
      de: {
        summary:
          'Gruppen-Karaoke-App als SoPra-Semesterprojekt. Spring Boot 4 Backend, REST API First, OpenAPI-Spezifikation, React Client.',
        detail:
          'Semesterprojekt an der UZH: Eine Karaoke-App für Gruppen mit Song-Queue, Voting-System und Live-Session-Management. Backend-First-Entwicklung mit vollständiger OpenAPI-Dokumentation.',
      },
      en: {
        summary:
          'Group karaoke app as a SoPra semester project. Spring Boot 4 backend, REST API first, OpenAPI specification, React client.',
        detail:
          'Semester project at UZH: a karaoke app for groups with a song queue, voting system and live session management. Backend-first development with full OpenAPI documentation.',
      },
    },
  },
  {
    slug: 'auth-service',
    title: 'Homelab Auth Service',
    status: 'live',
    tags: ['OIDC', 'OAuth 2.1', 'Spring Authorization Server', 'JWT'],
    github: 'https://github.com/doemefu/homelab-auth-service',
    icon: 'lock',
    i18n: {
      de: {
        summary:
          'Eigener OIDC-Anbieter für das Homelab: Login mit Authorization Code und PKCE, signierte Tokens, JWKS für alle Dienste.',
        detail:
          'Spring Authorization Server auf auth.furchert.ch. Das Dashboard dieser Website meldet sich per OIDC an, die Dienste prüfen die Tokens offline über JWKS, und Maschinen holen sich Tokens per Client Credentials.',
      },
      en: {
        summary:
          'Own OIDC provider for the homelab: login with authorization code and PKCE, signed tokens, JWKS for all services.',
        detail:
          'Spring Authorization Server on auth.furchert.ch. The dashboard of this website signs in via OIDC, the services verify tokens offline via JWKS, and machines obtain tokens through client credentials.',
      },
    },
  },
];

// Status pill — colours invariant (prototype statusColor); labels per locale
// (translated in #160, no longer the prototype's identical terms).
// Ink tokens, not dot colours: the colour is also the pill text (#151).
export const STATUS_COLOR: Record<ProjectStatus, string> = {
  live: 'var(--status-online-ink)',
  wip: 'var(--status-wip-ink)',
  planned: 'var(--n-60)',
  done: 'var(--n-60)',
};

// Labels are translated per locale (#160); the locale dimension keeps one
// place to change them without touching call sites.
export const STATUS_LABEL: Record<Locale, Record<ProjectStatus, string>> = {
  de: { live: 'Live', wip: 'In Arbeit', planned: 'Geplant', done: 'Abgeschlossen' },
  en: { live: 'Live', wip: 'In progress', planned: 'Planned', done: 'Completed' },
};
