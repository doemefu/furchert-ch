// Ported from the prototype (pages.jsx PageProjects).
// Consumed by /projects + /projects/[slug] (Phase 2).
// DE = prototype verbatim; EN = faithful translation (per-record locale map).
import type { Locale } from '@/i18n/routing';

export type ProjectStatus = 'live' | 'wip' | 'planned';

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
    title: 'IoT Platform — Terra1',
    status: 'live',
    tags: ['ESP32', 'Spring Boot', 'React', 'MQTT', 'OAuth 2.1', 'PostgreSQL', 'InfluxDB', 'Kubernetes'],
    github: 'https://github.com/doemefu/iotApp',
    icon: 'chip',
    i18n: {
      de: {
        summary:
          'End-to-end IoT-System: ESP32 Sensor-Node → MQTT → Spring Boot Microservices → React Frontend. OAuth 2.1 für Machine-to-Machine Auth.',
        detail:
          'Ein vollständiges IoT-System von der Firmware bis zum Cloud-Backend. Der ESP32 sendet Sensordaten via MQTT, ein Spring Boot Gateway verteilt sie an Microservices (Device Service, Data Service, Auth Service). Das React-Frontend visualisiert die Echtzeitdaten.',
      },
      en: {
        summary:
          'End-to-end IoT system: ESP32 sensor node → MQTT → Spring Boot microservices → React frontend. OAuth 2.1 for machine-to-machine auth.',
        detail:
          'A complete IoT system from firmware to cloud backend. The ESP32 sends sensor data via MQTT; a Spring Boot gateway distributes it to microservices (Device Service, Data Service, Auth Service). The React frontend visualises the real-time data.',
      },
    },
  },
  {
    slug: 'homelab',
    title: 'Homelab Infrastructure as Code',
    status: 'wip',
    tags: ['Ansible', 'k3s', 'Kubernetes', 'Cloudflare', 'Raspberry Pi', 'Longhorn', 'SOPS'],
    github: 'https://github.com/doemefu/homelab',
    icon: 'server',
    i18n: {
      de: {
        summary:
          '4-Node k3s Cluster (2× Raspberry Pi 4, 2× MacBook Air M1) via Ansible provisioniert. Longhorn Storage, Cloudflare Tunnel, SOPS/age Secrets.',
        detail:
          'Infrastructure as Code für ein gemischtes Homelab. Alle 4 Nodes werden via Ansible konfiguriert und gehärtet. k3s als leichtgewichtiges Kubernetes, Longhorn für verteilten Block-Storage, Cloudflare Tunnel für sicheren Zugang ohne offene Ports.',
      },
      en: {
        summary:
          '4-node k3s cluster (2× Raspberry Pi 4, 2× MacBook Air M1) provisioned via Ansible. Longhorn storage, Cloudflare Tunnel, SOPS/age secrets.',
        detail:
          'Infrastructure as Code for a mixed homelab. All 4 nodes are configured and hardened via Ansible. k3s as lightweight Kubernetes, Longhorn for distributed block storage, Cloudflare Tunnel for secure access without open ports.',
      },
    },
  },
  {
    slug: 'club-assist',
    title: 'RCRJ Club Assist',
    status: 'wip',
    tags: ['n8n', 'Claude API', 'Next.js', 'PostgreSQL', 'Google APIs'],
    github: null,
    icon: 'boat',
    i18n: {
      de: {
        summary:
          'AI-gestütztes Vereinsmanagement: Protokoll-Extraktion, Task-Tracking, Gmail-Drafts mit Approval-Dashboard. n8n, Claude API, Next.js.',
        detail:
          'n8n extrahiert Aufgaben aus Sitzungsprotokollen via Claude API, erstellt Tasks, verfolgt Status und generiert E-Mail-Entwürfe für den Präsidenten. Ein Next.js-Dashboard gibt Überblick über offene Pendenzen.',
      },
      en: {
        summary:
          'AI-assisted club management: minutes extraction, task tracking, Gmail drafts with an approval dashboard. n8n, Claude API, Next.js.',
        detail:
          'n8n extracts tasks from meeting minutes via the Claude API, creates tasks, tracks status and generates email drafts for the president. A Next.js dashboard gives an overview of open items.',
      },
    },
  },
  {
    slug: 'karaokee',
    title: 'Karaokee — SoPra FS26',
    status: 'wip',
    tags: ['Spring Boot 3', 'REST', 'OpenAPI', 'React', 'TypeScript'],
    github: 'https://github.com/doemefu/very-cool-karaoke-client',
    icon: 'mic',
    i18n: {
      de: {
        summary:
          'Gruppen-Karaoke-App als SoPra-Semesterprojekt. Spring Boot 3 Backend, REST API First, OpenAPI-Spezifikation, React Client.',
        detail:
          'Semesterprojekt an der UZH: Eine Karaoke-App für Gruppen mit Song-Queue, Voting-System und Live-Session-Management. Backend-First-Entwicklung mit vollständiger OpenAPI-Dokumentation.',
      },
      en: {
        summary:
          'Group karaoke app as a SoPra semester project. Spring Boot 3 backend, REST API first, OpenAPI specification, React client.',
        detail:
          'Semester project at UZH: a karaoke app for groups with a song queue, voting system and live session management. Backend-first development with full OpenAPI documentation.',
      },
    },
  },
  {
    slug: 'auth-service',
    title: 'Homelab Auth Service',
    status: 'live',
    tags: ['OAuth 2.1', 'JWT', 'Spring Boot', 'Cloudflare Access'],
    github: 'https://github.com/doemefu/homelab-auth-service',
    icon: 'lock',
    i18n: {
      de: {
        summary:
          'Identity & Access Management für das Homelab. JWT issuance, SSO für alle Subdomain-Apps via Cloudflare Access Integration.',
        detail:
          'Zentraler Auth-Service für das Homelab. Gibt JWTs aus, validiert sie, und integriert mit Cloudflare Access für SSO über alle Subdomain-Apps. Ersatz für den deprecated Legacy-Auth-Service.',
      },
      en: {
        summary:
          'Identity & access management for the homelab. JWT issuance, SSO for all subdomain apps via Cloudflare Access integration.',
        detail:
          'Central auth service for the homelab. Issues and validates JWTs and integrates with Cloudflare Access for SSO across all subdomain apps. Replacement for the deprecated legacy auth service.',
      },
    },
  },
  {
    slug: 'aemtlifyer',
    title: 'Aemtlifyer',
    status: 'wip',
    tags: ['Next.js', 'PostgreSQL', 'TypeScript'],
    github: 'https://github.com/doemefu/aemtlifyer',
    icon: 'users',
    i18n: {
      de: {
        summary:
          'Vereins-Rollen- und Aufgaben-Management. Wer hat welches Amt? Was ist offen? Digitalisierung der Vereinsstruktur des RCRJ.',
        detail:
          'Vereinsspezifische App zur Verwaltung von Ämtern und Rollen im RCRJ. Ersetzt Excel-Listen und manuelle Nachverfolgung durch ein strukturiertes Dashboard.',
      },
      en: {
        summary:
          'Club role and task management. Who holds which office? What is open? Digitalising the RCRJ club structure.',
        detail:
          'Club-specific app for managing offices and roles in the RCRJ. Replaces Excel lists and manual tracking with a structured dashboard.',
      },
    },
  },
];

// Status pill — colours invariant (prototype statusColor); labels per locale
// (prototype statusLabel; identical text in both — product status terms).
export const STATUS_COLOR: Record<ProjectStatus, string> = {
  live: '#22c55e',
  wip: '#f59e0b',
  planned: '#94a3b8',
};

// Deliberately identical in DE and EN — these are product status terms the
// prototype intentionally does not translate. The locale dimension is kept so
// a future change can diverge them (e.g. "In Dev" → "In Entwicklung") in one
// place without changing call sites.
export const STATUS_LABEL: Record<Locale, Record<ProjectStatus, string>> = {
  de: { live: 'Live', wip: 'In Dev', planned: 'Planned' },
  en: { live: 'Live', wip: 'In Dev', planned: 'Planned' },
};
