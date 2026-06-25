// Bilingual content for /rowing. DE = prototype verbatim (pages.jsx
// PageRowing), EN = faithful translation. Per-record locale maps (F-Q2);
// icon/tags locale-invariant.
import type { Locale } from '@/i18n/routing';

export interface RowingCardI18n {
  title: string;
  org: string;
  since: string | null;
  text: string;
  items?: string[];
  learning?: string;
}

export interface RowingCard {
  icon: string;
  tags: string[];
  i18n: Record<Locale, RowingCardI18n>;
}

export const ROWING_CARDS: RowingCard[] = [
  {
    icon: 'boat',
    tags: ['Leadership', 'Stakeholder Mgmt', 'Budgeting', 'CHF 5M Projekt'],
    i18n: {
      de: {
        title: 'Präsident & Vorstand',
        org: 'Ruderclub Rapperswil-Jona',
        since: 'seit 2025',
        text: 'Führung eines Vereins mit ~200 Mitgliedern. Verantwortlich für Vorstand, Budget, strategische Ausrichtung.',
        items: [
          'Leitung des WSZ 2.0 Infrastrukturprojekts (CHF ~5M, Stadt + externe Partner)',
          'Stakeholder-Prozess mit Stadt und Partnern koordiniert',
          'Digitalisierung der Vereinskommunikation angestossen (→ Club Assist)',
        ],
        learning: '"Einen Verein zu führen heisst, Leute zu überzeugen die man nicht bezahlen kann. Das ist die ehrlichste Form von Leadership."',
      },
      en: {
        title: 'President & Board',
        org: 'Rapperswil-Jona Rowing Club',
        since: 'since 2025',
        text: 'Leading a club with ~200 members. Responsible for the board, budget and strategic direction.',
        items: [
          'Leading the WSZ 2.0 infrastructure project (CHF ~5M, city + external partners)',
          'Coordinated the stakeholder process with the city and partners',
          'Initiated the digitalisation of club communication (→ Club Assist)',
        ],
        learning: '"Leading a club means convincing people you cannot pay. That is the most honest form of leadership."',
      },
    },
  },
  {
    icon: 'chip',
    tags: ['Event Mgmt', 'Safety', 'Permits', '~1500 Athleten'],
    i18n: {
      de: {
        title: 'Chef Sicherheit — Nationale Regatta',
        org: 'Ruderregatta Schmerikon',
        since: 'Mai 2026',
        text: "Organisation der nationalen Ruderregatta mit ~1'500 Athleten. Verantwortlich für das Sicherheitskonzept (nautisch + Land), Permits, Koordination mit Behörden und Rettungsdiensten.",
        learning: '"1\'500 Athleten auf dem Wasser sicher betreuen verlangt Planung, Redundanz und die Fähigkeit, unter Druck Entscheidungen zu treffen."',
      },
      en: {
        title: 'Safety Chief — National Regatta',
        org: 'Schmerikon Rowing Regatta',
        since: 'May 2026',
        text: 'Organising the national rowing regatta with ~1,500 athletes. Responsible for the safety concept (nautical + land), permits, and coordination with authorities and emergency services.',
        learning: '"Keeping 1,500 athletes safe on the water demands planning, redundancy and the ability to make decisions under pressure."',
      },
    },
  },
  {
    icon: 'spark',
    tags: ['Feuerwehr (AdF)', 'J+S Sportcoach', 'Teamführung'],
    i18n: {
      de: {
        title: 'Weiteres Engagement',
        org: 'Feuerwehr & J+S',
        since: null,
        text: 'Feuerwehrmann (AdF) und J+S-Sportcoach. Ob beim Löschangriff oder auf dem Trainingsplatz — gemeinsam unter Druck handeln ist ein roter Faden in allem was ich tue.',
      },
      en: {
        title: 'Further Engagement',
        org: 'Fire brigade & J+S',
        since: null,
        text: 'Firefighter (AdF) and J+S sports coach. Whether on a firefighting attack or on the training ground — acting together under pressure is a common thread in everything I do.',
      },
    },
  },
];
