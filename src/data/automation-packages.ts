// Packages and prices for /automation. Prices are the owner's decision of
// 2026-11-03 ("Vorschlag so zeigen"); inclusions and exclusions follow the
// package cards of his business case, including the server cost cap of the
// care (owner, 2026-11-04). Deliberately not shown: durations or
// deadlines (the schedule goes into each quote), hourly rates, a second care
// tier and any price not listed below. Guarded by
// src/i18n/automationCopy.test.ts. Prices without VAT: the owner is not
// registered for VAT, and the page says so in that wording.
import type { Locale } from '@/i18n/routing';

export interface PackageCopy {
  name: string;
  /** Approved price phrase, e.g. "ab CHF 2'500". */
  price: string;
  priceNote?: string;
  /** Set for steps a customer may skip. */
  optional?: string;
  summary: string;
  includes: string[];
  excludes?: string;
  /** Credit towards a trial run, with its time window. */
  credit?: string;
}

export interface AutomationPackage {
  id: 'first-call' | 'quick-check' | 'trial' | 'care' | 'workshop';
  i18n: Record<Locale, PackageCopy>;
}

// The steps in the order a customer goes through them.
export const PRICE_STEPS: AutomationPackage[] = [
  {
    id: 'first-call',
    i18n: {
      de: {
        name: 'Erstgespräch',
        price: 'kostenlos',
        summary:
          '30 bis 45 Minuten, vor Ort im Zürcher Oberland oder per Video. Sie erzählen, wo im Alltag Zeit verloren geht. Ich sage Ihnen offen, ob KI dort etwas bringt.',
        includes: [],
      },
      en: {
        name: 'Initial consultation',
        price: 'free',
        summary:
          '30 to 45 minutes, on site around Zurich or by video. You tell me where time gets lost in your day. I will tell you plainly whether AI helps there.',
        includes: [],
      },
    },
  },
  {
    id: 'quick-check',
    i18n: {
      de: {
        name: 'KI-Kurzcheck',
        price: 'CHF 600',
        optional: 'Optional',
        summary:
          'Für alle, die sich noch nichts Konkretes vorstellen können: Sie sehen an einem eigenen Dokument, was KI daraus macht. Ist nach dem Erstgespräch klar, was Sie brauchen, erhalten Sie direkt die Offerte.',
        includes: [
          '2 Stunden bei Ihnen vor Ort: Wir schauen ein bis zwei Abläufe am Arbeitsplatz an.',
          'Ein Musterbeispiel: ein echtes Dokument Ihres Betriebs, mit KI bearbeitet, als Vorher-nachher.',
          'Ein Kurzbericht von 2 bis 3 Seiten: geeignete Abläufe, grobe Zeitersparnis mit Ihren Zahlen und welche Daten wohin dürfen.',
          'Eine Offerte mit Fixpreis für den Testlauf und 30 Minuten Besprechung per Video.',
        ],
        excludes: 'Nicht enthalten: eine laufende Lösung, Lizenzen, eine rechtliche Prüfung.',
        credit: 'Bestellen Sie innert 3 Monaten einen Testlauf, wird der Betrag voll angerechnet.',
      },
      en: {
        name: 'AI quick check',
        price: 'CHF 600',
        optional: 'Optional',
        summary:
          'For anyone who cannot yet picture it: you see what AI does with one of your own documents. If it is clear after the initial consultation what you need, you get the quote straight away.',
        includes: [
          '2 hours on site: we look at one or two processes at the workplace.',
          'A sample: a real document from your business, processed with AI, as before and after.',
          'A short report of 2 to 3 pages: suitable processes, a rough time saving based on your figures and which data may go where.',
          'A fixed-price quote for the trial run and a 30-minute video call to discuss it.',
        ],
        excludes: 'Not included: a running solution, licences, a legal review.',
        credit: 'If you order a trial run within 3 months, the full amount is credited.',
      },
    },
  },
  {
    id: 'trial',
    i18n: {
      de: {
        name: 'Erster Testlauf',
        price: "ab CHF 2'500",
        priceNote: "Mit Anbindung an Ihre Branchensoftware ab CHF 6'000.",
        summary: 'Ein einziger Ablauf wird eingerichtet und im Alltag Ihres Betriebs getestet.',
        includes: [
          'Ziele und Testfälle schriftlich, bevor es losgeht: echte Beispiele, an denen wir messen, ob es funktioniert.',
          'Aufbau bei Ihnen oder auf einem Server in der Schweiz.',
          '1 Stunde Einführung, dann 4 Wochen Testbetrieb (mit Anbindung bis 6 Wochen) mit bis zu 2 Anpassungsrunden.',
          'Messung vorher und nachher: Zeit pro Fall.',
          'Ein Datenblatt: welche Dienste im Einsatz sind und wo die Daten verarbeitet werden.',
          'Anleitung und Export der Lösung, damit Sie nicht an mich gebunden sind.',
          'Mit Anbindung in zwei Stufen: Zuerst prüfen wir die Schnittstelle mit 20 echten Dokumenten aus Ihrem Alltag. Dann entscheiden Sie, ob angebunden wird.',
        ],
        excludes:
          'Nicht enthalten: mehr als ein Ablauf, Lizenzen, die Nutzung des KI-Dienstes, das Bereinigen Ihrer Daten, allfällige Gebühren Ihres Softwareherstellers für die Schnittstelle, Rechtsberatung und der Betrieb nach dem Test.',
      },
      en: {
        name: 'First trial run',
        price: "from CHF 2'500",
        priceNote: "With a connection to your trade software from CHF 6'000.",
        summary: 'One single process is set up and tested in your day-to-day work.',
        includes: [
          'Goals and test cases in writing before we start: real examples we use to check that it works.',
          'Set up on your systems or on a server in Switzerland.',
          'A 1-hour introduction, then a 4-week trial period (up to 6 weeks with a connection) with up to 2 rounds of adjustments.',
          'Measured before and after: time per case.',
          'A data sheet: which services are used and where the data is processed.',
          'Instructions and an export of the solution, so you are not tied to me.',
          'With a connection, in two stages: first we test the interface with 20 real documents from your day-to-day work. Then you decide whether we connect it.',
        ],
        excludes:
          'Not included: more than one process, licences, use of the AI service, cleaning up your data, any fees your software vendor charges for the interface, legal advice and operation after the trial.',
      },
    },
  },
  {
    id: 'care',
    i18n: {
      de: {
        name: 'KI-Betreuung',
        price: 'ab CHF 190 pro Monat',
        priceNote: 'Monatlich kündbar.',
        optional: 'Optional',
        summary:
          'Damit der Ablauf weiterläuft, wenn sich Software oder KI-Dienste ändern. Sie beginnt erst nach dem Testbetrieb und kostet keine Einrichtungsgebühr.',
        includes: [
          'Server in der Schweiz für diesen Ablauf, Kosten bis CHF 40 pro Monat inbegriffen, oder Überwachung in Ihrer Umgebung.',
          'Überwachung mit Alarm bei Fehlern, Updates und eine tägliche Sicherung.',
          'Anpassung an Änderungen der Anbieter, bis 1 Stunde pro Monat.',
          'Kontrolle der Kosten für den KI-Dienst und ein Vertrag zur Auftragsbearbeitung.',
          'Reaktion am nächsten Arbeitstag: eine Reaktionszeit, keine Zusage, wann ein Fehler behoben ist.',
        ],
        excludes:
          'Nicht enthalten: neue Funktionen, die Nutzung des KI-Dienstes, Lizenzen, allgemeiner IT-Support, Bereitschaft rund um die Uhr.',
      },
      en: {
        name: 'Ongoing AI care',
        price: 'from CHF 190 a month',
        priceNote: 'Cancellable monthly.',
        optional: 'Optional',
        summary:
          'So the process keeps running when software or AI services change. It starts only after the trial period and has no set-up fee.',
        includes: [
          'A server in Switzerland for this process, with costs up to CHF 40 a month included, or monitoring on your own systems.',
          'Monitoring with alerts on errors, updates and a daily backup.',
          'Adjustments to changes by the providers, up to 1 hour a month.',
          'Cost control for the AI service and a data processing agreement.',
          'A response by the next working day: a response time, not a promise of when a fault will be fixed.',
        ],
        excludes:
          'Not included: new features, use of the AI service, licences, general IT support, round-the-clock standby.',
      },
    },
  },
];

// Offered on request next to the steps.
export const PRICE_ADDON: AutomationPackage = {
  id: 'workshop',
  i18n: {
    de: {
      name: 'KI-Werkstatt fürs Team',
      price: "CHF 1'500",
      summary:
        'Ein halber Tag bei Ihnen vor Ort, für bis zu 10 Personen. Passt, wenn in Ihrem Team schon einzelne Leute ChatGPT oder ähnliche Programme nutzen.',
      includes: [
        'Die Mitarbeitenden lösen eigene Aufgaben mit KI, zum Beispiel eine Offerte formulieren, einen Rapport aus Stichworten schreiben oder einen Text übersetzen.',
        'Regeln für die KI-Nutzung in Ihrem Betrieb, auf 1 bis 2 Seiten.',
        'Vorlagen für die 3 bis 5 häufigsten Aufgaben.',
      ],
      excludes: 'Nicht enthalten: Lizenzen, eine rechtliche Prüfung dieser Regeln.',
      credit: 'CHF 500 werden angerechnet, wenn Sie innert 3 Monaten einen Testlauf bestellen.',
    },
    en: {
      name: 'AI workshop for your team',
      price: "CHF 1'500",
      summary:
        'Half a day on site, for up to 10 people. A good fit when some people in your team already use ChatGPT or similar tools.',
      includes: [
        'Your staff solve their own tasks with AI, for example wording a quote, writing a report from notes or translating a text.',
        'An AI use policy for your business, 1 to 2 pages.',
        'Templates for the 3 to 5 most common tasks.',
      ],
      excludes: 'Not included: licences, a legal review of the policy.',
      credit: 'CHF 500 is credited if you order a trial run within 3 months.',
    },
  },
};
