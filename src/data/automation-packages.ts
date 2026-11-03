// Packages and prices for /automation (stub; content follows).
import type { Locale } from '@/i18n/routing';

export interface PackageCopy {
  name: string;
  price: string;
  priceNote?: string;
  optional?: string;
  summary: string;
  includes: string[];
  excludes?: string;
  credit?: string;
}

export interface AutomationPackage {
  id: 'first-call' | 'quick-check' | 'trial' | 'care' | 'workshop';
  i18n: Record<Locale, PackageCopy>;
}

export const PRICE_STEPS: AutomationPackage[] = [];

export const PRICE_ADDON: AutomationPackage = {
  id: 'workshop',
  i18n: {
    de: { name: '', price: '', summary: '', includes: [] },
    en: { name: '', price: '', summary: '', includes: [] },
  },
};
