// Bilingual content for /about. DE = prototype (pages.jsx PageAbout); the
// full name, the offer sentence and the 2026 timeline entry follow the live
// /automation page (#134). EN = faithful translation (no invented claims).
// Per-record locale maps so DE/EN cannot drift in length (worklog F-Q2).
import type { Locale } from '@/i18n/routing';

export const BIO: Record<Locale, string[]> = {
  de: [
    'Ich bin Dominic Furchert, Software Engineer und Vereinspräsident. Aufgewachsen in der Region Zürichsee/Obersee, ausgebildet als Applikationsentwickler bei der UBS, jetzt kurz vor dem Bachelor-Abschluss in Software Systems an der UZH.',
    'Neben dem Studium führe ich den Ruderclub Rapperswil-Jona mit rund 200 Mitgliedern als Präsident. Dazu kommen ein Infrastrukturprojekt mit einem Kostenvoranschlag von rund CHF 5 Mio. und, als Chef Sicherheit im OK, die Nationale Regatta Schmerikon. Erstmals in der Geschichte des Clubs habe ich einen Cheftrainer angestellt und führe ihn. Das hat mich mindestens so viel gelehrt wie jedes Informatik-Modul.',
    'Daneben bin ich Feuerwehrmann und J+S-Sportcoach. Beruflich helfe ich KMU im Zürcher Oberland aus Dienstleistung, Handwerk und Produktion, Abläufe mit KI zu vereinfachen: ohne Grossprojekt, Schritt für Schritt.',
  ],
  en: [
    "I'm Dominic Furchert, a software engineer and club president. Raised in the Lake Zurich / Obersee region, trained as an application developer at UBS, and now close to finishing my Bachelor's in Software Systems at UZH.",
    'Alongside my studies I lead the Rapperswil-Jona Rowing Club and its roughly 200 members as president. The role includes an infrastructure project with a current cost estimate of about CHF 5 million and, as head of safety on the organising committee, the National Regatta Schmerikon. For the first time in the club\'s history I hired a head coach, and I lead him. That has taught me at least as much as any computer-science module.',
    "I'm also a firefighter and a J+S sports coach. Professionally, I help SMEs in the Zurich area (services, trades and production) simplify their work with AI, one step at a time and without a big project.",
  ],
};

export interface Fact {
  value: string; // locale-invariant (e.g. "B.Sc.", "~200"; #160)
  i18n: Record<Locale, { label: string }>;
}

export const FACTS: Fact[] = [
  { value: 'B.Sc. 2027', i18n: { de: { label: 'Software Systems, UZH, Abschluss erwartet' }, en: { label: 'Software Systems, UZH, expected graduation' } } },
  { value: '~200', i18n: { de: { label: 'Mitglieder als RCRJ-Präsident' }, en: { label: 'Members as RCRJ president' } } },
  { value: 'EFZ', i18n: { de: { label: 'Applikationsentwickler, UBS' }, en: { label: 'Application developer, UBS' } } },
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
      de: { items: ['B.Sc. Software Systems, Universität Zürich (Minor BWL), Abschluss voraussichtlich 2027', 'Freelancer: KI für KMU im Zürcher Oberland'] },
      en: { items: ['B.Sc. Software Systems, University of Zurich (Minor in Business Administration), expected graduation 2027', 'Freelancer: AI for SMEs in the Zurich area'] },
    },
  },
  {
    year: '2025',
    i18n: {
      de: { items: ['Präsident Ruderclub Rapperswil-Jona'] },
      en: { items: ['President, Rapperswil-Jona Rowing Club'] },
    },
  },
  {
    year: '2024',
    i18n: {
      de: { items: ['Praktikum IT-Audit, KPMG Assurance Technology Group'] },
      en: { items: ['IT Audit Intern, KPMG Assurance Technology Group'] },
    },
  },
  {
    year: '2023',
    i18n: {
      de: { items: ['OK Nationale Ruderregatta Schmerikon (Chef Sicherheit, jeweils im Mai)'] },
      en: { items: ['Organising committee, National Rowing Regatta Schmerikon (Safety Chief, held every May)'] },
    },
  },
  {
    year: '2022',
    i18n: {
      de: { items: ['AMZ Racing, ETH Formula Student (Pedal Box Integration)'] },
      en: { items: ['AMZ Racing, ETH Formula Student (pedal box integration)'] },
    },
  },
  {
    year: '2019',
    i18n: {
      de: { items: ['Applikationsentwickler EFZ, UBS (Core Cash Accounting)'] },
      en: { items: ['Application Developer (EFZ), UBS (Core Cash Accounting)'] },
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
