// Before/after example for /automation: a site foreman's voice message after
// extra work on a civil engineering site (Regie) and the draft
// time-and-materials report a report app makes from it (#145). Invented data
// (Bachstrasse is a made-up site), labelled as such on the page. The marks
// show what a person checks before the report goes out: the role sets the
// Regie rate, the client's oral instruction needs a written confirmation.
// The last two fields sit behind "Alle Felder anzeigen" on the page.
// 17.11.2026 is a Tuesday.
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
      inputTitle: 'Sprachnachricht des Poliers, als Text',
      input:
        'Regie Bachstrasse, Werkleitungen, Abschnitt zwei. Die Bauleitung hat heute früh mündlich angeordnet, dass wir die alte Gasleitung freilegen und sichern. Die war nicht im Plan. Den Gasversorger habe ich angerufen. Zwei Mann haben sie von halb zehn bis zwölf von Hand freigelegt, der Bagger mit Maschinist hat daneben ausgehoben. Material: zwei Kanthölzer und ein Sack Sand. Fotos habe ich gemacht.',
      outputTitle: 'Regierapport-Entwurf (vereinfacht)',
      fields: [
        {
          label: 'Baustelle',
          lines: [
            {
              text: 'Werkleitungen Bachstrasse, Abschnitt 2',
              check: 'In Ihrer Baustellenliste gefunden, bitte bestätigen',
            },
          ],
        },
        {
          label: 'Anordnung',
          lines: [
            {
              text: 'Mündlich durch die Bauleitung, vor Ort',
              check: 'Schriftliche Bestätigung fehlt, bitte einholen',
            },
          ],
        },
        {
          label: 'Arbeiten',
          lines: [
            { text: 'Bestehende Gasleitung, nicht im Plan, von Hand freigelegt und gesichert' },
            { text: 'Gasversorger informiert' },
            { text: '3 Fotos angehängt' },
          ],
        },
        {
          label: 'Personal und Maschinen',
          lines: [
            {
              text: 'Di, 17.11., 09:30 bis 12:00: 2 Personen, je 2,5 Std.',
              check: 'Funktion fehlt (Polier, Facharbeiter, Bauarbeiter …), sie bestimmt den Regieansatz',
            },
            {
              text: 'Bagger mit Maschinist, 2,5 Std.',
              check: 'Zwei Bagger in Ihrer Maschinenliste, bitte wählen',
            },
          ],
        },
        {
          label: 'Material',
          lines: [{ text: '2 Kanthölzer, 1 Sack Sand', check: 'Länge der Kanthölzer fehlt' }],
        },
        {
          label: 'Pendenz',
          lines: [
            { text: 'Rapport der Bauleitung zur Unterschrift senden' },
            { text: 'Regieansätze einsetzen (Büro)' },
          ],
        },
      ],
      after:
        'Danach prüft der Bauführer den Entwurf und schickt ihn der Bauleitung zur Unterschrift. Das Büro bekommt den Rapport getippt und mit Fotos statt als Zettel am Freitag, setzt die Regieansätze ein, und die Rechnung erstellt weiterhin Ihre Bausoftware.',
    },
    en: {
      tag: 'Example, invented',
      inputTitle: "The site foreman's voice message, as text",
      input:
        "Regie, Bachstrasse, utility lines, section two. This morning the site supervisor told us verbally to expose and secure the old gas line. It wasn't on the plan. I called the gas utility. Two men exposed it by hand from half past nine to twelve, and the excavator with its operator dug alongside. Material: two timber beams and a bag of sand. I took photos.",
      outputTitle: 'Draft time-and-materials report (simplified)',
      fields: [
        {
          label: 'Site',
          lines: [
            {
              text: 'Utility lines Bachstrasse, section 2',
              check: 'Found in your site list, please confirm',
            },
          ],
        },
        {
          label: 'Instruction',
          lines: [
            {
              text: 'Verbal, by the site supervisor, on site',
              check: 'Written confirmation missing, please obtain',
            },
          ],
        },
        {
          label: 'Work',
          lines: [
            { text: 'Existing gas line, not on the plan, exposed by hand and secured' },
            { text: 'Gas utility informed' },
            { text: '3 photos attached' },
          ],
        },
        {
          label: 'Crew and machines',
          lines: [
            {
              text: 'Tue 17.11., 09:30 to 12:00: 2 people, 2.5 h each',
              check: 'Role missing (foreman, skilled worker, labourer …); it sets the Regie rate',
            },
            {
              text: 'Excavator with operator, 2.5 h',
              check: 'Two excavators in your machine list, please choose',
            },
          ],
        },
        {
          label: 'Material',
          lines: [{ text: '2 timber beams, 1 bag of sand', check: 'Length of the beams missing' }],
        },
        {
          label: 'Open items',
          lines: [
            { text: 'Send the report to the site supervisor for signature' },
            { text: 'Fill in the Regie rates (office)' },
          ],
        },
      ],
      after:
        'Then the site manager checks the draft and sends it to the site supervisor for signature. The office gets the report typed and with photos instead of a note on Friday, fills in the Regie rates, and your construction software still produces the invoice.',
    },
  },
};
