import { describe, expect, it } from 'vitest';
import de from './messages/de.json';
import en from './messages/en.json';
import { FAQS } from '@/data/automation-faqs';

// Copy guardrails for the public /automation page (SME offer). The owner
// approves wording; these tests keep three standing rules from regressing:
// both locales carry the same keys, no prices or rates are published, and
// no customer-network or invented-reference wording slips in.
const flatten = (value: unknown, prefix = ''): Record<string, string> =>
  Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>(
    (acc, [key, v]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof v === 'string') acc[path] = v;
      else Object.assign(acc, flatten(v, path));
      return acc;
    },
    {},
  );

const deAutomation = flatten(de.pages.automation);
const enAutomation = flatten(en.pages.automation);
const faqText = FAQS.flatMap((f) => [
  f.i18n.de.q,
  f.i18n.de.a,
  f.i18n.en.q,
  f.i18n.en.a,
]);
const allCopy = [
  ...Object.values(deAutomation),
  ...Object.values(enAutomation),
  ...faqText,
  de.teasers.automation.text,
  en.teasers.automation.text,
];

describe('automation page copy', () => {
  it('has identical message keys in DE and EN', () => {
    expect(Object.keys(enAutomation).sort()).toEqual(Object.keys(deAutomation).sort());
  });

  it('has no empty message values', () => {
    for (const value of [...Object.values(deAutomation), ...Object.values(enAutomation)]) {
      expect(value.trim()).not.toBe('');
    }
  });

  it('does not publish prices or rates', () => {
    for (const text of allCopy) {
      expect(text).not.toMatch(/\bCHF\b|\bFr\.\s*\d|\bEUR\b|€|\$/i);
      expect(text).not.toMatch(/\d\s*(\/|pro|per)\s*(h|std|stunde|hour|monat|month)\b/i);
    }
  });

  it('does not mention customers, references or the fire brigade', () => {
    for (const text of allCopy) {
      expect(text).not.toMatch(/feuerwehr|firefight|fire brigade|fire department/i);
      expect(text).not.toMatch(/referenz|reference|testimonial|kundenstimme|zufriedene/i);
    }
  });

  it('has the same number of FAQ entries with both locales filled', () => {
    expect(FAQS.length).toBeGreaterThan(0);
    for (const faq of FAQS) {
      expect(faq.i18n.de.q).not.toBe('');
      expect(faq.i18n.de.a).not.toBe('');
      expect(faq.i18n.en.q).not.toBe('');
      expect(faq.i18n.en.a).not.toBe('');
    }
  });
});
