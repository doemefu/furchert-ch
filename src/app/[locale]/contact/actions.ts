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
// Privacy: never log the submitter's name, email, or message body — only
// non-identifying metadata (`messageLength`) on success, and on delivery
// failure only `{code, responseCode, command}` destructured from the error.
//
// Isolation: `src/app/[locale]/automation/scan/Step3Contact.tsx` and
// everything else under `src/app/[locale]/automation/` must never import
// this module, `src/lib/contact/*`, or `src/contact.env.ts` — that surface
// stays a non-functional mockup by design.

import { headers } from 'next/headers';
import { isContactMailConfigured } from '@/contact.env';
import { sendContactMail } from '@/lib/contact/mailer';
import { checkContactRateLimit, undoContactRateLimit } from '@/lib/contact/rateLimit';

export interface ContactInput {
  name: string;
  email: string;
  message: string;
  form_check: string;
}

export type ContactResult = { ok: true } | { ok: false; error: 'invalid' | 'server' | 'rate_limited' };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_REJECTED_CHARS_RE = /[<>,;"]/;

const NAME_MAX_LENGTH = 200;
const EMAIL_MAX_LENGTH = 254;
const MESSAGE_MAX_LENGTH = 5000;

export async function submitContact(input: ContactInput): Promise<ContactResult> {
  const name = input.name?.trim() ?? '';
  const email = input.email?.trim() ?? '';
  const message = input.message?.trim() ?? '';

  // Honeypot: a real visitor never fills this hidden field. Reject silently
  // and without logging — a per-trip log line has no operator value and is
  // unbounded under a bot flood.
  if (input.form_check?.trim()) {
    return { ok: false, error: 'invalid' };
  }

  if (!name || !message || !EMAIL_RE.test(email)) {
    return { ok: false, error: 'invalid' };
  }

  if (name.length > NAME_MAX_LENGTH || email.length > EMAIL_MAX_LENGTH || message.length > MESSAGE_MAX_LENGTH) {
    return { ok: false, error: 'invalid' };
  }

  if (EMAIL_REJECTED_CHARS_RE.test(email)) {
    return { ok: false, error: 'invalid' };
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
    await sendContactMail({ name, email, message });
    console.info('[contact] submission delivered', { messageLength: message.length });
    return { ok: true };
  } catch (err) {
    const { code, responseCode, command } = err as { code?: string; responseCode?: number; command?: string };
    console.error('[contact] delivery failed', { code, responseCode, command });
    undoContactRateLimit(clientKey);
    return { ok: false, error: 'server' };
  }
}
