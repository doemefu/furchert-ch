'use server';

// Delivers real mail by SMTP via `src/lib/contact/mailer.ts`, to the mailbox
// configured through the lazy env getters in `src/contact.env.ts`. This is
// NOT a silent fake success: the client only shows "sent" when this action
// returns {ok:true}, which happens only after `sendContactMail()` resolves.
// Invalid input, a tripped honeypot, a missing SMTP config, or a rate-limit
// hit all return {ok:false} (no throw) with a specific `error` code; the
// client surfaces a matching visible error and never shows success on
// failure.
//
// Privacy: never log the submitter's name, email, phone or message body:
// on success only non-identifying metadata (`messageLength`, `topic`,
// `callback`, and `from`/`heardVia` when they are on the allowlists of
// `src/data/contact-sources.ts`), and on delivery failure only
// `{code, responseCode, command}` destructured from the error. Unknown
// `from`/`heardVia` values are dropped and never logged.
//
// Isolation: nothing under `src/app/[locale]/automation/` and no home page
// file may import this module, `src/lib/contact/*`, or `src/contact.env.ts`;
// /automation is a static offer page that only links here with `?from=<id>`
// (`contactHref` in the neutral `src/data/contact-sources.ts`).

import { headers } from 'next/headers';
import { isContactMailConfigured } from '@/contact.env';
import { isFromId, isHeardVia } from '@/data/contact-sources';
import { sendContactMail } from '@/lib/contact/mailer';
import { parsePhone } from '@/lib/contact/phone';
import { checkContactRateLimit, undoContactRateLimit } from '@/lib/contact/rateLimit';

export type ContactTopic = 'demo' | 'other';

export interface ContactInput {
  name: string;
  /** Optional when `callback` is true and a valid phone is given. */
  email: string;
  /** Optional. */
  message: string;
  form_check: string;
  /** `'demo'` or `'other'`; anything else, or nothing, counts as `'other'`. */
  topic?: string;
  /** Optional; required when `callback` is true. */
  phone?: string;
  /** «Rückruf gewünscht»: only the boolean `true` counts as ticked. */
  callback?: boolean;
  /** An id of HEARD_VIA_IDS, else dropped. */
  heardVia?: string;
  /** An id of FROM_IDS, else dropped. */
  from?: string;
}

export type ContactResult =
  | { ok: true }
  | { ok: false; error: 'invalid' | 'phone' | 'server' | 'rate_limited' };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_REJECTED_CHARS_RE = /[<>,;"]/;
// Name and e-mail each become one line of the mail (and the name part of the
// subject): a line break or other control character could forge lines such
// as «Quelle:», so such values are rejected, not cleaned.
const CONTROL_CHARS_RE = /[\x00-\x1f\x7f\u0085\u2028\u2029]/;

const NAME_MAX_LENGTH = 200;
const EMAIL_MAX_LENGTH = 254;
const MESSAGE_MAX_LENGTH = 5000;

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export async function submitContact(input: ContactInput): Promise<ContactResult> {
  const name = text(input.name);
  const email = text(input.email);
  const message = text(input.message);
  const phoneRaw = text(input.phone);
  // The exact boolean only: a string such as 'true' or 'on' is not a tick.
  const callback = input.callback === true;
  const topic: ContactTopic = input.topic === 'demo' ? 'demo' : 'other';
  const from = isFromId(input.from) ? input.from : undefined;
  const heardVia = isHeardVia(input.heardVia) ? input.heardVia : undefined;

  // Honeypot: a real visitor never fills this hidden field. Reject silently
  // and without logging — a per-trip log line has no operator value and is
  // unbounded under a bot flood.
  if (text(input.form_check)) {
    return { ok: false, error: 'invalid' };
  }

  if (!name || name.length > NAME_MAX_LENGTH || CONTROL_CHARS_RE.test(name) || message.length > MESSAGE_MAX_LENGTH) {
    return { ok: false, error: 'invalid' };
  }

  // E-mail: required unless a call back is requested; when given, always valid.
  if (email) {
    if (
      email.length > EMAIL_MAX_LENGTH ||
      !EMAIL_RE.test(email) ||
      EMAIL_REJECTED_CHARS_RE.test(email) ||
      CONTROL_CHARS_RE.test(email)
    ) {
      return { ok: false, error: 'invalid' };
    }
  } else if (!callback) {
    return { ok: false, error: 'invalid' };
  }

  // Phone: required with a call back; a non-empty invalid number is an error
  // even without one (never dropped silently).
  const phone = phoneRaw ? parsePhone(phoneRaw) : null;
  if ((phoneRaw && !phone) || (callback && !phone)) {
    return { ok: false, error: 'phone' };
  }

  const requestHeaders = await headers();
  const cfConnectingIp = requestHeaders.get('cf-connecting-ip');
  const forwardedFor = requestHeaders.get('x-forwarded-for');
  const clientKey = cfConnectingIp || forwardedFor?.split(',')[0]?.trim() || 'unknown';

  if (!checkContactRateLimit(clientKey)) {
    return { ok: false, error: 'rate_limited' };
  }

  if (!isContactMailConfigured()) {
    console.error('[contact] delivery not configured (SMTP_HOST/SMTP_USER/SMTP_PASSWORD missing or SMTP_PORT invalid)');
    undoContactRateLimit(clientKey);
    return { ok: false, error: 'server' };
  }

  try {
    await sendContactMail({
      name,
      email: email || undefined,
      message,
      phone: phone?.display,
      callback,
      topic,
      from,
      heardVia,
    });
    console.info('[contact] submission delivered', { messageLength: message.length, topic, callback, from, heardVia });
    return { ok: true };
  } catch (err) {
    const { code, responseCode, command } = err as { code?: string; responseCode?: number; command?: string };
    console.error('[contact] delivery failed', { code, responseCode, command });
    undoContactRateLimit(clientKey);
    return { ok: false, error: 'server' };
  }
}
