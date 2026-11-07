// Server-only SMTP mailer for the contact form (issue #46). Imported
// exclusively from `src/app/[locale]/contact/actions.ts`. The SMTP password
// and the submitter's personal data (name, email, phone, message) are used
// only to build and send the outgoing mail here — none of it reaches the
// browser. This module intentionally sends plain text only; see the comment
// above the `text` body below for why.
//
// Callback and attribution (#145): the subject starts with «Rückruf: » when a
// call back is requested, else «Live-Demo: » for the demo topic. Optional
// body lines are written only for checked values: «Telefon:» (plus a hint for
// 090x and non-Swiss numbers), «Rückruf gewünscht: ja», «Anliegen:»,
// «Quelle:» (an id of FROM_IDS) and «Aufmerksam geworden:» (the label of
// HEARD_VIA_MAIL_LABELS, never the submitted text). The weekly Gate-0 count
// searches the inbox for «Quelle:» and «Aufmerksam geworden:».
import nodemailer from 'nodemailer';
import { CONTACT_ENV } from '@/contact.env';
import { HEARD_VIA_MAIL_LABELS, isFromId, isHeardVia } from '@/data/contact-sources';
import { parsePhone } from '@/lib/contact/phone';

let transporter: import('nodemailer').Transporter | undefined;

function getTransporter(): import('nodemailer').Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: CONTACT_ENV.SMTP_HOST,
      port: CONTACT_ENV.SMTP_PORT,
      secure: CONTACT_ENV.SMTP_PORT === 465,
      requireTLS: true,
      auth: { user: CONTACT_ENV.SMTP_USER, pass: CONTACT_ENV.SMTP_PASSWORD },
      // Defense in depth: no attachments or URL-sourced content are ever intended.
      disableFileAccess: true,
      disableUrlAccess: true,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 7000,
      dnsTimeout: 5000,
      logger: false,
    });
  }
  return transporter;
}

export interface ContactMail {
  name: string;
  /** Reply-To and the «Email:» line only when given. */
  email?: string;
  message: string;
  phone?: string;
  callback?: boolean;
  topic?: 'demo' | 'other';
  from?: string;
  heardVia?: string;
}

const TOPIC_LABELS = { demo: 'Live-Demo', other: 'Etwas anderes' } as const;

// One line, whatever the caller passes: the action already rejects names and
// e-mail addresses with control characters; this keeps the subject and the
// body lines single-line even if a caller does not.
const singleLine = (value: string) => value.replace(/[\x00-\x1f\x7f\u0085\u2028\u2029]/g, '');

function phoneLines(raw: string | undefined): string[] {
  const phone = raw ? parsePhone(raw) : null;
  if (!phone) return [];
  const lines = [`Telefon: ${phone.display}`];
  if (phone.premium) lines.push('Telefon-Hinweis: 090x-Nummer (Mehrwertdienst), bitte prüfen');
  else if (phone.foreign) lines.push('Telefon-Hinweis: keine Schweizer Nummer erkennbar, bitte prüfen');
  return lines;
}

export async function sendContactMail(input: ContactMail): Promise<void> {
  const name = singleLine(input.name);
  const email = input.email ? singleLine(input.email) : '';
  const callback = input.callback === true;
  const prefix = callback ? 'Rückruf: ' : input.topic === 'demo' ? 'Live-Demo: ' : '';
  const subject = `${prefix}Contact form: ${name.slice(0, 80)}`;

  const lines = [`Name: ${name}`];
  if (email) lines.push(`Email: ${email}`);
  lines.push(...phoneLines(input.phone));
  if (callback) lines.push('Rückruf gewünscht: ja');
  if (input.topic === 'demo' || input.topic === 'other') lines.push(`Anliegen: ${TOPIC_LABELS[input.topic]}`);
  if (isFromId(input.from)) lines.push(`Quelle: ${input.from}`);
  if (isHeardVia(input.heardVia)) lines.push(`Aufmerksam geworden: ${HEARD_VIA_MAIL_LABELS[input.heardVia]}`);
  const messageBlock = input.message ? `\n\nMessage:\n${input.message}` : '';

  // No HTML part on purpose: adding one later would make HTML-escaping of
  // `name`/`message` mandatory to avoid injection into the rendered email.
  const text = `${lines.join('\n')}${messageBlock}

-- Sent via the contact form at https://furchert.ch/contact`;

  // The SMTP login (SMTP_USER) and the From address (CONTACT_FROM) differ on
  // iCloud: the latter must be an address of the authenticated account.
  const info = await getTransporter().sendMail({
    from: { name: 'furchert.ch contact form', address: CONTACT_ENV.CONTACT_FROM },
    to: CONTACT_ENV.CONTACT_TO,
    ...(email ? { replyTo: { name, address: email } } : {}),
    subject,
    text,
  });

  // nodemailer types `accepted`/`rejected` as optional (`string[] | undefined`);
  // treat a missing array the same as an empty one.
  if (!((info.accepted?.length ?? 0) > 0 && (info.rejected?.length ?? 0) === 0)) {
    throw new Error('contact mail not fully accepted');
  }
}
