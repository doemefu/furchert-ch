// Server-only SMTP mailer for the contact form (issue #46). Imported
// exclusively from `src/app/[locale]/contact/actions.ts`. The SMTP password
// and the submitter's personal data (name, email, message) are used only to
// build and send the outgoing mail here — none of it reaches the browser.
// This module intentionally sends plain text only; see the comment above the
// `text` body below for why.
import nodemailer from 'nodemailer';
import { CONTACT_ENV } from '@/contact.env';

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

export async function sendContactMail(input: { name: string; email: string; message: string }): Promise<void> {
  const strippedName = input.name.replace(/[\r\n\x00-\x1f\x7f]/g, '').slice(0, 80);
  const subject = `Contact form: ${strippedName}`;

  // No HTML part on purpose: adding one later would make HTML-escaping of
  // `name`/`message` mandatory to avoid injection into the rendered email.
  const text = `Name: ${input.name}
Email: ${input.email}

Message:
${input.message}

-- Sent via the contact form at https://furchert.ch/contact`;

  const info = await getTransporter().sendMail({
    from: { name: 'furchert.ch contact form', address: CONTACT_ENV.SMTP_USER },
    to: CONTACT_ENV.CONTACT_TO,
    replyTo: { name: input.name, address: input.email },
    subject,
    text,
  });

  // nodemailer types `accepted`/`rejected` as optional (`string[] | undefined`);
  // treat a missing array the same as an empty one.
  if (!((info.accepted?.length ?? 0) > 0 && (info.rejected?.length ?? 0) === 0)) {
    throw new Error('contact mail not fully accepted');
  }
}
