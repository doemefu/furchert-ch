import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createTransport = vi.fn();
const sendMail = vi.fn();

vi.mock('nodemailer', () => ({ default: { createTransport } }));

async function loadMailer() {
  vi.resetModules();
  return import('@/lib/contact/mailer');
}

beforeEach(() => {
  createTransport.mockReset();
  sendMail.mockReset();
  createTransport.mockReturnValue({ sendMail });
  sendMail.mockResolvedValue({ accepted: ['info@furchert.ch'], rejected: [] });
  vi.stubEnv('SMTP_HOST', 'smtp.mail.me.com');
  vi.stubEnv('SMTP_PORT', '587');
  vi.stubEnv('SMTP_USER', 'login@icloud.com');
  vi.stubEnv('SMTP_PASSWORD', 'app-password');
  vi.stubEnv('CONTACT_FROM', 'info@furchert.ch');
  vi.stubEnv('CONTACT_TO', 'info@furchert.ch');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const input = { name: 'Ada', email: 'ada@example.org', message: 'Hello' };

describe('sendContactMail', () => {
  it('authenticates as SMTP_USER but sends From CONTACT_FROM to CONTACT_TO', async () => {
    const { sendContactMail } = await loadMailer();
    await sendContactMail(input);

    const options = createTransport.mock.calls[0][0];
    expect(options.auth.user).toBe('login@icloud.com');
    expect(options.host).toBe('smtp.mail.me.com');

    const mail = sendMail.mock.calls[0][0];
    expect(mail.from.address).toBe('info@furchert.ch');
    expect(mail.to).toBe('info@furchert.ch');
    expect(mail.replyTo.address).toBe('ada@example.org');
  });

  it('uses STARTTLS (requireTLS, not implicit TLS) on port 587', async () => {
    const { sendContactMail } = await loadMailer();
    await sendContactMail(input);

    const options = createTransport.mock.calls[0][0];
    expect(options.requireTLS).toBe(true);
    expect(options.secure).toBe(false);
  });

  it('falls back to SMTP_USER as From when CONTACT_FROM is unset', async () => {
    vi.stubEnv('CONTACT_FROM', undefined);
    const { sendContactMail } = await loadMailer();
    await sendContactMail(input);

    expect(sendMail.mock.calls[0][0].from.address).toBe('login@icloud.com');
  });
});
