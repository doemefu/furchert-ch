// Before/after example for /automation (stub; content follows).
import type { Locale } from '@/i18n/routing';

export interface ExampleLine {
  text: string;
  check?: string;
}

export interface ExampleField {
  label: string;
  lines: ExampleLine[];
}

export interface AutomationExampleCopy {
  tag: string;
  inputTitle: string;
  input: string;
  outputTitle: string;
  fields: ExampleField[];
  after: string;
}

export const EXAMPLE: { i18n: Record<Locale, AutomationExampleCopy> } = {
  i18n: {
    de: { tag: '', inputTitle: '', input: '', outputTitle: '', fields: [], after: '' },
    en: { tag: '', inputTitle: '', input: '', outputTitle: '', fields: [], after: '' },
  },
};
