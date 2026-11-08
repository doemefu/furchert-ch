// Consent record and browser storage keys for first-party web analytics
// (spec 100 §4.2, §4.3). Pure functions over an injected storage, so they run
// in the node test environment. Reading is allowed before a choice; nothing
// here writes except `serializeConsent`'s caller (the controller).

export const ANALYTICS_CONSENT_VERSION = 1;
export const CONSENT_KEY = 'fa_consent';
export const FORGET_PENDING_KEY = 'fa_forget_pending';
export const OPTOUT_KEY = 'fa_optout';
/** Same-tab notification after the choice changed (observers only, e.g. UI). */
export const CONSENT_EVENT = 'fa:consent';
/** `fa_consent` and the `fa_vid` cookie both live consentDate + 365 days. */
export const CONSENT_LIFETIME_DAYS = 365;

export type ConsentChoice = 'granted' | 'denied';
export type ConsentBy = 'user' | 'signal';

export interface ConsentRecord {
  v: number;
  choice: ConsentChoice;
  by: ConsentBy;
  /** UTC calendar day of the choice, `YYYY-MM-DD`. */
  at: string;
}

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const DAY_MS = 86_400_000;

/** UTC calendar day `YYYY-MM-DD`. */
export function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** Day number since the epoch for a real `YYYY-MM-DD` date, else null. */
function dayNumber(day: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const ms = Date.parse(`${day}T00:00:00Z`);
  if (Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== day) return null;
  return ms / DAY_MS;
}

/**
 * True when a consent given on `at` no longer counts on `today` (both UTC
 * days): from consentDate + 365 days on, for a malformed date, or for a date
 * more than one day in the future (one day absorbs clock skew). Fixed, never
 * sliding. Shared with the server side (`/api/v`, WA-2b) so the stored choice
 * and the `fa_vid` cookie expire on the same day.
 */
export function consentExpired(at: string, today: string): boolean {
  const a = dayNumber(at);
  const t = dayNumber(today);
  if (a === null || t === null) return true;
  return t - a >= CONSENT_LIFETIME_DAYS || a - t > 1;
}

const RECORD_KEYS = ['at', 'by', 'choice', 'v'];

/** A valid, current-version, unexpired record, or null. */
export function parseConsent(raw: string | null, today: string): ConsentRecord | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const r = value as Record<string, unknown>;
  if (Object.keys(r).sort().join() !== RECORD_KEYS.join()) return null;
  if (r.v !== ANALYTICS_CONSENT_VERSION) return null;
  if (r.choice !== 'granted' && r.choice !== 'denied') return null;
  if (r.by !== 'user' && r.by !== 'signal') return null;
  if (typeof r.at !== 'string' || consentExpired(r.at, today)) return null;
  return { v: r.v, choice: r.choice, by: r.by, at: r.at };
}

function safeGet(storage: StorageLike | null, key: string): string | null {
  try {
    return storage ? storage.getItem(key) : null;
  } catch {
    return null; // storage blocked (privacy settings): behave as "no choice"
  }
}

/** The stored consent record if it still counts; never writes. */
export function readConsent(storage: StorageLike | null, now: Date): ConsentRecord | null {
  return parseConsent(safeGet(storage, CONSENT_KEY), utcDay(now));
}

/** True when a marker key (`fa_forget_pending`, `fa_optout`) holds "1". */
export function readFlag(storage: StorageLike | null, key: string): boolean {
  return safeGet(storage, key) === '1';
}

export function serializeConsent(choice: ConsentChoice, by: ConsentBy, now: Date): string {
  const record: ConsentRecord = { v: ANALYTICS_CONSENT_VERSION, choice, by, at: utcDay(now) };
  return JSON.stringify(record);
}
