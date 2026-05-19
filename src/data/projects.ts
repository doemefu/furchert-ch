// Ported verbatim from the prototype (pages.jsx PageProjects).
// Consumed by /projects + /projects/[slug] (Phase 2).
export type ProjectStatus = 'live' | 'wip' | 'planned';

export interface Project {
  slug: string;
  title: string;
  status: ProjectStatus;
  summary: string;
  tags: string[];
  github: string | null;
  icon: string;
  detail: string;
}

export const PROJECTS: Project[] = [
  {
    slug: 'iot-platform',
    title: 'IoT Platform — Terra1',
    status: 'live',
    summary:
      'End-to-end IoT-System: ESP32 Sensor-Node → MQTT → Spring Boot Microservices → React Frontend. OAuth 2.1 für Machine-to-Machine Auth.',
    tags: ['ESP32', 'Spring Boot', 'React', 'MQTT', 'OAuth 2.1', 'PostgreSQL', 'InfluxDB', 'Kubernetes'],
    github: 'https://github.com/doemefu/iotApp',
    icon: 'chip',
    detail:
      'Ein vollständiges IoT-System von der Firmware bis zum Cloud-Backend. Der ESP32 sendet Sensordaten via MQTT, ein Spring Boot Gateway verteilt sie an Microservices (Device Service, Data Service, Auth Service). Das React-Frontend visualisiert die Echtzeitdaten.',
  },
  {
    slug: 'homelab',
    title: 'Homelab Infrastructure as Code',
    status: 'wip',
    summary:
      '4-Node k3s Cluster (2× Raspberry Pi 4, 2× MacBook Air M1) via Ansible provisioniert. Longhorn Storage, Cloudflare Tunnel, SOPS/age Secrets.',
    tags: ['Ansible', 'k3s', 'Kubernetes', 'Cloudflare', 'Raspberry Pi', 'Longhorn', 'SOPS'],
    github: 'https://github.com/doemefu/homelab',
    icon: 'server',
    detail:
      'Infrastructure as Code für ein gemischtes Homelab. Alle 4 Nodes werden via Ansible konfiguriert und gehärtet. k3s als leichtgewichtiges Kubernetes, Longhorn für verteilten Block-Storage, Cloudflare Tunnel für sicheren Zugang ohne offene Ports.',
  },
  {
    slug: 'club-assist',
    title: 'RCRJ Club Assist',
    status: 'wip',
    summary:
      'AI-gestütztes Vereinsmanagement: Protokoll-Extraktion, Task-Tracking, Gmail-Drafts mit Approval-Dashboard. n8n, Claude API, Next.js.',
    tags: ['n8n', 'Claude API', 'Next.js', 'PostgreSQL', 'Google APIs'],
    github: null,
    icon: 'boat',
    detail:
      'n8n extrahiert Aufgaben aus Sitzungsprotokollen via Claude API, erstellt Tasks, verfolgt Status und generiert E-Mail-Entwürfe für den Präsidenten. Ein Next.js-Dashboard gibt Überblick über offene Pendenzen.',
  },
  {
    slug: 'karaokee',
    title: 'Karaokee — SoPra FS26',
    status: 'wip',
    summary:
      'Gruppen-Karaoke-App als SoPra-Semesterprojekt. Spring Boot 3 Backend, REST API First, OpenAPI-Spezifikation, React Client.',
    tags: ['Spring Boot 3', 'REST', 'OpenAPI', 'React', 'TypeScript'],
    github: 'https://github.com/doemefu/very-cool-karaoke-client',
    icon: 'mic',
    detail:
      'Semesterprojekt an der UZH: Eine Karaoke-App für Gruppen mit Song-Queue, Voting-System und Live-Session-Management. Backend-First-Entwicklung mit vollständiger OpenAPI-Dokumentation.',
  },
  {
    slug: 'auth-service',
    title: 'Homelab Auth Service',
    status: 'live',
    summary:
      'Identity & Access Management für das Homelab. JWT issuance, SSO für alle Subdomain-Apps via Cloudflare Access Integration.',
    tags: ['OAuth 2.1', 'JWT', 'Spring Boot', 'Cloudflare Access'],
    github: 'https://github.com/doemefu/homelab-auth-service',
    icon: 'lock',
    detail:
      'Zentraler Auth-Service für das Homelab. Gibt JWTs aus, validiert sie, und integriert mit Cloudflare Access für SSO über alle Subdomain-Apps. Ersatz für den deprecated Legacy-Auth-Service.',
  },
  {
    slug: 'aemtlifyer',
    title: 'Aemtlifyer',
    status: 'wip',
    summary:
      'Vereins-Rollen- und Aufgaben-Management. Wer hat welches Amt? Was ist offen? Digitalisierung der Vereinsstruktur des RCRJ.',
    tags: ['Next.js', 'PostgreSQL', 'TypeScript'],
    github: 'https://github.com/doemefu/aemtlifyer',
    icon: 'users',
    detail:
      'Vereinsspezifische App zur Verwaltung von Ämtern und Rollen im RCRJ. Ersetzt Excel-Listen und manuelle Nachverfolgung durch ein strukturiertes Dashboard.',
  },
];
