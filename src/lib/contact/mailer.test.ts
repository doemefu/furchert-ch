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

describe('sendContactMail: callback and attribution (#145)', () => {
  const sent = () => sendMail.mock.calls[0][0] as { subject: string; text: string; replyTo?: unknown };
  const full = {
    ...input,
    phone: '+41 79 123 45 67',
    callback: true,
    topic: 'demo' as const,
    from: 'automation-callback',
    heardVia: 'referral',
  };

  it('keeps CR/LF and control characters out of the subject', async () => {
    const { sendContactMail } = await loadMailer();
    await sendContactMail({ ...input, name: 'Eve\r\nBcc: victim@example.org\x00' });

    expect(sent().subject).toBe('Contact form: EveBcc: victim@example.org');
    expect(sent().subject).not.toMatch(/[\r\n\x00-\x1f\x7f]/);
  });

  it('keeps a name with line breaks on its own line: no forged «Quelle:» or other lines', async () => {
    const { sendContactMail } = await loadMailer();
    await sendContactMail({ ...input, name: 'A\r\nQuelle: home-cta\u2028Rückruf gewünscht: ja', email: 'a@x.ch\nTelefon: 0900 1' });

    const lines = sent().text.split('\n');
    expect(lines.filter((l) => /^(Quelle|Rückruf|Telefon|Anliegen|Aufmerksam)/.test(l))).toEqual([]);
    expect(lines[0]).toBe('Name: AQuelle: home-ctaRückruf gewünscht: ja');
    expect(lines[1]).toBe('Email: a@x.chTelefon: 0900 1');
    expect(sent().subject).toBe('Contact form: AQuelle: home-ctaRückruf gewünscht: ja');
  });

  it('prefixes the subject with «Rückruf: » for a call back, else «Live-Demo: » for the demo topic', async () => {
    const { sendContactMail } = await loadMailer();
    await sendContactMail(full);
    await sendContactMail({ ...input, topic: 'demo' });
    await sendContactMail({ ...input, topic: 'other' });

    expect(sendMail.mock.calls.map((c) => c[0].subject)).toEqual([
      'Rückruf: Contact form: Ada',
      'Live-Demo: Contact form: Ada',
      'Contact form: Ada',
    ]);
  });

  it('sets no Reply-To and no «Email:» line without an e-mail', async () => {
    const { sendContactMail } = await loadMailer();
    await sendContactMail({ ...full, email: undefined });

    expect(sent()).not.toHaveProperty('replyTo');
    expect(sent().text).not.toContain('Email:');
    expect(sent().text).toContain('Telefon: +41 79 123 45 67');
  });

  it('writes every attribution line for checked values, the source label from the server map', async () => {
    const { sendContactMail } = await loadMailer();
    await sendContactMail(full);

    expect(sent().text).toBe(
      [
        'Name: Ada',
        'Email: ada@example.org',
        'Telefon: +41 79 123 45 67',
        'Rückruf gewünscht: ja',
        'Anliegen: Live-Demo',
        'Quelle: automation-callback',
        'Aufmerksam geworden: Empfehlung',
        '',
        'Message:',
        'Hello',
        '',
        '-- Sent via the contact form at https://furchert.ch/contact',
      ].join('\n'),
    );
  });

  it('writes no optional line for values that are not on the allowlists or not a phone number', async () => {
    const { sendContactMail } = await loadMailer();
    await sendContactMail({ ...input, phone: '079 CALL ME', from: 'evil-campaign', heardVia: 'Empfehlung' });

    const { text } = sent();
    for (const label of ['Telefon', 'Rückruf', 'Anliegen', 'Quelle', 'Aufmerksam geworden']) {
      expect(text).not.toContain(`${label}`);
    }
    expect(text).not.toContain('evil-campaign');
    expect(text).not.toContain('CALL ME');
  });

  it('flags 090x and non-Swiss numbers in the mail without dropping them', async () => {
    const { sendContactMail } = await loadMailer();
    await sendContactMail({ ...input, phone: '0900 123 456' });
    await sendContactMail({ ...input, phone: '+49 30 1234567' });
    await sendContactMail({ ...input, phone: '079 123 45 67' });

    const texts = sendMail.mock.calls.map((c) => c[0].text as string);
    expect(texts[0]).toContain('Telefon: 0900 123 456\nTelefon-Hinweis: 090x-Nummer (Mehrwertdienst), bitte prüfen');
    expect(texts[1]).toContain('Telefon: +49 30 1234567\nTelefon-Hinweis: keine Schweizer Nummer erkennbar, bitte prüfen');
    expect(texts[2]).toContain('Telefon: 079 123 45 67');
    expect(texts[2]).not.toContain('Telefon-Hinweis');
  });

  it('leaves out the message block when there is no message', async () => {
    const { sendContactMail } = await loadMailer();
    await sendContactMail({ ...full, message: '' });

    expect(sent().text).not.toContain('Message:');
  });
});
