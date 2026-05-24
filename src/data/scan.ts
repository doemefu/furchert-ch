// MOCKUP DATA — question catalog and role list for the /automation/scan
// visual mockup. DE = spec §2.8.3/§2.8.4 verbatim, EN = faithful
// translation. Per-record locale maps; option `id`s are stable across
// locales (worklog F-Q3) so wizard answers survive a mid-flow locale
// switch.
//
// This file is real typed data used by a mock UI. The illustrative
// "sample report" content lives next to the route at
// `src/app/[locale]/automation/scan/_demo-report.ts` (F-Q1).
//
// CLAUDE.md "Automation = mockup": the wizard renders this catalog
// purely client-side. No data leaves the browser.
//
// Types use `as const satisfies readonly …[]` so the literal option /
// question / role `id` strings flow into the derived union types
// below. A typo in any wizard callsite (`answers['compny_size']`,
// `contact.role = 'cto'`) is therefore a compile error, not a silent
// runtime miss.
import type { Locale } from '@/i18n/routing';

export interface ScanOption {
  id: string;
  i18n: Record<Locale, { label: string }>;
}

// Discriminated on `type`: `single` / `multi` MUST carry `options`,
// `textarea` MUST NOT. Previously `options` was an unconstrained
// optional, which let a textarea question silently ship an unused
// options array (or a select question silently ship none).
export type ScanQuestion =
  | {
      id: string;
      type: 'single' | 'multi';
      optional?: boolean;
      i18n: Record<Locale, { text: string; placeholder?: string }>;
      options: readonly ScanOption[];
    }
  | {
      id: string;
      type: 'textarea';
      optional?: boolean;
      i18n: Record<Locale, { text: string; placeholder?: string }>;
    };

export const SCAN_QUESTIONS = [
  {
    id: 'company_size',
    type: 'single',
    i18n: {
      de: { text: 'Wie viele Mitarbeitende hat Ihr Betrieb?' },
      en: { text: 'How many employees does your business have?' },
    },
    options: [
      { id: '1-10', i18n: { de: { label: '1–10' }, en: { label: '1–10' } } },
      { id: '11-30', i18n: { de: { label: '11–30' }, en: { label: '11–30' } } },
      { id: '31-80', i18n: { de: { label: '31–80' }, en: { label: '31–80' } } },
      { id: '81-200', i18n: { de: { label: '81–200' }, en: { label: '81–200' } } },
      { id: '200+', i18n: { de: { label: 'Über 200' }, en: { label: 'More than 200' } } },
    ],
  },
  {
    id: 'order_intake',
    type: 'single',
    i18n: {
      de: { text: 'Wie kommen Kundenbestellungen bei Ihnen an?' },
      en: { text: 'How do customer orders reach you?' },
    },
    options: [
      { id: 'email', i18n: { de: { label: 'Per E-Mail (Freitext, PDF oder Excel)' }, en: { label: 'By email (free text, PDF or Excel)' } } },
      { id: 'phone-fax', i18n: { de: { label: 'Per Telefon oder Fax' }, en: { label: 'By phone or fax' } } },
      { id: 'online', i18n: { de: { label: 'Über ein Online-Formular / Webshop' }, en: { label: 'Via an online form / webshop' } } },
      { id: 'erp-edi', i18n: { de: { label: 'Direkt im ERP (EDI, automatisiert)' }, en: { label: 'Directly into the ERP (EDI, automated)' } } },
      { id: 'mixed', i18n: { de: { label: 'Gemischt' }, en: { label: 'Mixed' } } },
    ],
  },
  {
    id: 'systems_used',
    type: 'multi',
    i18n: {
      de: { text: 'Welche Software-Systeme nutzen Sie im Tagesgeschäft?' },
      en: { text: 'Which software systems do you use day-to-day?' },
    },
    options: [
      { id: 'erp', i18n: { de: { label: 'ERP (z.B. Abacus, SAP Business One, Sage)' }, en: { label: 'ERP (e.g. Abacus, SAP Business One, Sage)' } } },
      { id: 'accounting', i18n: { de: { label: 'Buchhaltungssoftware' }, en: { label: 'Accounting software' } } },
      { id: 'spreadsheet', i18n: { de: { label: 'Excel / Google Sheets für Planung' }, en: { label: 'Excel / Google Sheets for planning' } } },
      { id: 'email', i18n: { de: { label: 'E-Mail (Outlook, Gmail)' }, en: { label: 'Email (Outlook, Gmail)' } } },
      { id: 'industry-software', i18n: { de: { label: 'Branchenspezifische Software (CAD, MES, LIMS, etc.)' }, en: { label: 'Industry-specific software (CAD, MES, LIMS, etc.)' } } },
      { id: 'paper', i18n: { de: { label: 'Papierbasierte Prozesse' }, en: { label: 'Paper-based processes' } } },
    ],
  },
  {
    id: 'manual_pain',
    type: 'multi',
    i18n: {
      de: { text: 'Bei welchen Aufgaben verbringen Sie oder Ihre Mitarbeitenden am meisten Zeit mit manueller Arbeit?' },
      en: { text: 'Which tasks consume the most manual time from you or your team?' },
    },
    options: [
      { id: 'doc-typing', i18n: { de: { label: 'Daten von Dokumenten (Rechnungen, Lieferscheine) abtippen' }, en: { label: 'Re-typing data from documents (invoices, delivery notes)' } } },
      { id: 'sys-transfer', i18n: { de: { label: 'Informationen zwischen Systemen übertragen (z.B. E-Mail → ERP)' }, en: { label: 'Transferring information between systems (e.g. email → ERP)' } } },
      { id: 'reports', i18n: { de: { label: 'Berichte und Protokolle manuell erstellen' }, en: { label: 'Producing reports and minutes by hand' } } },
      { id: 'quote-handling', i18n: { de: { label: 'Kundenanfragen / Offerten manuell bearbeiten' }, en: { label: 'Handling customer enquiries / quotations manually' } } },
      { id: 'prod-planning', i18n: { de: { label: 'Produktionsplanung per Excel oder Whiteboard' }, en: { label: 'Production planning via Excel or whiteboard' } } },
      { id: 'quality-docs', i18n: { de: { label: 'Qualitätsdokumentation von Hand erstellen' }, en: { label: 'Hand-producing quality documentation' } } },
      { id: 'supplier-followup', i18n: { de: { label: 'Lieferanten nachfassen (Status, Termine)' }, en: { label: 'Following up with suppliers (status, deadlines)' } } },
      { id: 'other', i18n: { de: { label: 'Anderes' }, en: { label: 'Other' } } },
    ],
  },
  {
    id: 'time_spent',
    type: 'single',
    i18n: {
      de: { text: 'Wie viele Stunden pro Woche schätzen Sie, gehen in Ihrem Betrieb für solche manuellen Übertragungen und Routineaufgaben verloren?' },
      en: { text: 'How many hours per week do you estimate are lost to manual transfers and routine tasks in your company?' },
    },
    options: [
      { id: '<5', i18n: { de: { label: 'Weniger als 5 Stunden' }, en: { label: 'Less than 5 hours' } } },
      { id: '5-10', i18n: { de: { label: '5–10 Stunden' }, en: { label: '5–10 hours' } } },
      { id: '10-20', i18n: { de: { label: '10–20 Stunden' }, en: { label: '10–20 hours' } } },
      { id: '20-40', i18n: { de: { label: '20–40 Stunden' }, en: { label: '20–40 hours' } } },
      { id: '>40', i18n: { de: { label: 'Mehr als 40 Stunden' }, en: { label: 'More than 40 hours' } } },
      { id: 'unknown', i18n: { de: { label: 'Keine Ahnung, aber es nervt' }, en: { label: "No idea, but it's annoying" } } },
    ],
  },
  {
    id: 'previous_attempts',
    type: 'single',
    i18n: {
      de: { text: 'Haben Sie in den letzten 2 Jahren versucht, Prozesse zu digitalisieren oder zu automatisieren?' },
      en: { text: 'Have you tried to digitalise or automate processes in the last 2 years?' },
    },
    options: [
      { id: 'yes-success', i18n: { de: { label: 'Ja, erfolgreich' }, en: { label: 'Yes, successfully' } } },
      { id: 'yes-failed', i18n: { de: { label: 'Ja, aber es hat nicht wie erhofft funktioniert' }, en: { label: "Yes, but it didn't work out as hoped" } } },
      { id: 'no-too-expensive', i18n: { de: { label: 'Nein, zu teuer / zu aufwändig' }, en: { label: 'No, too expensive / too much effort' } } },
      { id: 'no-no-need', i18n: { de: { label: 'Nein, kein Bedarf gesehen' }, en: { label: 'No, saw no need' } } },
      { id: 'no-no-idea', i18n: { de: { label: 'Nein, wüsste nicht wo anfangen' }, en: { label: "No, wouldn't know where to start" } } },
    ],
  },
  {
    id: 'biggest_wish',
    type: 'textarea',
    optional: true,
    i18n: {
      de: {
        text: 'Wenn Sie morgen aufwachen und ein einziger Prozess in Ihrem Betrieb wäre automatisiert — welcher wäre das?',
        placeholder: 'Beschreiben Sie kurz, was Sie am meisten entlasten würde…',
      },
      en: {
        text: 'If you woke up tomorrow and a single process in your company were automated — which one would it be?',
        placeholder: 'Briefly describe what would relieve you the most…',
      },
    },
  },
] as const satisfies readonly ScanQuestion[];

export const SCAN_ROLES = [
  { id: 'ceo', i18n: { de: { label: 'Geschäftsführer/in' }, en: { label: 'CEO / managing director' } } },
  { id: 'prod-lead', i18n: { de: { label: 'Produktionsleiter/in' }, en: { label: 'Head of production' } } },
  { id: 'finance-lead', i18n: { de: { label: 'Kaufm. Leiter/in' }, en: { label: 'Head of finance / commercial lead' } } },
  { id: 'it-lead', i18n: { de: { label: 'IT-Verantwortliche/r' }, en: { label: 'IT lead' } } },
  { id: 'other', i18n: { de: { label: 'Andere' }, en: { label: 'Other' } } },
] as const satisfies readonly ScanOption[];

// Derived literal-union types — typos become compile errors.
export type QuestionId = (typeof SCAN_QUESTIONS)[number]['id'];
export type RoleId = (typeof SCAN_ROLES)[number]['id'];

// Flat union of every option id across all questions. Deliberately not
// per-question (option ids overlap across questions — 'email', 'other'
// — and the wizard treats answers as a `Partial<Record<QuestionId, …>>`
// rather than mapping each question to its own option-id subset).
type OptionsCarrier = Extract<(typeof SCAN_QUESTIONS)[number], { options: readonly unknown[] }>;
export type OptionId = OptionsCarrier['options'][number]['id'];
