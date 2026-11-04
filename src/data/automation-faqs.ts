// FAQ catalogue for /automation. Reworked for the SME offer (Zürcher
// Oberland); DE is the target-audience copy, EN a faithful translation that
// names Zurich instead of the Oberland (owner rule 2026-11-04).
// Prices only as the owner approved them on 2026-11-03; the FAQPage JSON-LD
// mirrors these answers word for word (guarded by
// src/i18n/automationCopy.test.ts).
// Per-record locale map (worklog F-Q2; Phase-2 D1 shape).
import type { Locale } from '@/i18n/routing';

export interface AutomationFaq {
  i18n: Record<Locale, { q: string; a: string }>;
}

export const FAQS: AutomationFaq[] = [
  {
    i18n: {
      de: {
        q: 'Für welche Betriebe ist das gedacht?',
        a: 'Für kleine und mittlere Betriebe im Zürcher Oberland aus Dienstleistung, Handwerk und Produktion. Typisch sind Abläufe rund um Anfragen, Aufträge, Rapporte und Dokumentation. Buchhaltung und Treuhand sind nicht mein Gebiet.',
      },
      en: {
        q: 'Who is this for?',
        a: 'Small and medium-sized businesses around Zurich from services, trades and production. Typical examples are processes around enquiries, orders, reports and documentation. Accounting and bookkeeping are not my field.',
      },
    },
  },
  {
    i18n: {
      de: {
        q: 'Was kostet das?',
        a: "Das Erstgespräch ist kostenlos. Der KI-Kurzcheck vor Ort kostet CHF 600; bestellen Sie innert 3 Monaten einen Testlauf, wird der Betrag voll angerechnet. Ein erster Testlauf mit einem Ablauf kostet ab CHF 2'500, mit Anbindung an Ihre Branchensoftware ab CHF 6'000. Die KI-Betreuung kostet ab CHF 190 pro Monat und ist monatlich kündbar. Die KI-Werkstatt fürs Team kostet CHF 1'500. Keine Mehrwertsteuer, da nicht mehrwertsteuerpflichtig. Den genauen Preis erhalten Sie vorab schriftlich in der Offerte.",
      },
      en: {
        q: 'What does it cost?',
        a: "The initial consultation is free. The on-site AI quick check costs CHF 600; if you order a trial run within 3 months, the full amount is credited. A first trial run with one process costs from CHF 2'500, or from CHF 6'000 with a connection to your trade software. Ongoing AI care costs from CHF 190 a month and can be cancelled monthly. The AI workshop for your team costs CHF 1'500. No VAT is charged, as I am not registered for VAT. You receive the exact price in writing in the quote beforehand.",
      },
    },
  },
  {
    i18n: {
      de: {
        q: 'Lohnt sich das für einen kleinen Betrieb?',
        a: 'Nicht immer. Spart ein Ablauf weniger als etwa eine Stunde pro Woche, deckt der Nutzen die Kosten der Betreuung kaum. Damit sich im ersten Jahr auch der Testlauf bezahlt macht, braucht es eher zwei Stunden pro Woche (Schätzung). Für Betriebe mit ein bis vier Personen reicht oft eine Vorlage im KI-Werkzeug, das Sie schon haben. Das sage ich Ihnen im Erstgespräch offen.',
      },
      en: {
        q: 'Is it worth it for a small business?',
        a: 'Not always. If a process saves less than about one hour a week, the benefit barely covers the cost of ongoing care. For the trial run to pay for itself within the first year as well, it takes closer to two hours a week (estimate). For businesses of one to four people, a template in the AI tool you already have is often enough. I will tell you that plainly in the initial consultation.',
      },
    },
  },
  {
    i18n: {
      de: {
        q: 'Muss ich meine Software ersetzen?',
        a: 'In der Regel nicht. Ich baue auf dem auf, was Sie schon nutzen: Branchensoftware, ERP, Excel oder E-Mail.',
      },
      en: {
        q: 'Do I have to replace my software?',
        a: 'Usually not. I build on what you already use: trade software, ERP, Excel or email.',
      },
    },
  },
  {
    i18n: {
      de: {
        q: 'Gibt es dafür nicht fertige Programme?',
        a: 'Für manche Abläufe schon, zum Beispiel Apps für Baurapporte oder die Erinnerungen in Ihrer Branchensoftware. Was Ihre Software schon kann, baue ich nicht nach. Wo ein fertiges Programm oder Ihr vorhandenes Werkzeug reicht, empfehle ich es.',
      },
      en: {
        q: "Aren't there ready-made programs for this?",
        a: 'For some processes, yes: for example apps for site reports, or the reminders in your trade software. I do not rebuild what your software already does. Where a ready-made program or the tool you already have is enough, I recommend it.',
      },
    },
  },
  {
    i18n: {
      de: {
        q: 'Was passiert mit meinen Daten?',
        a: 'Ich arbeite nach den Grundsätzen des nDSG: Verarbeitung wo immer möglich in der Schweiz oder der EU, sensible Daten nur bei Schweizer Anbietern oder bei Ihnen im Betrieb. Ob und wo ein externer KI-Dienst zum Einsatz kommt, legen wir vorab schriftlich fest, nie ohne Ihr Einverständnis.',
      },
      en: {
        q: 'What happens to my data?',
        a: 'I work according to the principles of the Swiss Federal Act on Data Protection (FADP, German: nDSG): processing in Switzerland or the EU wherever possible, sensitive data only with Swiss providers or on your own premises. Whether and where an external AI service is used is agreed in writing beforehand, never without your consent.',
      },
    },
  },
  {
    i18n: {
      de: {
        q: 'Brauche ich technisches Wissen?',
        a: 'Nein. Sie erklären mir Ihren Ablauf, ich kümmere mich um die Technik. Für einen Testlauf brauchen Sie aber etwas eigene Zeit, geschätzt 3 bis 6 Stunden: für Beispiele aus Ihrem Alltag, die Einführung und den Test.',
      },
      en: {
        q: 'Do I need technical knowledge?',
        a: 'No. You explain your process; I take care of the technology. A trial run does need some of your own time, an estimated 3 to 6 hours: for examples from your day-to-day work, the introduction and the test.',
      },
    },
  },
  {
    i18n: {
      de: {
        q: 'Was, wenn es nicht funktioniert?',
        a: 'Wir starten klein, mit einem einzigen Ablauf. Besteht er die vorab schriftlich vereinbarten Testfälle auch nach zwei Anpassungsrunden nicht, entfällt die letzte Zahlung. Mit Anbindung an Ihre Branchensoftware prüfen wir zuerst die Schnittstelle; danach können Sie aussteigen und bezahlen nur diesen ersten Schritt. Die Zahlungsschritte stehen in der Offerte. Nach dem Test entscheiden Sie, ob die Lösung bleibt; eine Betreuung müssen Sie nicht bestellen.',
      },
      en: {
        q: "What if it doesn't work?",
        a: 'We start small, with a single process. If it still fails the test cases agreed in writing beforehand after two rounds of adjustments, you do not pay the last instalment. With a connection to your trade software, we first test the interface; after that you can stop and pay only for that first step. The payment steps are set out in the quote. After the test you decide whether the solution stays; you do not have to order ongoing care.',
      },
    },
  },
];
