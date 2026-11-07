// Phone number check for the contact form (#145). Pure and dependency-free;
// used by the server action (validation) and the mailer (the «Telefon:» line
// and its hint). A number is accepted when it is at most 40 characters long,
// uses only digits, spaces and `( ) / . -` with an optional leading `+`, and
// has 9 to 15 digits. Swiss premium-rate numbers (090x) and numbers that are
// not recognisably Swiss are accepted too, but flagged so the mail can say so.

export const PHONE_MAX_LENGTH = 40;

const PHONE_CHARS_RE = /^\+?[0-9 ()/.-]+$/;
const MIN_DIGITS = 9;
const MAX_DIGITS = 15;

export interface PhoneNumber {
  /** As entered: trimmed, runs of spaces collapsed to one. */
  display: string;
  /** A Swiss premium-rate number (0900, 0901, 0906, ...). */
  premium: boolean;
  /** Not recognisably a Swiss number (foreign prefix, no prefix, wrong length). */
  foreign: boolean;
}

// The Swiss national number without the trunk 0 (e.g. "791234567"), or null
// when the prefix is not Swiss. Accepts "079 …", "+41 79 …", "+41 (0)79 …"
// and "0041 79 …".
function swissNationalNumber(display: string, digits: string): string | null {
  const withoutTrunk = (n: string) => (n.startsWith('0') ? n.slice(1) : n);
  if (display.startsWith('+')) return digits.startsWith('41') ? withoutTrunk(digits.slice(2)) : null;
  if (digits.startsWith('00')) return digits.startsWith('0041') ? withoutTrunk(digits.slice(4)) : null;
  if (digits.startsWith('0')) return digits.slice(1);
  return null;
}

/** The checked number, or null when `raw` is not an acceptable phone number. */
export function parsePhone(raw: string): PhoneNumber | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > PHONE_MAX_LENGTH || !PHONE_CHARS_RE.test(trimmed)) return null;
  const display = trimmed.replace(/ {2,}/g, ' ');
  const digits = display.replace(/\D/g, '');
  if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) return null;
  const national = swissNationalNumber(display, digits);
  const swiss = national !== null && /^[1-9]\d{8}$/.test(national);
  return { display, premium: swiss && national.startsWith('90'), foreign: !swiss };
}
