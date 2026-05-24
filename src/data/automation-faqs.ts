// FAQ catalogue for /automation. DE = prototype verbatim
// (pages.jsx:452-456). EN = faithful translation. Per-record locale map
// (worklog F-Q2; Phase-2 D1 shape).
import type { Locale } from '@/i18n/routing';

export interface AutomationFaq {
  i18n: Record<Locale, { q: string; a: string }>;
}

export const FAQS: AutomationFaq[] = [
  {
    i18n: {
      de: {
        q: 'Was kostet das?',
        a: "Ein Prozess-Scan (Halbtag bei Ihnen) kostet CHF 1'500–2'500. Eine Workflow-Automation liegt bei CHF 5'000–15'000, je nach Komplexität. Laufende Betreuung ab CHF 500/Monat.",
      },
      en: {
        q: 'What does it cost?',
        a: 'A process scan (half a day on site) costs CHF 1,500–2,500. A workflow automation runs CHF 5,000–15,000 depending on complexity. Ongoing support starts at CHF 500/month.',
      },
    },
  },
  {
    i18n: {
      de: {
        q: 'Muss ich mein ERP ersetzen?',
        a: 'Nein. Ich ergänze Ihre bestehenden Systeme — egal ob Abacus, SAP Business One oder Excel. Die Automation arbeitet mit dem was da ist.',
      },
      en: {
        q: 'Do I have to replace my ERP?',
        a: 'No. I extend your existing systems — whether Abacus, SAP Business One or Excel. The automation works with what you already have.',
      },
    },
  },
  {
    i18n: {
      de: {
        q: 'Wie sicher sind meine Daten?',
        a: 'Alle Tools laufen auf Schweizer Servern oder in Ihrer eigenen Infrastruktur. Keine Daten gehen in eine US-Cloud, es sei denn Sie wollen das explizit.',
      },
      en: {
        q: 'How secure is my data?',
        a: 'All tools run on Swiss servers or in your own infrastructure. No data leaves for a US cloud unless you explicitly want that.',
      },
    },
  },
  {
    i18n: {
      de: {
        q: 'Was passiert wenn es nicht funktioniert?',
        a: 'Nach dem Prototyp (Woche 2) entscheiden Sie: Weiter oder Stopp. Wenn der Prototyp nicht überzeugt, zahlen Sie nur den Analyseaufwand.',
      },
      en: {
        q: "What happens if it doesn't work?",
        a: "After the prototype (week 2) you decide: continue or stop. If the prototype doesn't convince you, you only pay for the analysis effort.",
      },
    },
  },
  {
    i18n: {
      de: {
        q: 'Brauche ich technisches Wissen?',
        a: 'Nein. Sie erklären mir Ihren Prozess. Ich kümmere mich um die Technik.',
      },
      en: {
        q: 'Do I need technical knowledge?',
        a: 'No. You explain your process. I take care of the technology.',
      },
    },
  },
];
