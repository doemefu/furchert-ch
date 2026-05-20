// Bilingual content for the Home stats strip. DE = prototype verbatim
// (pages.jsx PageHome STATS), EN = faithful translation. `value`
// locale-invariant; per-record locale maps (F-Q2).
import type { Locale } from '@/i18n/routing';

export interface HomeStat {
  value: string;
  i18n: Record<Locale, { unit: string; label: string }>;
}

export const HOME_STATS: HomeStat[] = [
  {
    value: '200',
    i18n: {
      de: { unit: 'Mitglieder', label: 'Ruderclub Rapperswil-Jona' },
      en: { unit: 'Members', label: 'Rapperswil-Jona Rowing Club' },
    },
  },
  {
    value: '1500+',
    i18n: {
      de: { unit: 'Athleten', label: 'Nationale Regatta Schmerikon 2026' },
      en: { unit: 'Athletes', label: 'National Regatta Schmerikon 2026' },
    },
  },
  {
    value: '4',
    i18n: {
      de: { unit: 'Nodes', label: 'Homelab k3s-Cluster' },
      en: { unit: 'Nodes', label: 'Homelab k3s cluster' },
    },
  },
];
