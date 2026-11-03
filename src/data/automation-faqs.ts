// FAQ catalogue for /automation. Reworked for the SME offer (Zürcher
// Oberland); DE is the target-audience copy, EN a faithful translation.
// No prices or rates here (guarded by src/i18n/automationCopy.test.ts).
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
        a: 'Small and medium-sized businesses in the Zürcher Oberland from services, trades and production. Typical examples are processes around enquiries, orders, reports and documentation. Accounting and bookkeeping are not my field.',
      },
    },
  },
  {
    i18n: {
      de: {
        q: 'Was kostet das?',
        a: 'Das hängt vom Ablauf ab. Das Erstgespräch ist kostenlos und unverbindlich. Danach erhalten Sie eine schriftliche Offerte mit Aufwand und Kosten, bevor etwas beginnt.',
      },
      en: {
        q: 'What does it cost?',
        a: 'That depends on the process. The first conversation is free and without obligation. After that you receive a written quote with effort and cost before anything starts.',
      },
    },
  },
  {
    i18n: {
      de: {
        q: 'Muss ich meine Software ersetzen?',
        a: 'In der Regel nicht. Ich baue auf dem auf, was Sie schon nutzen — Branchensoftware, ERP, Excel oder E-Mail.',
      },
      en: {
        q: 'Do I have to replace my software?',
        a: 'Usually not. I build on what you already use — industry software, ERP, Excel or email.',
      },
    },
  },
  {
    i18n: {
      de: {
        q: 'Was passiert mit meinen Daten?',
        a: 'Ich arbeite nach den Grundsätzen des nDSG: Verarbeitung wo immer möglich in der Schweiz oder der EU, sensible Daten nur bei Schweizer Anbietern oder bei Ihnen im Betrieb. Ob und wo ein externer KI-Dienst zum Einsatz kommt, legen wir vorab schriftlich fest — nie ohne Ihr Einverständnis.',
      },
      en: {
        q: 'What happens to my data?',
        a: 'I work according to the principles of the Swiss Federal Act on Data Protection (FADP, German: nDSG): processing in Switzerland or the EU wherever possible, sensitive data only with Swiss providers or on your own premises. Whether and where an external AI service is used is agreed in writing beforehand — never without your consent.',
      },
    },
  },
  {
    i18n: {
      de: {
        q: 'Brauche ich technisches Wissen?',
        a: 'Nein. Sie erklären mir Ihren Ablauf. Ich kümmere mich um die Technik.',
      },
      en: {
        q: 'Do I need technical knowledge?',
        a: 'No. You explain your process. I take care of the technology.',
      },
    },
  },
  {
    i18n: {
      de: {
        q: 'Was, wenn es nicht funktioniert?',
        a: 'Wir starten klein, mit einem einzigen Ablauf. Nach dem Testlauf entscheiden Sie, ob es weitergeht. Was der Testlauf kostet und was danach gilt, steht vorab in der Offerte.',
      },
      en: {
        q: "What if it doesn't work?",
        a: 'We start small, with a single process. After the trial run you decide whether to continue. What it costs and what happens next is set out in the quote beforehand.',
      },
    },
  },
];
