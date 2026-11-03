// Trade stories for /automation: typical processes, not customer projects.
// Source: the owner's business case (stories B2, B1, B5 and B7, research of
// 2026-11-03). Every business is invented. Hours per week are estimates,
// rounded to half hours in the reader's disfavour (before down, after up).
//
// No prices in the stories: the price block shows them, and the business
// case estimates more effort for these processes than the cheapest trial
// run covers. The `fit` line names the package and the narrow scope instead
// (guarded by src/i18n/automationCopy.test.ts).
import type { Locale } from '@/i18n/routing';

export interface AutomationStoryCopy {
  /** Starts with "Beispiel" / "Example": trade and size of the invented business. */
  tag: string;
  title: string;
  today: string;
  withAi: string;
  /** What the owner keeps deciding. */
  decide: string;
  /** Where the data goes, one entry per station. */
  dataPath: string[];
  dataNote?: string;
  /** Which package fits and with what scope; no prices. */
  fit: string;
}

export interface AutomationStory {
  id: 'electrician' | 'carpentry' | 'bakery' | 'salon';
  /** Estimated hours per week today. */
  hoursBefore: number;
  /** Estimated hours per week with the AI process. */
  hoursAfter: number;
  i18n: Record<Locale, AutomationStoryCopy>;
}

export const STORIES: AutomationStory[] = [
  {
    // B2: 600 → 240 minutes per week.
    id: 'electrician',
    hoursBefore: 10,
    hoursAfter: 4,
    i18n: {
      de: {
        tag: 'Beispiel · Elektroinstallation · 8 Personen',
        title: 'Sprachnotiz auf der Baustelle wird Arbeitsrapport',
        today:
          'Fünf Monteure schreiben pro Woche rund 30 Rapporte von Hand. Das Büro tippt sie ab, entziffert die Handschrift und fragt bei jedem fünften Rapport nach.',
        withAi:
          'Der Monteur spricht nach dem Einsatz ein bis zwei Minuten ins Handy. Daraus entsteht ein Rapport in Ihrem Format, mit Artikeln aus Ihrer Materialliste. Unklares ist markiert. Monteur und Büro prüfen, dann übernimmt das Büro den Rapport.',
        decide:
          'Was verrechnet wird, Arbeitszeiten und Material. Mess- und Prüfprotokolle erstellt weiterhin Ihre Fachperson: Die KI trägt keine Messwerte ein.',
        dataPath: [
          'Handy des Monteurs',
          'Server in der Schweiz: Sprache wird Text',
          'Sprachmodell bei einem Schweizer Anbieter',
          'Rapport ans Büro',
        ],
        dataNote:
          'Die Aufnahmen dienen dem Rapport, nicht der Kontrolle der Mitarbeitenden. Das halten wir im Team schriftlich fest.',
        fit: 'Erster Testlauf: ohne Anbindung, wenn das Büro den Rapport übernimmt; mit Anbindung, wenn er direkt in die Branchensoftware soll.',
      },
      en: {
        tag: 'Example · Electrical installer · 8 people',
        title: 'A voice memo on site becomes a job report',
        today:
          'Five electricians fill in around 30 job reports by hand each week. The office retypes them, deciphers the handwriting and has to ask back on every fifth report.',
        withAi:
          'After the job, the electrician speaks into the phone for a minute or two. That becomes a report in your format, with items from your materials list. Anything unclear is marked. Electrician and office check it, then the office takes the report over.',
        decide:
          'What is billed, working hours and materials. Test and inspection records are still done by your qualified person: the AI never enters measured values.',
        dataPath: [
          "Electrician's phone",
          'Server in Switzerland: speech becomes text',
          'Language model at a Swiss provider',
          'Report to the office',
        ],
        dataNote:
          'The recordings serve the report, not the monitoring of your staff. We put that in writing with the team.',
        fit: 'First trial run: without a connection if the office takes the report over; with a connection if it should go straight into your trade software.',
      },
    },
  },
  {
    // B1: 290 → 116 minutes per week.
    id: 'carpentry',
    hoursBefore: 4.5,
    hoursAfter: 2,
    i18n: {
      de: {
        tag: 'Beispiel · Schreinerei · 6 Personen',
        title: 'Kundenanfrage mit Fotos wird Offertentwurf',
        today:
          'Pro Woche kommen sechs Anfragen per E-Mail, oft mit Handyfotos. Der Inhaber fragt nach fehlenden Massen und schreibt vier Richtofferten selbst, meist am Abend.',
        withAi:
          'Die KI fasst jede Anfrage zusammen, listet, was fehlt, und entwirft die Rückfrage. Für die Offerte schlägt sie Positionen und Texte aus ähnlichen alten Offerten vor. Preise nimmt sie nur aus Ihrer Preisliste, sonst steht im Entwurf «Preis fehlt».',
        decide:
          'Alle Preise und Rabatte, ob es ein Aufmass vor Ort braucht, Termine und ob die Offerte rausgeht. Masse aus Fotos schätzt die KI nicht.',
        dataPath: [
          'Ihr Postfach, z. B. Microsoft 365',
          'Server in der Schweiz',
          'Sprachmodell bei einem Schweizer Anbieter',
          'Entwurf in Ihrem Postfach',
        ],
        dataNote: 'Alte Offerten und die Preisliste liegen auf demselben Server in der Schweiz.',
        fit: 'Erster Testlauf ohne Anbindung. Damit der Umfang überschaubar bleibt, starten wir mit rund 20 Musterofferten statt mit dem ganzen Archiv.',
      },
      en: {
        tag: 'Example · Carpentry workshop · 6 people',
        title: 'A customer enquiry with photos becomes a draft quote',
        today:
          'Six enquiries arrive by email each week, often with phone photos. The owner asks for missing measurements and writes four rough quotes himself, usually in the evening.',
        withAi:
          'The AI summarises each enquiry, lists what is missing and drafts the follow-up question. For the quote it suggests items and wording from similar past quotes. It takes prices only from your price list; otherwise the draft says "price missing".',
        decide:
          'All prices and discounts, whether an on-site measurement is needed, dates and whether the quote goes out. The AI does not estimate measurements from photos.',
        dataPath: [
          'Your mailbox, e.g. Microsoft 365',
          'Server in Switzerland',
          'Language model at a Swiss provider',
          'Draft in your mailbox',
        ],
        dataNote: 'Past quotes and the price list sit on the same server in Switzerland.',
        fit: 'First trial run without a connection. To keep the scope manageable, we start with about 20 sample quotes instead of the whole archive.',
      },
    },
  },
  {
    // B5: 300 → 100 minutes per week.
    id: 'bakery',
    hoursBefore: 5,
    hoursAfter: 2,
    i18n: {
      de: {
        tag: 'Beispiel · Bäckerei-Konditorei · 9 Personen',
        title: 'Bestellungen aus E-Mail, Combox und Formular werden eine Produktionsliste',
        today:
          'Die Bäckerei beliefert 35 Restaurants, Heime und Dorfläden. Änderungen an den Daueraufträgen kommen per E-Mail, Combox und Formular. Die Inhaberin sucht sie jeden Nachmittag zusammen und überträgt sie in den Backzettel.',
        withAi:
          'Die KI sammelt die Bestellungen, ordnet Kunden und Artikel zu und zeigt jede Änderung gegenüber dem Dauerauftrag in einer Tabelle. Mehrdeutiges wie «morgen» oder «wie immer» markiert sie, statt zu raten.',
        decide:
          'Was gebacken wird, Mengen bei Unklarheit und Lieferungen an Feiertagen. Angaben zu Zutaten und Allergenen kommen nur aus Ihrer Rezeptdatenbank, nie von der KI.',
        dataPath: [
          'Postfach, Combox und Bestellformular',
          'Server in der Schweiz',
          'Sprachmodell bei einem Schweizer Anbieter',
          'Tabelle für Ihr Excel',
        ],
        dataNote:
          'Bestellungen per WhatsApp kommen erst später dazu, wenn überhaupt: Sie laufen über Meta in den USA und brauchen einen bewussten Entscheid.',
        fit: 'Erster Testlauf ohne Anbindung, weil die Liste in Ihr Excel kommt. Wir starten mit E-Mail und Formular, die Combox folgt danach.',
      },
      en: {
        tag: 'Example · Bakery and pastry shop · 9 people',
        title: 'Orders from email, voicemail and a web form become one production list',
        today:
          'The bakery supplies 35 restaurants, care homes and village shops. Changes to standing orders arrive by email, voicemail and web form. Every afternoon the owner gathers them and copies them into the baking sheet.',
        withAi:
          'The AI collects the orders, matches customers and products and shows every change against the standing order in one table. It marks anything ambiguous, like "tomorrow" or "as usual", instead of guessing.',
        decide:
          'What gets baked, quantities when something is unclear and deliveries on public holidays. Ingredients and allergens come only from your recipe database, never from the AI.',
        dataPath: [
          'Mailbox, voicemail and order form',
          'Server in Switzerland',
          'Language model at a Swiss provider',
          'Table for your Excel',
        ],
        dataNote:
          'Orders by WhatsApp come later, if at all: they run through Meta in the USA and need a deliberate decision.',
        fit: 'First trial run without a connection, because the list goes into your Excel. We start with email and the form; voicemail follows.',
      },
    },
  },
  {
    // B7: 135 → 55 minutes per week. A custom build does not pay off here.
    id: 'salon',
    hoursBefore: 2,
    hoursAfter: 1,
    i18n: {
      de: {
        tag: 'Beispiel · Coiffeur-Salon · 4 Personen',
        title: 'Combox und Nachrichten werden Antwortvorschläge mit freiem Termin',
        today:
          'Wer die Schere in der Hand hat, nimmt nicht ab. Pro Woche kommen rund 25 Combox-Nachrichten und 30 Nachrichten per WhatsApp, Instagram oder E-Mail, oft am Abend.',
        withAi:
          'Jede Nachricht liegt als Text mit dem Terminwunsch vor. Daneben stehen die passenden freien Termine aus Ihrem Kalender und eine Antwort als Entwurf. Sie senden mit einem Klick.',
        decide:
          'Welcher Termin vergeben wird, Preise und Ausnahmen, Antworten auf Beschwerden. Eingetragen wird ein Termin erst nach der Bestätigung, und zwar von Ihnen.',
        dataPath: [
          'Combox und Nachrichten',
          'KI-Werkzeug in Ihrem Geschäftskonto, z. B. von Microsoft oder Google',
          'Antwortvorschlag',
          'Sie senden',
        ],
        dataNote:
          'Microsoft und Google sind US-Anbieter: nur mit Geschäftskonto, das Training mit Ihren Daten ausschliesst. Angaben zu Allergien oder Hautreaktionen sind Gesundheitsdaten und gehören nie hinein.',
        fit: 'Hier lohnt sich keine eigene Lösung mit Betreuung. Meist reicht eine gute Vorlage im KI-Werkzeug, das Sie schon haben. Ob das bei Ihnen so ist, klären wir im kostenlosen Erstgespräch.',
      },
      en: {
        tag: 'Example · Hair salon · 4 people',
        title: 'Voicemail and messages become reply suggestions with a free slot',
        today:
          'Nobody answers the phone with scissors in hand. Each week brings around 25 voicemails and 30 messages by WhatsApp, Instagram or email, often in the evening.',
        withAi:
          'Each message is there as text with the requested time. Next to it are the matching free slots from your calendar and a draft reply. You send it with one click.',
        decide:
          'Which slot is given, prices and exceptions, replies to complaints. An appointment is entered only after confirmation, and by you.',
        dataPath: [
          'Voicemail and messages',
          'AI tool in your business account, e.g. from Microsoft or Google',
          'Reply suggestion',
          'You send',
        ],
        dataNote:
          'Microsoft and Google are US providers: only with a business account that excludes training on your data. Allergies or skin reactions are health data and never go in.',
        fit: 'A custom solution with ongoing care does not pay off here. A good template in the AI tool you already have is usually enough. Whether that is true for you, we clarify in the free first conversation.',
      },
    },
  },
];
