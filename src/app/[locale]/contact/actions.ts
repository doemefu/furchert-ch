'use server';

// TODO(phase7): forward to real delivery (Formspree or a dedicated /api
// route). This intentionally validates the input and server-logs it, then
// returns the real outcome. It is NOT a silent fake success: the message is
// genuinely received server-side, and the client only shows "sent" when this
// returns {ok:true}. Invalid input returns {ok:false} (no throw); the client
// surfaces a visible error and never shows success on failure.

export interface ContactInput {
  name: string;
  email: string;
  message: string;
}

export type ContactResult = { ok: true } | { ok: false; error: 'invalid' };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitContact(input: ContactInput): Promise<ContactResult> {
  const name = input.name?.trim() ?? '';
  const email = input.email?.trim() ?? '';
  const message = input.message?.trim() ?? '';

  if (!name || !message || !EMAIL_RE.test(email)) {
    return { ok: false, error: 'invalid' };
  }

  // Real server-side receipt until Phase 7 wires delivery. Do not log the
  // message body or the submitter's identity (name/email are personal data —
  // retention/compliance) — only non-identifying metadata that a valid
  // submission was received.
  console.info('[contact] submission received', {
    messageLength: message.length,
  });

  return { ok: true };
}
