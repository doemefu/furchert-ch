// Sample calculation under the /automation example (#145): what spoken site
// reports could free up in an invented civil engineering firm with 15 people,
// set side by side with what the offer costs, never netted. Time value is not
// cash, so the copy never says "Sie sparen" / "you save". The amounts here
// are the only place on the page for licence and labour-cost assumptions;
// they stay out of the JSON-LD. Assumptions are an open owner item (O16).
//
// Arithmetic (checked by script and in src/i18n/automationCopy.test.ts):
// - today 15 × 15 + 4 × 25 = 325 min a week; by voice 15 × 6 + 4 × 10 = 130 min;
//   difference 195 min = 3.25 h, shown rounded down as "rund 3 Stunden";
// - time value 3 h × 44 weeks × CHF 57 = CHF 7'524, shown as "rund CHF 7'500";
// - year 1: 750 + 3'900 + 12 × 200 (2'400) + 4 × 12 × 25 (1'200) = CHF 8'250;
// - from year 2: 2'400 + 1'200 = CHF 3'600 a year.
import type { Locale } from '@/i18n/routing';

export interface CalcRow {
  label: string;
  today: string;
  byVoice: string;
}

export interface AutomationCalcCopy {
  /** Table caption; starts with "Beispielrechnung" / "Sample calculation". */
  title: string;
  assumptions: string;
  /** Column heads: report type, today, by voice. */
  columns: [string, string, string];
  rows: CalcRow[];
  results: string[];
  note: string;
  /** Text link to /contact under the calculation. */
  cta: string;
}

export const CALC: { i18n: Record<Locale, AutomationCalcCopy> } = {
  i18n: {
    de: {
      title: 'Beispielrechnung: Tiefbaufirma mit 15 Personen',
      assumptions:
        'Annahmen: 3 Poliere oder Vorarbeiter, 1 Bauführer. Die Minuten pro Rapport sind geschätzt, nicht gemessen. Die Ergebnisse sind abgerundet.',
      columns: ['Rapport', 'Heute', 'Mit Sprache'],
      rows: [
        { label: 'Tagesrapporte, 15 pro Woche', today: '15 Min.', byVoice: '6 Min.' },
        { label: 'Regierapporte, 4 pro Woche', today: '25 Min.', byVoice: '10 Min.' },
      ],
      results: [
        'Zusammen rund 3 Stunden pro Woche, verteilt auf vier Leute. Das ist ungefähr ein Abend.',
        "Zeitwert: 3 Std. × 44 Wochen × CHF 57 (angenommene Lohnkosten pro Stunde) ergibt rund CHF 7'500 pro Jahr. Das ist Zeit, die frei wird, nicht eingesparter Lohn.",
        "Kosten im ersten Jahr: Standortbestimmung CHF 750, Einführung CHF 3'900, Abo 12 × CHF 200 = CHF 2'400, 4 App-Lizenzen rund CHF 1'200 (angenommen CHF 25 pro Person und Monat). Zusammen rund CHF 8'250. Im ersten Jahr liegen die Kosten also etwas über dem Zeitwert.",
        "Ab dem zweiten Jahr: rund CHF 3'600 pro Jahr für Abo und Lizenzen, bei rund CHF 7'500 Zeitwert pro Jahr.",
      ],
      note: 'Mit Ihren Zahlen rechnen wir in der Standortbestimmung.',
      cta: 'Passt das zu Ihrem Betrieb? Live zeigen lassen →',
    },
    en: {
      title: 'Sample calculation: civil engineering firm with 15 people',
      assumptions:
        'Assumptions: 3 foremen or charge hands, 1 site manager. The minutes per report are estimates, not measurements. Results are rounded down.',
      columns: ['Report', 'Today', 'By voice'],
      rows: [
        { label: 'Daily site reports, 15 a week', today: '15 min', byVoice: '6 min' },
        { label: 'Time-and-materials reports, 4 a week', today: '25 min', byVoice: '10 min' },
      ],
      results: [
        'Together about 3 hours a week, spread over four people. That is roughly one evening.',
        "Time value: 3 h × 44 weeks × CHF 57 (assumed labour cost per hour) gives about CHF 7'500 a year. That is time freed up, not wages saved.",
        "Costs in year one: assessment CHF 750, rollout CHF 3'900, subscription 12 × CHF 200 = CHF 2'400, 4 app licences about CHF 1'200 (assuming CHF 25 per person and month). Together about CHF 8'250. In year one the costs are therefore a little higher than the time value.",
        "From year two: about CHF 3'600 a year for subscription and licences, against about CHF 7'500 time value a year.",
      ],
      note: 'We do the sums with your figures in the assessment.',
      cta: 'Does this fit your firm? See it live →',
    },
  },
};
