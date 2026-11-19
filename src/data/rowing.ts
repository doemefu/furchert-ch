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
        since: 'seit 2024',
        text: 'Führung eines Vereins mit rund 200 Mitgliedern. Verantwortlich für Vorstand, Budget, strategische Ausrichtung.',
        items: [
          'Erstmals in der Vereinsgeschichte einen Cheftrainer angestellt und führe diesen',
          'Verantwortung für das WSZ 2.0 Infrastrukturprojekt (aktueller Kostenvoranschlag rund CHF 5 Mio., mit Stadt und externen Partnern)',
          'Stakeholder-Prozess mit Stadt und Partnern koordiniert',
          'Digitalisierung der Vereinskommunikation angestossen (siehe Club Assist)',
        ],
        learning: '"Einen Verein zu führen heisst, Leute zu überzeugen die man nicht bezahlen kann. Das ist die ehrlichste Form von Leadership."',
      },
      en: {
        title: 'President & Board',
        org: 'Rapperswil-Jona Rowing Club',
        since: 'since 2024',
        text: 'Leading a club with around 200 members. Responsible for the board, budget and strategic direction.',
        items: [
          'Hired a head coach for the first time in the club\'s history and lead him',
          'Responsible for the WSZ 2.0 infrastructure project (current cost estimate about CHF 5 million, with the city and external partners)',
          'Coordinated the stakeholder process with the city and partners',
          'Initiated the digitalisation of club communication (see Club Assist)',
        ],
        learning: '"Leading a club means convincing people you cannot pay. That is the most honest form of leadership."',
      },
    },
  },
  {
    icon: 'chip',
    tags: ['Event Mgmt', 'Safety', 'Permits', "~1'500 Athleten"],
    i18n: {
      de: {
        title: 'Chef Sicherheit: Nationale Regatta',
        org: 'Ruderregatta Schmerikon',
        since: 'seit 2023',
        text: "Chef Sicherheit im OK der nationalen Ruderregatta (jeweils im Mai) mit rund 1'500 Athleten: verantwortlich für das Sicherheitskonzept (nautisch + Land), Permits, Koordination mit Behörden und Rettungsdiensten.",
        learning: '"1\'500 Athleten auf dem Wasser sicher betreuen verlangt Planung, Redundanz und die Fähigkeit, unter Druck Entscheidungen zu treffen."',
      },
      en: {
        title: 'Safety Chief: National Regatta',
        org: 'Schmerikon Rowing Regatta',
        since: 'since 2023',
        text: 'Head of safety on the organising committee of the national rowing regatta (held every May) with around 1,500 athletes: responsible for the safety concept (nautical + land), permits, and coordination with authorities and emergency services.',
        learning: '"Keeping 1,500 athletes safe on the water demands planning, redundancy and the ability to make decisions under pressure."',
      },
    },
  },
  {
    icon: 'users',
    tags: ['Feuerwehr (AdF)', 'J+S Sportcoach', 'Teamführung'],
    i18n: {
      de: {
        title: 'Weiteres Engagement',
        org: 'Feuerwehr & J+S',
        since: null,
        text: 'Feuerwehrmann (AdF) und J+S-Sportcoach. Beim Löschangriff wie auf dem Trainingsplatz geht es darum, unter Druck gemeinsam zu handeln.',
      },
      en: {
        title: 'Further Engagement',
        org: 'Fire brigade & J+S',
        since: null,
        text: 'Firefighter (AdF) and J+S sports coach. At a fire and on the training ground alike, it comes down to acting together under pressure.',
      },
    },
  },
];
