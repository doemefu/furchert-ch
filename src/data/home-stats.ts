// Bilingual content for the Home stats strip. Refilled in the copy pass
// (#160): no longer the prototype's verbatim stats. `value`
// locale-invariant; per-record locale maps (F-Q2).
import type { Locale } from '@/i18n/routing';

export interface HomeStat {
  value: string;
  i18n: Record<Locale, { unit: string; label: string }>;
}

export const HOME_STATS: HomeStat[] = [
  {
    value: '6',
    i18n: {
      de: { unit: 'Wochen', label: 'bis zur Messung, ob genutzt wird' },
      en: { unit: 'Weeks', label: 'until we measure whether it is used' },
    },
  },
  {
    value: "~1'500",
    i18n: {
      de: { unit: 'Athleten', label: 'Chef Sicherheit, Regatta Schmerikon 2026' },
      en: { unit: 'Athletes', label: 'Head of safety, Schmerikon regatta 2026' },
    },
  },
  {
    value: '~200',
    i18n: {
      de: { unit: 'Mitglieder', label: 'als Präsident, Ruderclub Rapperswil-Jona' },
      en: { unit: 'Members', label: 'as president, Rapperswil-Jona Rowing Club' },
    },
  },
];
