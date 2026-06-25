// Bilingual content for /it. DE = prototype verbatim (pages.jsx PageIT),
// EN = faithful translation. Per-record locale maps (worklog F-Q2);
// icon/tags are locale-invariant.
import type { Locale } from '@/i18n/routing';

export interface ExpCardI18n {
  title: string;
  org: string;
  since: string;
  text: string;
  learning: string;
}

export interface ItCard {
  icon: string;
  tags: string[];
  i18n: Record<Locale, ExpCardI18n>;
}

export const IT_CARDS: ItCard[] = [
  {
    icon: 'code',
    tags: ['Java', 'Spring Boot', 'REST', 'SQL', 'OpenAPI', 'BWL'],
    i18n: {
      de: {
        title: 'Studium — Software Systems',
        org: 'Universität Zürich',
        since: 'BSc, Minor BWL',
        text: 'Full-Stack, Datenbanken, Software Engineering, Betriebswirtschaft. SoPra-Gruppenprojekt "Karaokee" (Spring Boot 3, REST API Design, OpenAPI).',
        learning: '"Die Kombination aus CS und BWL zwingt mich, Technologie immer vom Business-Nutzen her zu denken — nicht vom Tech-Stack."',
      },
      en: {
        title: 'Studies — Software Systems',
        org: 'University of Zurich',
        since: 'BSc, Minor in Business Administration',
        text: 'Full-stack, databases, software engineering, business administration. SoPra group project "Karaokee" (Spring Boot 3, REST API design, OpenAPI).',
        learning: '"Combining CS and business administration forces me to always think about technology from its business value — not from the tech stack."',
      },
    },
  },
  {
    icon: 'server',
    tags: ['COBOL', 'JCL', 'DB2', 'Ansible', 'Mainframe'],
    i18n: {
      de: {
        title: 'Application Development',
        org: 'UBS',
        since: 'Applikationsentwickler EFZ',
        text: 'COBOL-Batch-Systeme im Core Cash Accounting modernisiert. IBM Mainframe, JCL, DB2. Cloud-Infrastruktur mit Ansible automatisiert.',
        learning: '"Produktionssysteme einer Grossbank verzeihen keine Fehler. Hier habe ich gelernt, was \'business-critical\' wirklich bedeutet."',
      },
      en: {
        title: 'Application Development',
        org: 'UBS',
        since: 'Application Developer (EFZ)',
        text: 'Modernised COBOL batch systems in Core Cash Accounting. IBM mainframe, JCL, DB2. Automated cloud infrastructure with Ansible.',
        learning: '"The production systems of a major bank forgive no mistakes. This is where I learned what \'business-critical\' really means."',
      },
    },
  },
  {
    icon: 'globe',
    tags: ['ERP', 'SAP', 'IT Audit', 'ITGC', 'Compliance'],
    i18n: {
      de: {
        title: 'IT Audit',
        org: 'KPMG',
        since: 'Assurance Technology Group',
        text: 'IT-Audits von ERP-Systemen. Zugriffs- und Änderungsmanagement-Kontrollen geprüft. Schnittstelle zwischen IT und Finanzprozessen.',
        learning: '"IT-Systeme aus der Aussenperspektive zu prüfen hat mir gezeigt, wie Unternehmen wirklich mit Technologie arbeiten — und wo sie scheitern."',
      },
      en: {
        title: 'IT Audit',
        org: 'KPMG',
        since: 'Assurance Technology Group',
        text: 'IT audits of ERP systems. Reviewed access and change-management controls. The interface between IT and financial processes.',
        learning: '"Auditing IT systems from the outside showed me how companies really work with technology — and where they fail."',
      },
    },
  },
  {
    icon: 'chip',
    tags: ['C / C++', 'Embedded', 'Sensoren', 'Formula Student'],
    i18n: {
      de: {
        title: 'Formula Student — Embedded Systems',
        org: 'AMZ Racing',
        since: 'ETH Formula Student',
        text: 'Sensorintegration in die Pedal Box eines Formula Student Rennwagens. Hardware trifft Software trifft Teamarbeit unter Druck.',
        learning: '"Embedded Systems in einem Rennwagen haben mein Interesse an IoT geweckt."',
      },
      en: {
        title: 'Formula Student — Embedded Systems',
        org: 'AMZ Racing',
        since: 'ETH Formula Student',
        text: 'Sensor integration into the pedal box of a Formula Student race car. Hardware meets software meets teamwork under pressure.',
        learning: '"Embedded systems in a race car sparked my interest in IoT."',
      },
    },
  },
];

export interface TechStackGroup {
  items: string[]; // locale-invariant tech names
  i18n: Record<Locale, { cat: string }>;
}

export const TECH_STACK: TechStackGroup[] = [
  { items: ['Java · Spring Boot', 'Python', 'COBOL'], i18n: { de: { cat: 'Backend' }, en: { cat: 'Backend' } } },
  { items: ['React · TypeScript', 'Next.js'], i18n: { de: { cat: 'Frontend' }, en: { cat: 'Frontend' } } },
  { items: ['ESP32 · C++', 'MQTT', 'PlatformIO'], i18n: { de: { cat: 'IoT' }, en: { cat: 'IoT' } } },
  { items: ['Kubernetes · k3s', 'Ansible · Docker'], i18n: { de: { cat: 'Infra' }, en: { cat: 'Infra' } } },
  { items: ['PostgreSQL', 'InfluxDB · DB2'], i18n: { de: { cat: 'Datenbanken' }, en: { cat: 'Databases' } } },
  { items: ['GitHub Actions', 'Cloudflare', 'Azure'], i18n: { de: { cat: 'Cloud / CI' }, en: { cat: 'Cloud / CI' } } },
];
