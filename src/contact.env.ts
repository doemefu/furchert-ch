// Lazy env accessor for the contact-form SMTP delivery (issue #46). Mirrors
// `metrics.env.ts`'s read-at-property-access pattern: because the contact
// page is statically prerendered at build time, a missing or invalid value
// here must make `isContactMailConfigured()` return `false` rather than
// throwing.

const DEFAULT_SMTP_PORT = 587;

function readSmtpHost(): string {
  return process.env.SMTP_HOST ?? '';
}

function readSmtpPort(): number | undefined {
  const raw = process.env.SMTP_PORT;
  const port = raw === undefined || raw === '' ? DEFAULT_SMTP_PORT : Number(raw);
  return Number.isInteger(port) && port >= 1 && port <= 65535 ? port : undefined;
}

function readSmtpUser(): string {
  return process.env.SMTP_USER ?? '';
}

function readSmtpPassword(): string {
  return process.env.SMTP_PASSWORD ?? '';
}

function readContactTo(): string {
  const v = process.env.CONTACT_TO;
  return v && v.length > 0 ? v : readSmtpUser();
}

// Read lazily (at property access, i.e. request/build time) rather than at
// module import, matching `METRICS_ENV` — keeps the build green regardless
// of env.
export const CONTACT_ENV = {
  get SMTP_HOST(): string {
    return readSmtpHost();
  },
  get SMTP_PORT(): number | undefined {
    return readSmtpPort();
  },
  get SMTP_USER(): string {
    return readSmtpUser();
  },
  get SMTP_PASSWORD(): string {
    return readSmtpPassword();
  },
  get CONTACT_TO(): string {
    return readContactTo();
  },
};

export function isContactMailConfigured(): boolean {
  return (
    CONTACT_ENV.SMTP_HOST.length > 0 &&
    CONTACT_ENV.SMTP_USER.length > 0 &&
    CONTACT_ENV.SMTP_PASSWORD.length > 0 &&
    CONTACT_ENV.SMTP_PORT !== undefined
  );
}
