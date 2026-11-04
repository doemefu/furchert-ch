// Before/after example for /automation: an electrician's voice memo and the
// report draft made from it (the business case's story B2). Invented data,
// labelled as such on the page. The customer and the items come from lists
// the business exports (customer list, materials list), so the example works
// without a connection to the trade software.
import type { Locale } from '@/i18n/routing';

export interface ExampleLine {
  text: string;
  /** Marked for a person to check, with the reason. */
  check?: string;
}

export interface ExampleField {
  label: string;
  lines: ExampleLine[];
}

export interface AutomationExampleCopy {
  /** Says that the example is invented. */
  tag: string;
  inputTitle: string;
  input: string;
  outputTitle: string;
  fields: ExampleField[];
  /** What happens with the draft afterwards. */
  after: string;
}

export const EXAMPLE: { i18n: Record<Locale, AutomationExampleCopy> } = {
  i18n: {
    de: {
      tag: 'Beispiel, erfunden',
      inputTitle: 'Sprachnotiz des Monteurs, als Text',
      input:
        'Also, Rapport Familie Muster in Bubikon, Musterweg zwölf. Heute von halb acht bis zehn. In der Küche eine neue Dreifachsteckdose über der Arbeitsfläche montiert, Leitung ab der Abzweigdose gezogen, etwa drei, nein, vier Meter. Material: eine Dreifachsteckdose Aufputz weiss, vier Meter Kabel drei mal eins Komma fünf, zwei Verbindungsklemmen. Sicherung geprüft, alles in Ordnung. Ah, und der Kunde will noch eine Offerte für eine Aussenlampe.',
      outputTitle: 'Rapport-Entwurf',
      fields: [
        {
          label: 'Kunde',
          lines: [
            {
              text: 'Familie Muster, Musterweg 12, 8608 Bubikon',
              check: 'In Ihrer Kundenliste gefunden, bitte bestätigen',
            },
          ],
        },
        { label: 'Zeit', lines: [{ text: 'Di, 10.11., 07:30 bis 10:00, 2,5 Std.' }] },
        {
          label: 'Arbeiten',
          lines: [
            { text: 'Steckdose 3-fach Aufputz über der Arbeitsfläche in der Küche montiert' },
            { text: 'Zuleitung ab Abzweigdose, ca. 4 m' },
            { text: 'Sicherung geprüft, in Ordnung' },
          ],
        },
        {
          label: 'Material',
          lines: [
            {
              text: '1 × Steckdose 3-fach AP weiss',
              check: 'Zwei passende Artikel in Ihrer Materialliste, bitte wählen',
            },
            { text: '4 m Kabel 3 × 1,5 mm²' },
            { text: '2 × Verbindungsklemme' },
          ],
        },
        { label: 'Pendenz', lines: [{ text: 'Offerte Aussenleuchte, als Aufgabe fürs Büro erfasst' }] },
        {
          label: 'Hinweis',
          lines: [{ text: 'Keine Messwerte diktiert. Das Prüfprotokoll bitte wie gewohnt erstellen.' }],
        },
      ],
      after:
        'Danach bestätigt der Monteur den Entwurf auf dem Handy. Das Büro wählt den richtigen Artikel und übernimmt den Rapport. Die Rechnung erstellt weiterhin Ihre Branchensoftware.',
    },
    en: {
      tag: 'Invented example',
      inputTitle: "Electrician's voice memo, as text",
      input:
        'Right, report for the Muster family in Bubikon, Musterweg twelve. Today from half past seven to ten. In the kitchen, fitted a new triple socket above the worktop, ran the cable from the junction box, about three, no, four metres. Materials: one surface-mounted triple socket, white, four metres of cable three by one point five, two connector terminals. Checked the fuse, all fine. Oh, and the customer wants a quote for an outdoor light.',
      outputTitle: 'Draft job report',
      fields: [
        {
          label: 'Customer',
          lines: [
            {
              text: 'Muster family, Musterweg 12, 8608 Bubikon',
              check: 'Found in your customer list, please confirm',
            },
          ],
        },
        { label: 'Time', lines: [{ text: 'Tue 10 Nov, 07:30 to 10:00, 2.5 h' }] },
        {
          label: 'Work',
          lines: [
            { text: 'Surface-mounted triple socket fitted above the kitchen worktop' },
            { text: 'Supply cable from the junction box, approx. 4 m' },
            { text: 'Fuse checked, OK' },
          ],
        },
        {
          label: 'Materials',
          lines: [
            {
              text: '1 × triple socket, surface-mounted, white',
              check: 'Two matching items in your materials list, please choose',
            },
            { text: '4 m cable 3 × 1.5 mm²' },
            { text: '2 × connector terminal' },
          ],
        },
        { label: 'Follow-up', lines: [{ text: 'Quote for outdoor light, added as a task for the office' }] },
        {
          label: 'Note',
          lines: [{ text: 'No measured values dictated. Please complete the test record as usual.' }],
        },
      ],
      after:
        'Then the electrician confirms the draft on the phone. The office picks the right item and enters the report. Invoices still come from your trade software.',
    },
  },
};
