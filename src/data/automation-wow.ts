// The three example tiles in the /automation hero (#145): a site report
// spoken into the phone and a quote draft from an enquiry (both with
// ready-made tools), and a daily overview at 5:30 am, which is an own
// automation built later. Illustrative only: nothing here runs, records or
// calls an AI service. Every name, street and place is invented (Bachstrasse,
// Hofstrasse, Musterweg, Musterdorf, Herr Keller, R. Brunner); the panels say
// so. Seasonal content (frost, bad-weather report by 5 December) is an owner
// item for spring (O19). Guarded by src/i18n/automationCopy.test.ts.
import type { IconName } from '@/components/ui/Icon';
import type { Locale } from '@/i18n/routing';

export interface WowTileCopy<P> {
  /** One line from 360 px: at most 26 characters (DE). */
  title: string;
  /** Two lines from 375 px: at most 85 characters (DE). */
  body: string;
  /** Tag on the closed tile: ready-made tool or own automation. */
  kindLabel: string;
  /** First element of the opened panel; starts with "Beispiel" / "Example". */
  panelTag: string;
  panel: P;
}

export interface LabelValue {
  label: string;
  value: string;
}

// Tile 1: speech becomes a draft report.
export interface RapportPanel {
  speechLabel: string;
  /** Swiss German, identical in both locales (rendered with lang="de-CH"). */
  spoken: string;
  divider: string;
  rows: LabelValue[];
  /** Shown with the amber check mark. */
  openItem: LabelValue;
  note: string;
  /** Text of the in-page link to the full example (#beispiel). */
  exampleLink: string;
}

// Tile 2: an enquiry, a similar old quote, a draft without prices.
export interface OfferPanel {
  mailFrom: string;
  mailSubject: string;
  /** Short `Tag` text (at most 30 characters) plus plain text. */
  foundTag: string;
  foundText: string;
  memory: string;
  table: {
    caption: string;
    columns: [string, string, string];
    /** Item, quantity, price; the price is always "from your costing". */
    rows: Array<[string, string, string]>;
  };
  questionsLabel: string;
  questions: string[];
  reservationLabel: string;
  reservation: string;
  closing: string;
  footnote: string;
}

// Tile 3: the overview card at 5:30 am.
export interface OverviewPanel {
  /** Source chips (`Tag`). */
  sources: string[];
  cardTitle: string;
  cardTime: string;
  greeting: string;
  items: LabelValue[];
  closing: string;
  footnote: string;
}

interface TileBase {
  icon: IconName;
}

export type WowTile =
  | (TileBase & { id: 'rapport'; kind: 'ready'; i18n: Record<Locale, WowTileCopy<RapportPanel>> })
  | (TileBase & { id: 'offerte'; kind: 'ready'; i18n: Record<Locale, WowTileCopy<OfferPanel>> })
  | (TileBase & { id: 'uebersicht'; kind: 'own'; i18n: Record<Locale, WowTileCopy<OverviewPanel>> });

// Plausible Zurich German, checked by the construction reviewer (c1 M2).
const SPOKEN =
  'Regie Bachstrass, Abschnitt zwei: Gasleitig vo Hand freigleit, isch nöd im Plan gsi. Zwee Maa vo halbi zäh bis zwölfi, Bagger mit Maschinischt au.';

export const WOW_TILES: WowTile[] = [
  {
    id: 'rapport',
    icon: 'mic',
    kind: 'ready',
    i18n: {
      de: {
        title: 'Sprechen statt tippen',
        body: 'Der Polier spricht ins Handy. Daraus werden ein Rapport-Entwurf und die Pendenzen.',
        kindLabel: 'Fertiges Werkzeug',
        panelTag: 'Beispiel · fertiges Werkzeug',
        panel: {
          speechLabel: 'Gesprochen, auf Schweizerdeutsch',
          spoken: SPOKEN,
          divider: 'wird zum Rapport-Entwurf',
          rows: [
            { label: 'Baustelle', value: 'Bachstrasse, Abschnitt 2' },
            { label: 'Arbeiten', value: 'Gasleitung von Hand freigelegt, nicht im Plan' },
            { label: 'Personal', value: '2 Personen, 09:30 bis 12:00' },
            { label: 'Maschine', value: 'Bagger mit Maschinist, 2,5 Std.' },
          ],
          openItem: {
            label: 'Pendenz',
            value: 'Anordnung der Bauleitung schriftlich bestätigen lassen',
          },
          note: 'Laut Hersteller geht das auch auf Schweizerdeutsch. Ob es bei Ihren Leuten klappt, testen wir.',
          exampleLink: 'Das ganze Beispiel ansehen',
        },
      },
      en: {
        title: "Talk, don't type",
        body: 'The site foreman speaks into his phone. Out comes a draft report with the open items.',
        kindLabel: 'Ready-made tool',
        panelTag: 'Example · ready-made tool',
        panel: {
          speechLabel: 'Spoken, in Swiss German',
          spoken: SPOKEN,
          divider: 'becomes a draft report',
          rows: [
            { label: 'Site', value: 'Bachstrasse, section 2' },
            { label: 'Work', value: 'Gas line exposed by hand, not on the plan' },
            { label: 'Crew', value: '2 people, 09:30 to 12:00' },
            { label: 'Machine', value: 'Excavator with operator, 2.5 h' },
          ],
          openItem: {
            label: 'Open item',
            value: "Get the site supervisor's instruction confirmed in writing",
          },
          note: 'According to the vendors, this also works in Swiss German. Whether it works for your people, we test together.',
          exampleLink: 'See the full example',
        },
      },
    },
  },
  {
    id: 'offerte',
    icon: 'mail',
    kind: 'ready',
    i18n: {
      de: {
        title: 'Offerte aus der Anfrage',
        body: 'Anfrage per Mail, ähnliche Offerte in Ihrer Ablage gefunden. Die Preise rechnen Sie.',
        kindLabel: 'Fertiges Werkzeug',
        panelTag: 'Beispiel · fertiges Werkzeug',
        panel: {
          mailFrom: 'Von: R. Brunner, Musterdorf',
          mailSubject: 'Betreff: Vorplatz neu machen, rund 120 m², Fotos im Anhang',
          foundTag: 'In Ihrer Ablage gefunden',
          foundText: 'Offerte ‹Vorplatz Musterweg 2025›',
          memory:
            'Notiz in der alten Offerte: mehr Aushub als geplant. Darum steht der Aushub nach Ausmass.',
          table: {
            caption: 'Offerte-Entwurf',
            columns: ['Position', 'Menge', 'Preis'],
            rows: [
              ['Belag abbrechen und entsorgen', 'ca. 120 m²', 'aus Ihrer Kalkulation'],
              ['Aushub und Fundation ergänzen', 'nach Ausmass', 'aus Ihrer Kalkulation'],
              ['Neuer Belag', 'ca. 120 m²', 'aus Ihrer Kalkulation'],
              ['Randabschluss', 'ca. 24 m', 'aus Ihrer Kalkulation'],
            ],
          },
          questionsLabel: 'Rückfragen',
          questions: ['Zufahrt für Lastwagen möglich?', 'Entwässerung: Rinne gewünscht?'],
          reservationLabel: 'Vorbehalt',
          reservation: 'Altbelag auf PAK prüfen, Entsorgung nach Aufwand',
          closing: 'Den Entwurf prüfen und ergänzen Sie, die Preise setzen Sie ein.',
          footnote:
            'Das geht direkt, wenn Ihre Offerten in Microsoft 365 liegen und Sie eine Copilot-Lizenz haben. Liegen sie in der Bausoftware oder auf einem eigenen Server, klären wir in der Standortbestimmung, ob und wie es geht.',
        },
      },
      en: {
        title: 'Quote from the enquiry',
        body: 'An enquiry by e-mail, a similar past quote found in your files. You do the pricing.',
        kindLabel: 'Ready-made tool',
        panelTag: 'Example · ready-made tool',
        panel: {
          mailFrom: 'From: R. Brunner, Musterdorf',
          mailSubject: 'Subject: New forecourt, about 120 m², photos attached',
          foundTag: 'Found in your files',
          foundText: 'Quote “Forecourt Musterweg 2025”',
          memory:
            'Note in the old quote: more excavation than planned. So excavation is listed by measured quantity.',
          table: {
            caption: 'Draft quote',
            columns: ['Item', 'Quantity', 'Price'],
            rows: [
              ['Remove and dispose of asphalt', 'approx. 120 m²', 'from your costing'],
              ['Excavation and sub-base', 'by measured quantity', 'from your costing'],
              ['New asphalt surface', 'approx. 120 m²', 'from your costing'],
              ['Kerb edging', 'approx. 24 m', 'from your costing'],
            ],
          },
          questionsLabel: 'Questions for the client',
          questions: ['Access for lorries possible?', 'Drainage: is a channel wanted?'],
          reservationLabel: 'Reservation',
          reservation: 'Old asphalt to be tested for PAH; disposal charged as incurred',
          closing: 'You check and complete the draft and fill in the prices.',
          footnote:
            'This works directly if your quotes are stored in Microsoft 365 and you have a Copilot licence. If they are in your construction software or on your own server, we find out in the assessment whether and how it works.',
        },
      },
    },
  },
  {
    id: 'uebersicht',
    icon: 'cloud',
    kind: 'own',
    i18n: {
      de: {
        title: 'Tagesübersicht um 5.30 Uhr',
        body: 'Frost in der Nacht, Betonieren am Donnerstag? Aus Wetter, Bauprogramm und Pendenzen.',
        kindLabel: 'Eigene Automation, später',
        panelTag: 'Beispiel · eigene Automation',
        panel: {
          sources: ['Bauprogramm', 'MeteoSchweiz', 'Pendenzen'],
          cardTitle: 'Was heute ansteht',
          cardTime: 'Mi 5.30',
          greeting: 'Guten Morgen, Herr Keller.',
          items: [
            {
              label: 'Bodenplatte Hofstrasse, Donnerstag:',
              value:
                'Für die Nacht auf Freitag sind −4 °C gemeldet, danach wird es milder. Mit Winterbeton und Abdeckung betonieren oder auf Freitag schieben? Falls Freitag: Betonwerk heute anrufen. Die Equipe könnte am Donnerstag an der Bachstrasse den Aushub für Abschnitt 3 machen.',
            },
            {
              label: 'Anfragen:',
              value:
                '3 neue. Eine ähnelt Ihrer Offerte «Vorplatz Musterweg 2025». Positionen und Rückfragen liegen bereit, die Preise rechnen Sie.',
            },
            {
              label: 'Regie:',
              value: '2 Regierapporte Bachstrasse unterschreiben lassen, Frist Freitag.',
            },
            {
              label: 'Schlechtwetter:',
              value: 'Dienstag und Mittwoch letzter Woche, Bachstrasse. Meldung bis 5. Dezember.',
            },
          ],
          closing: 'Sie entscheiden, die Übersicht schlägt nur vor.',
          footnote:
            'Beispiel mit erfundenen Namen und Wetterdaten. Die Tagesübersicht ist eine eigene Automation, die ich nach einer Einführung in Ihrem Microsoft 365 einrichte. Voraussetzung: Ihr Bauprogramm ist digital, etwa in Excel. Wetterdaten im echten Betrieb: MeteoSchweiz (offene Daten). MeteoSchweiz ist an diesem Angebot nicht beteiligt.',
        },
      },
      en: {
        title: 'Daily overview at 5:30 am',
        body: 'Frost overnight, pour on Thursday? From the weather, your schedule and open items.',
        kindLabel: 'Own automation, later',
        panelTag: 'Example · own automation',
        panel: {
          sources: ['Schedule', 'MeteoSwiss', 'Open items'],
          cardTitle: "What's on today",
          cardTime: 'Wed 5:30',
          greeting: 'Good morning, Mr Keller.',
          items: [
            {
              label: 'Floor slab Hofstrasse, Thursday:',
              value:
                '−4 °C is forecast for Thursday night, milder after that. Pour with cold-weather concrete and covers, or move it to Friday? If Friday: call the concrete plant today. On Thursday the crew could dig the excavation for section 3 at the Bachstrasse.',
            },
            {
              label: 'Enquiries:',
              value:
                '3 new. One is similar to your quote “Forecourt Musterweg 2025”. Items and questions are ready; you do the pricing.',
            },
            {
              label: 'Time and materials:',
              value: 'get 2 Regie reports for the Bachstrasse signed, due Friday.',
            },
            {
              label: 'Bad weather:',
              value: 'Tuesday and Wednesday last week, Bachstrasse. Report due by 5 December.',
            },
          ],
          closing: 'You decide; the overview only suggests.',
          footnote:
            'Example with invented names and weather data. The daily overview is an own automation that I set up in your Microsoft 365 after a rollout. It needs your schedule in digital form, for example in Excel. Weather data in real use: MeteoSwiss (open data). MeteoSwiss is not involved in this offer.',
        },
      },
    },
  },
];
