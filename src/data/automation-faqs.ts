// FAQ catalogue for /automation: ten objections of a construction firm,
// answer first (#145). DE is the target-audience copy, EN a faithful
// translation that names Zurich instead of the Oberland (owner rule
// 2026-11-04). Prices are word for word the price phrases of
// src/data/automation-packages.ts.
// The price FAQ carries `markup: false`: it is visible on the page but left
// out of the FAQPage JSON-LD, so no amount in CHF appears in structured data.
// The page and the tests take the mirrored subset from `faqsForMarkup`.
// Guarded by src/i18n/automationCopy.test.ts.
import type { Locale } from '@/i18n/routing';

export interface AutomationFaq {
  /** Stable click id for analytics (`faq:<id>`, spec 100 §3.3); never the question text. */
  id: string;
  /** `false`: shown on the page, not mirrored into the FAQPage JSON-LD. */
  markup?: false;
  i18n: Record<Locale, { q: string; a: string }>;
}

export const FAQS: AutomationFaq[] = [
  {
    id: 'cost',
    markup: false,
    i18n: {
      de: {
        q: 'Was kostet das?',
        a: "Die Live-Demo ist kostenlos. Die Standortbestimmung kostet CHF 750. Die Einführung kostet CHF 3'900 unter 20 Personen und ab CHF 7'500 ab 20 Personen; ob und wann die zweite Hälfte fällig wird, hängt von der Messung nach 6 Wochen ab. Das Abo kostet CHF 200 pro Monat unter 20 Personen und CHF 500 bis 900 pro Monat ab 20 Personen. «Personen» heisst: alle im Betrieb, Baustelle und Büro zusammen. Lizenzen zahlen Sie selbst, direkt beim Hersteller oder über Ihren IT-Partner; was sie bei Ihnen kosten, steht im Kurzbericht der Standortbestimmung. Fixpreise in Franken.",
      },
      en: {
        q: 'What does it cost?',
        a: "The live demo is free. The assessment costs CHF 750. The rollout costs CHF 3'900 under 20 people and from CHF 7'500 for 20 people or more; whether and when the second half falls due depends on the measurement after 6 weeks. The subscription costs CHF 200 a month under 20 people and CHF 500 to 900 a month for 20 people or more. “People” means everyone at the firm, on site and in the office together. You pay for licences yourself, directly to the vendor or through your IT partner; what they cost you is in the short report of the assessment. Fixed prices in Swiss francs.",
      },
    },
  },
  {
    id: 'fit',
    i18n: {
      de: {
        q: 'Für welche Betriebe ist das gedacht?',
        a: 'Zurzeit vor allem für Bau- und Tiefbaufirmen mit 10 bis 50 Personen im Zürcher Oberland, etwa in Hinwil, Wetzikon, Uster, Rüti, Bubikon oder Pfäffikon ZH. Betriebe aus Handwerk und Gewerbe sind ebenfalls willkommen. Buchhaltung und Treuhand biete ich nicht an.',
      },
      en: {
        q: 'Which firms is this for?',
        a: 'For now, mainly construction and civil engineering firms with 10 to 50 people east of Zurich, for example in Hinwil, Wetzikon, Uster, Rüti, Bubikon or Pfäffikon ZH. Firms from other trades are welcome too. I do not offer bookkeeping or accounting.',
      },
    },
  },
  {
    id: 'buy-self',
    i18n: {
      de: {
        q: 'Warum kaufe ich die Rapport-App nicht einfach selbst?',
        a: 'Das können Sie. Die Lizenz ist schnell gekauft. Die Arbeit ist, dass das Werkzeug auch nach ein paar Wochen noch gebraucht wird. Ich richte es mit Ihren Vorlagen ein, zeige es Ihren Leuten auf der Baustelle und im Büro und messe nach 6 Wochen. Zuerst nutzen wir, was Ihre Bausoftware schon kann. Lizenzen verkaufe ich nicht.',
      },
      en: {
        q: 'Why not just buy the report app myself?',
        a: "You can. The licence is quickly bought. The work is making sure the tool is still used after a few weeks. I set it up with your templates, show it to your people on site and in the office, and measure after 6 weeks. First we use what your construction software can already do. I don't sell licences.",
      },
    },
  },
  {
    id: 'adoption',
    i18n: {
      de: {
        q: 'Was, wenn meine Leute nicht mitmachen?',
        a: 'Tippen müssen sie nicht, nur ins Handy reden. Wir fangen mit den Leuten an, die wollen, am besten im Winter, damit die Poliere es vor dem Saisonstart können. Ob es läuft, zeigt die Messung nach 6 Wochen. Wird das Ziel vom Zielblatt nicht erreicht, begleite ich Sie 4 Wochen weiter, ohne Aufpreis, und so lange wartet die zweite Hälfte der Einführung. Wird das Ziel dann wieder nicht erreicht und haben die vereinbarten Schulungen stattgefunden, entfällt die zweite Hälfte.',
      },
      en: {
        q: "What if my people don't go along with it?",
        a: "They don't have to type, just talk into the phone. We start with the people who want to, ideally in winter, so that the foremen know it before the season starts. The measurement after 6 weeks shows whether it works. If the target on the target sheet is not reached, I support you for 4 more weeks at no extra charge, and until then the second half of the rollout waits. If the target is still not reached and the agreed training took place, the second half is waived.",
      },
    },
  },
  {
    id: 'swiss-german',
    i18n: {
      de: {
        q: 'Versteht eine Rapport-App Schweizerdeutsch?',
        a: 'Einige Hersteller sagen ja. Ob es bei Ihren Leuten, mit Ihren Fachwörtern und Zahlen, auf ihren Handys und mit Baulärm klappt, testen wir in der Standortbestimmung mit echten Aufnahmen. Der Rapport erscheint meist auf Hochdeutsch.',
      },
      en: {
        q: 'Does a report app understand Swiss German?',
        a: 'Some vendors say so. Whether it works with your people, your trade terms and numbers, on their phones and with site noise, we test in the assessment with real recordings. The report usually comes out in standard German.',
      },
    },
  },
  {
    id: 'monitoring',
    i18n: {
      de: {
        q: 'Überwachen Sie damit meine Leute?',
        a: 'Nein. Gezählt wird nur zusammengefasst, zum Beispiel wie viele Rapporte pro Woche per Sprache kamen, nie pro Person. Ihre Leute wissen vorher, was gezählt wird und wozu.',
      },
      en: {
        q: 'Are you monitoring my people with this?',
        a: 'No. Only totals are counted, for example how many reports came in by voice each week, never per person. Your people know beforehand what is counted and why.',
      },
    },
  },
  {
    id: 'data-ch',
    i18n: {
      de: {
        q: 'Bleiben unsere Daten in der Schweiz?',
        a: 'Nicht in jedem Fall, und das sage ich Ihnen vorher. Ob Microsoft Ihre Mails und Dateien in Schweizer Rechenzentren speichert, hängt von Ihrem Konto und einer Einstellung ab; das prüfen wir. Microsoft 365 Copilot verarbeitet Anfragen laut Microsoft in der EU-Datengrenze, zu der die Schweiz gehört. Ausgenommen sind Suchanfragen an Bing bei eingeschalteter Websuche, Modelle von Anthropic in Word, Excel und PowerPoint und das Ausweichen bei Spitzenlast in die USA, nach Kanada oder Australien; die letzten beiden sind bei neueren Konten standardmässig eingeschaltet und lassen sich abschalten. Eine Verarbeitung nur in der Schweiz sichert Microsoft nicht zu. Rapport-Apps sind verschieden: Manche speichern laut Anbieter in der Schweiz, andere in der EU und nutzen KI-Dienste in den USA. Für jedes Werkzeug steht das im Datenblatt.',
      },
      en: {
        q: 'Does our data stay in Switzerland?',
        a: 'Not in every case, and I tell you beforehand. Whether Microsoft stores your email and files in Swiss data centres depends on your account and a setting; we check that. According to Microsoft, Microsoft 365 Copilot processes prompts within the EU Data Boundary, which includes Switzerland. Exceptions are search queries sent to Bing when web search is on, Anthropic models in Word, Excel and PowerPoint, and overflow at peak load to the USA, Canada or Australia; the last two are on by default for newer accounts and can be switched off. Microsoft does not commit to processing in Switzerland only. Report apps differ: according to their vendors, some store data in Switzerland, others in the EU and use AI services in the USA. The data sheet states this for each tool.',
      },
    },
  },
  {
    id: 'copilot-payroll',
    i18n: {
      de: {
        q: 'Findet Microsoft 365 Copilot auch die Lohnliste?',
        a: 'Nur für Personen, die sie heute schon öffnen können. Copilot hält sich an Ihre bestehenden Freigaben. Es findet aber in Sekunden, was irgendwo zu offen abgelegt ist, etwa einen Personalordner, der in Microsoft Teams für alle offen ist. Darum prüfen wir vor dem Start mit den Berichten von Microsoft, wer worauf zugreifen kann, und schränken heikle Ordner ein.',
      },
      en: {
        q: 'Will Microsoft 365 Copilot find the payroll list too?',
        a: "Only for people who can already open it today. Copilot respects your existing permissions. But within seconds it finds whatever is stored too openly somewhere, such as an HR folder that is open to everyone in Microsoft Teams. That is why, before the start, we use Microsoft's reports to check who can access what, and restrict sensitive folders.",
      },
    },
  },
  {
    id: 'access',
    i18n: {
      de: {
        q: 'Welchen Zugang bekommen Sie zu unseren Systemen?',
        a: 'Ein eigenes Konto in Ihrem Microsoft 365, das Sie oder Ihr IT-Partner anlegen und jederzeit sperren können. Es bekommt nur die Rechte, die der jeweilige Schritt braucht. Ich arbeite nie mit Ihrem persönlichen Login. Was ich ändere, steht im Protokoll Ihres Microsoft 365. Kopien Ihrer Daten lege ich nicht auf eigenen Servern ab. Vor dem ersten Zugang schliessen wir einen Vertrag zur Auftragsbearbeitung ab.',
      },
      en: {
        q: 'What access do you get to our systems?',
        a: "An account of my own in your Microsoft 365, which you or your IT partner create and can block at any time. It only gets the rights each step needs. I never work with your personal login. What I change is recorded in your Microsoft 365 log. I don't keep copies of your data on servers of my own. Before the first access, we sign a data processing agreement.",
      },
    },
  },
  {
    id: 'student-time',
    i18n: {
      de: {
        q: 'Sie studieren noch. Haben Sie überhaupt Zeit für uns?',
        a: 'Ja, weil ich sie einteile. Ich betreue eine Einführung nach der anderen, und die Termine bei Ihnen legen wir vor dem Start fest. Auf Anfragen antworte ich spätestens am nächsten Arbeitstag. Und falls ich einmal ausfalle, laufen die Werkzeuge weiter: in Ihren Konten, mit Ihren Lizenzen.',
      },
      en: {
        q: "You're still studying. Do you actually have time for us?",
        a: 'Yes, because I plan for it. I handle one rollout at a time, and we fix the dates at your firm before the start. I reply to enquiries by the next working day at the latest. And if I am ever out of action, the tools keep running: in your accounts, with your licences.',
      },
    },
  },
];

/** The FAQ entries the FAQPage JSON-LD mirrors: all but the price FAQ. */
export function faqsForMarkup(locale: Locale): Array<{ q: string; a: string }> {
  return FAQS.filter((f) => f.markup !== false).map((f) => f.i18n[locale]);
}
