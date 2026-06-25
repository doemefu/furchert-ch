// Bilingual content for /about. DE = prototype verbatim (pages.jsx PageAbout),
// EN = faithful translation of the same content (no invented claims).
// Per-record locale maps so DE/EN cannot drift in length (worklog F-Q2).
import type { Locale } from '@/i18n/routing';

export const BIO: Record<Locale, string[]> = {
  de: [
    'Ich bin Dominic — Softwareentwickler, Vereinspräsident und jemand der gerne Systeme baut, die im echten Leben funktionieren. Aufgewachsen in der Region Zürichsee/Obersee, ausgebildet als Applikationsentwickler bei der UBS, jetzt kurz vor dem Bachelor-Abschluss in Software Systems an der UZH.',
    'Neben dem Studium führe ich den Ruderclub Rapperswil-Jona mit rund 200 Mitgliedern als Präsident — inklusive einem Infrastrukturprojekt im Millionenbereich und der Organisation einer nationalen Regatta. Das hat mich mindestens so viel gelehrt wie jedes Informatik-Modul.',
    'Daneben bin ich Feuerwehrmann und J+S-Sportcoach. Aktuell beschäftigt mich die Frage, wie man mit KI und Automatisierung Prozesse in Industriebetrieben vereinfachen kann — ohne Grossprojekte, ohne Risiko, Schritt für Schritt.',
  ],
  en: [
    "I'm Dominic — software developer, club president, and someone who likes building systems that work in real life. Raised in the Lake Zurich / Obersee region, trained as an application developer at UBS, and now close to finishing my Bachelor's in Software Systems at UZH.",
    'Alongside my studies I lead the Rapperswil-Jona Rowing Club and its roughly 200 members as president — including a multi-million-franc infrastructure project and the organisation of a national regatta. That has taught me at least as much as any computer-science module.',
    "I'm also a firefighter and a J+S sports coach. Right now I'm focused on how AI and automation can simplify processes in industrial companies — without large projects, without risk, step by step.",
  ],
};

export interface Fact {
  value: string; // locale-invariant (e.g. "B.Sc.", "200+")
  i18n: Record<Locale, { label: string }>;
}

export const FACTS: Fact[] = [
  { value: 'B.Sc.', i18n: { de: { label: 'Software Systems, UZH' }, en: { label: 'Software Systems, UZH' } } },
  { value: '200+', i18n: { de: { label: 'Mitglieder als RCRJ-Präsident' }, en: { label: 'Members as RCRJ president' } } },
  { value: '4 Nodes', i18n: { de: { label: 'Homelab k3s Cluster' }, en: { label: 'Homelab k3s cluster' } } },
  { value: "~1'500", i18n: { de: { label: 'Athleten an der Regatta Schmerikon' }, en: { label: 'Athletes at the Schmerikon regatta' } } },
];

export interface TimelineRow {
  year: string; // locale-invariant
  i18n: Record<Locale, { items: string[] }>;
}

export const TIMELINE: TimelineRow[] = [
  {
    year: '2026',
    i18n: {
      de: { items: ['B.Sc. Software Systems — Universität Zürich (Minor BWL)', 'Freelancer — AI-Automation für Industrie-KMU'] },
      en: { items: ['B.Sc. Software Systems — University of Zurich (Minor in Business Administration)', 'Freelancer — AI automation for industrial SMEs'] },
    },
  },
  {
    year: '2025',
    i18n: {
      de: { items: ['Präsident Ruderclub Rapperswil-Jona', 'OK Nationale Ruderregatta Schmerikon (Chef Sicherheit)'] },
      en: { items: ['President, Rapperswil-Jona Rowing Club', 'Organising committee, National Rowing Regatta Schmerikon (Safety Chief)'] },
    },
  },
  {
    year: '2024',
    i18n: {
      de: { items: ['IT-Audit Praktikum — KPMG Assurance Technology Group'] },
      en: { items: ['IT audit internship — KPMG Assurance Technology Group'] },
    },
  },
  {
    year: '2022',
    i18n: {
      de: { items: ['AMZ Racing — ETH Formula Student (Pedal Box Integration)'] },
      en: { items: ['AMZ Racing — ETH Formula Student (pedal box integration)'] },
    },
  },
  {
    year: '2019',
    i18n: {
      de: { items: ['Applikationsentwickler EFZ — UBS (Core Cash Accounting)'] },
      en: { items: ['Application Developer (EFZ) — UBS (Core Cash Accounting)'] },
    },
  },
];

// Locale-invariant (English / proper nouns in the prototype).
export const INTERESTS: string[] = [
  'IoT',
  'Infrastructure as Code',
  'Industry 4.0',
  'Rowing',
  'Latin & Cuban Music',
  'Homelab',
  'Firefighting',
  'J+S Coaching',
];
