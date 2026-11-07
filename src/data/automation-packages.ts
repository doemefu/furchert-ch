// Process and prices for /automation: the Gate-0 offer (owner decision
// 2026-11-07, #145). Four steps in the order a customer goes through them,
// both size tiers at equal weight (`price` and `priceAlt`), the risk reversal
// as `terms` of the rollout, and the own automation once, as "possible
// later". Prices are fixed and in Swiss francs; the VAT status is an open
// owner item, so the page says "Fixpreise in Franken." and nothing about VAT.
// Deliberately not shown: hourly rates, licence prices, a credit of the
// assessment and any price not listed below. Guarded by
// src/i18n/automationCopy.test.ts.
import type { Locale } from '@/i18n/routing';

export interface PackageCopy {
  name: string;
  /** Approved price phrase, e.g. "CHF 3'900 unter 20 Personen". */
  price: string;
  /** Second size tier, shown in the same style as `price`. */
  priceAlt?: string;
  priceNote?: string;
  summary: string;
  /** Conditions in body size, always visible (risk reversal, screening). */
  terms?: string[];
  includes: string[];
  excludes?: string;
}

export interface AutomationPackage {
  id: 'demo' | 'assessment' | 'rollout' | 'subscription' | 'extension';
  i18n: Record<Locale, PackageCopy>;
}

// The steps in the order a customer goes through them (numbered 01 to 04).
export const PRICE_STEPS: AutomationPackage[] = [
  {
    id: 'demo',
    i18n: {
      de: {
        name: 'Live-Demo',
        price: 'kostenlos',
        summary: '30 Minuten, bei Ihnen oder per Video. Ich zeige, was heute geht.',
        includes: [],
      },
      en: {
        name: 'Live demo',
        price: 'free',
        summary: '30 minutes, at your firm or by video. I show you what works today.',
        includes: [],
      },
    },
  },
  {
    id: 'assessment',
    i18n: {
      de: {
        name: 'Standortbestimmung',
        price: 'CHF 750',
        summary: 'Ein halber Tag im Büro und auf der Baustelle. Danach wissen Sie, was passt.',
        terms: ['Eine Einführung biete ich nur an, wenn ich glaube, dass sie bei Ihnen läuft.'],
        includes: [
          'Rundgang und Gespräche vor Ort',
          'Test mit Sprachnachrichten Ihrer Poliere, auf der Baustelle',
          'Wo Offerten und Bauprogramm heute liegen',
          'Wer heute auf welche Ordner zugreifen kann',
          'Kurzbericht: Abläufe, passende Werkzeuge, Kosten der Lizenzen',
          'Offerte für die Einführung, mit Fixpreis',
        ],
      },
      en: {
        name: 'Assessment',
        price: 'CHF 750',
        summary: 'Half a day in the office and on site. Afterwards you know what fits.',
        terms: ['I only offer a rollout if I believe it will work at your firm.'],
        includes: [
          'Walk-through and conversations on site',
          "A test with your foremen's voice messages, on site",
          'Where quotes and the schedule are kept today',
          'Who can access which folders today',
          'Short report: workflows, suitable tools, licence costs',
          'A quote for the rollout, at a fixed price',
        ],
      },
    },
  },
  {
    id: 'rollout',
    i18n: {
      de: {
        name: 'Einführung',
        price: "CHF 3'900 unter 20 Personen",
        priceAlt: "ab CHF 7'500 ab 20 Personen",
        priceNote: 'Den genauen Betrag nennt die Offerte.',
        summary: 'Ein Werkzeug, eingerichtet mit Ihren Vorlagen, damit es im Alltag läuft.',
        terms: [
          'Sie zahlen die Hälfte bei Auftrag. Die zweite Hälfte wird fällig, wenn die Messung nach 6 Wochen zeigt, dass das vereinbarte Ziel erreicht ist.',
          'Das Ziel legen wir vorher gemeinsam auf einem Zielblatt fest, dazu die Schulungen. Beispiel: 10 von 15 Tagesrapporten pro Woche kommen per Sprache. Gezählt wird zusammengefasst, nie pro Person.',
          'Wird das Ziel nicht erreicht, begleite ich Sie 4 Wochen weiter, ohne Aufpreis, und wir messen noch einmal. So lange wartet die zweite Hälfte.',
          'Ist das Ziel dann erreicht, wird sie fällig. Wenn nicht und die vereinbarten Schulungen haben stattgefunden, entfällt die zweite Hälfte.',
        ],
        includes: [
          'Einrichtung, Vorlagen und Schulung, auf der Baustelle und im Büro',
          'Regeln für Ihre Daten, auf 1 bis 2 Seiten',
          'Messung nach 6 Wochen, zusammengefasst und ohne Namen',
          'Ab 20 Personen: Schulung pro Equipe und fürs Büro',
        ],
      },
      en: {
        name: 'Rollout',
        price: "CHF 3'900 under 20 people",
        priceAlt: "from CHF 7'500 for 20 people or more",
        priceNote: 'The quote states the exact amount.',
        summary: 'One tool, set up with your templates so that it works day to day.',
        terms: [
          'You pay half on order. The second half falls due when the measurement after 6 weeks shows that the agreed target has been reached.',
          'We set the target together beforehand on a target sheet (Zielblatt), along with the training sessions. Example: 10 of 15 daily site reports a week come in by voice. Counts are aggregated, never per person.',
          'If the target is not reached, I support you for 4 more weeks at no extra charge, and we measure again. Until then, the second half waits.',
          'If the target is then reached, it falls due. If not, and the agreed training took place, the second half is waived.',
        ],
        includes: [
          'Set-up, templates and training, on site and in the office',
          'Rules for your data, on 1 to 2 pages',
          'Measurement after 6 weeks, aggregated and without names',
          'From 20 people: training per crew and for the office',
        ],
      },
    },
  },
  {
    id: 'subscription',
    i18n: {
      de: {
        name: 'Abo',
        price: 'CHF 200 pro Monat unter 20 Personen',
        priceAlt: 'CHF 500 bis 900 pro Monat ab 20 Personen',
        priceNote: 'Je nach Umfang. Den genauen Betrag nennt die Offerte.',
        summary: 'Damit das Werkzeug nach der Einführung gebraucht wird.',
        includes: [
          'Fragen per E-Mail, Antwort spätestens am nächsten Arbeitstag',
          'Neue Leute einführen, etwa zum Saisonstart',
          'Hinweise, wenn Hersteller etwas ändern',
          'Ab 20 Personen: ein fester Termin im Monat',
        ],
      },
      en: {
        name: 'Subscription',
        price: 'CHF 200 a month under 20 people',
        priceAlt: 'CHF 500 to 900 a month for 20 people or more',
        priceNote: 'Depending on scope. The quote states the exact amount.',
        summary: 'So that the tool stays in use after the rollout.',
        includes: [
          'Questions by email, a reply by the next working day at the latest',
          'Introducing new people, for example at the start of the season',
          'Notices when vendors change something',
          'From 20 people: a fixed appointment each month',
        ],
      },
    },
  },
];

// The own automation ("Ausbau" in the strategy, never in visible copy): one
// box after the steps, its price shown only here.
export const PRICE_ADDON: AutomationPackage = {
  id: 'extension',
  i18n: {
    de: {
      name: 'Eigene Automation',
      price: "ab CHF 8'000",
      summary:
        'Wenn Ihnen nach einer Einführung etwas fehlt, baue ich eine Automation dazu, die es so nicht zu kaufen gibt, zum Beispiel die Tagesübersicht von oben. Mit eigener Offerte.',
      includes: [],
    },
    en: {
      name: 'Own automation',
      price: "from CHF 8'000",
      summary:
        'If something is still missing after a rollout, I build an automation that you cannot buy off the shelf, such as the daily overview above. With its own quote.',
      includes: [],
    },
  },
};
