import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const headers = vi.fn();
const sendContactMail = vi.fn();
const checkContactRateLimit = vi.fn();
const undoContactRateLimit = vi.fn();
const isContactMailConfigured = vi.fn();
const enqueue = vi.fn();

vi.mock('next/headers', () => ({ headers }));
vi.mock('@/lib/contact/mailer', () => ({ sendContactMail }));
vi.mock('@/lib/contact/rateLimit', () => ({ checkContactRateLimit, undoContactRateLimit }));
vi.mock('@/contact.env', () => ({ isContactMailConfigured }));
vi.mock('@/lib/analytics/server/runtime', () => ({ getForwardQueue: () => ({ enqueue }) }));
vi.mock('next-intl/server', () => ({ getLocale: async () => 'de' }));

const { submitContact } = await import('./actions');
type Input = Parameters<typeof submitContact>[0];

const base: Input = { name: 'Ada Muster', email: 'ada@example.org', message: 'Hallo', form_check: '' };
const callbackOnly: Input = { name: 'Ada Muster', email: '', message: '', form_check: '', callback: true, phone: '079 123 45 67' };

let info: ReturnType<typeof vi.spyOn>;
let error: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  headers.mockResolvedValue(new Headers({ 'cf-connecting-ip': '203.0.113.7' }));
  sendContactMail.mockResolvedValue(undefined);
  checkContactRateLimit.mockReturnValue(true);
  isContactMailConfigured.mockReturnValue(true);
  info = vi.spyOn(console, 'info').mockImplementation(() => {});
  error = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  info.mockRestore();
  error.mockRestore();
});

const mail = () => sendContactMail.mock.calls[0][0];
const logged = () => JSON.stringify([...info.mock.calls, ...error.mock.calls]);

describe('submitContact: validation', () => {
  it('rejects a filled honeypot silently, before anything else', async () => {
    expect(await submitContact({ ...base, form_check: 'bot' })).toEqual({ ok: false, error: 'invalid' });
    expect(checkContactRateLimit).not.toHaveBeenCalled();
    expect(sendContactMail).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('requires a name', async () => {
    expect(await submitContact({ ...base, name: '   ' })).toEqual({ ok: false, error: 'invalid' });
  });

  it.each([
    ['a line break', 'A\r\nQuelle: home-cta'],
    ['a bare line feed', 'A\nRückruf gewünscht: ja'],
    ['a Unicode line separator', 'A\u2028Quelle: home-cta'],
    ['a NUL character', 'A\u0000B'],
    ['a right-to-left override', 'Ada \u202Eetsiws'],
    ['a left-to-right mark', 'Ada\u200EMuster'],
    ['a right-to-left mark', 'Ada\u200FMuster'],
    ['a left-to-right embedding', 'Ada\u202AMuster'],
    ['a pop directional formatting', 'Ada\u202CMuster'],
    ['a first-strong isolate', 'Ada\u2068Muster'],
    ['a pop directional isolate', 'Ada\u2069Muster'],
    ['a zero-width no-break space', 'Ada\uFEFFMuster'],
    ['an Arabic letter mark', 'Ada\u061CMuster'],
    ['a zero-width space', 'Ada\u200BMuster'],
    ['a word joiner', 'Ada\u2060Muster'],
    ['a soft hyphen', 'Ada\u00ADMuster'],
  ])('rejects a name with %s, so it cannot forge or reorder mail lines', async (_, name) => {
    expect(await submitContact({ ...base, name, from: 'automation-hero' })).toEqual({ ok: false, error: 'invalid' });
    expect(sendContactMail).not.toHaveBeenCalled();
  });

  it('rejects an e-mail address with a control character', async () => {
    expect(await submitContact({ ...base, email: 'ada@example.org\u0000' })).toEqual({ ok: false, error: 'invalid' });
    expect(await submitContact({ ...base, email: 'ada@exa\u2028mple.org' })).toEqual({ ok: false, error: 'invalid' });
  });

  it('requires an e-mail address without a call back', async () => {
    expect(await submitContact({ ...base, email: '' })).toEqual({ ok: false, error: 'invalid' });
    expect(await submitContact({ ...base, email: '', phone: '079 123 45 67' })).toEqual({ ok: false, error: 'invalid' });
    expect(sendContactMail).not.toHaveBeenCalled();
  });

  it('rejects an invalid e-mail address even with a call back', async () => {
    expect(await submitContact({ ...callbackOnly, email: 'not-an-address' })).toEqual({ ok: false, error: 'invalid' });
    expect(await submitContact({ ...base, email: 'a<b>@example.org' })).toEqual({ ok: false, error: 'invalid' });
  });

  it('accepts a call back with name and phone only (no e-mail, no message)', async () => {
    expect(await submitContact(callbackOnly)).toEqual({ ok: true });
    expect(mail()).toMatchObject({ name: 'Ada Muster', email: undefined, message: '', phone: '079 123 45 67', callback: true });
  });

  it('asks for the phone when a call back has none', async () => {
    expect(await submitContact({ ...callbackOnly, phone: '' })).toEqual({ ok: false, error: 'phone' });
    expect(await submitContact({ ...callbackOnly, phone: undefined, email: 'ada@example.org' })).toEqual({ ok: false, error: 'phone' });
    expect(sendContactMail).not.toHaveBeenCalled();
  });

  it('rejects an invalid phone even without the call-back box (never dropped silently)', async () => {
    expect(await submitContact({ ...base, phone: '12' })).toEqual({ ok: false, error: 'phone' });
    expect(sendContactMail).not.toHaveBeenCalled();
  });

  it.each([
    ['letters', '079 CALL ME'],
    ['more than 40 characters', '079 123 45 67' + ' '.repeat(30) + '8'],
  ])('rejects a phone with %s', async (_, phone) => {
    expect(await submitContact({ ...callbackOnly, phone })).toEqual({ ok: false, error: 'phone' });
  });

  it('accepts a valid phone without a call back and sends it along', async () => {
    expect(await submitContact({ ...base, phone: '+41 44 123 45 67' })).toEqual({ ok: true });
    expect(mail()).toMatchObject({ phone: '+41 44 123 45 67', callback: false });
  });

  it('allows up to 5000 characters of message and rejects more', async () => {
    expect(await submitContact({ ...base, message: 'x'.repeat(5000) })).toEqual({ ok: true });
    expect(await submitContact({ ...base, message: 'x'.repeat(5001) })).toEqual({ ok: false, error: 'invalid' });
  });

  it('accepts an empty message', async () => {
    expect(await submitContact({ ...base, message: '' })).toEqual({ ok: true });
  });

  it.each([
    ['nothing', undefined],
    ['an unknown topic', 'sales'],
    ['a different case', 'Demo'],
  ])('maps %s as topic to "other"', async (_, topic) => {
    await submitContact({ ...base, topic });
    expect(mail().topic).toBe('other');
  });

  it('keeps the demo topic', async () => {
    await submitContact({ ...base, topic: 'demo' });
    expect(mail().topic).toBe('demo');
  });

  it.each([['true'], ['on'], [1], ['yes']])('does not treat callback %j as ticked', async (value) => {
    const r = await submitContact({ ...base, phone: '079 123 45 67', callback: value as unknown as boolean });
    expect(r).toEqual({ ok: true });
    expect(mail().callback).toBe(false);
  });

  it('does not treat a string callback as ticked when it would waive the e-mail', async () => {
    expect(await submitContact({ ...callbackOnly, callback: 'true' as unknown as boolean })).toEqual({ ok: false, error: 'invalid' });
  });
});

describe('submitContact: attribution', () => {
  it('passes allowlisted from and heardVia ids to the mailer', async () => {
    await submitContact({ ...base, from: 'automation-callback', heardVia: 'referral' });
    expect(mail()).toMatchObject({ from: 'automation-callback', heardVia: 'referral' });
  });

  it('drops unknown from and heardVia values and never logs them', async () => {
    expect(await submitContact({ ...base, from: 'evil-campaign', heardVia: 'Empfehlung' })).toEqual({ ok: true });
    expect(mail().from).toBeUndefined();
    expect(mail().heardVia).toBeUndefined();
    expect(logged()).not.toContain('evil-campaign');
    expect(logged()).not.toContain('Empfehlung');
  });

  it('logs only metadata on success: no name, e-mail, phone or message', async () => {
    await submitContact({
      ...base,
      phone: '079 123 45 67',
      callback: true,
      topic: 'demo',
      from: 'automation-hero',
      heardVia: 'search',
      message: 'Geheime Nachricht',
    });
    expect(info).toHaveBeenCalledWith('[contact] submission delivered', {
      messageLength: 'Geheime Nachricht'.length,
      topic: 'demo',
      callback: true,
      from: 'automation-hero',
      heardVia: 'search',
    });
    for (const secret of ['Ada', 'ada@example.org', '079', 'Geheime']) expect(logged()).not.toContain(secret);
  });
});

describe('submitContact: delivery', () => {
  it('rate-limits the phone-only call back like any other submission', async () => {
    checkContactRateLimit.mockReturnValue(false);
    expect(await submitContact(callbackOnly)).toEqual({ ok: false, error: 'rate_limited' });
    expect(checkContactRateLimit).toHaveBeenCalledWith('203.0.113.7');
    expect(sendContactMail).not.toHaveBeenCalled();
  });

  it('keys the rate limit on the client IP and returns rate_limited without sending', async () => {
    checkContactRateLimit.mockReturnValue(false);
    expect(await submitContact(base)).toEqual({ ok: false, error: 'rate_limited' });
    expect(checkContactRateLimit).toHaveBeenCalledWith('203.0.113.7');
    expect(sendContactMail).not.toHaveBeenCalled();
  });

  it('returns server and gives the slot back when SMTP is not configured', async () => {
    isContactMailConfigured.mockReturnValue(false);
    expect(await submitContact(base)).toEqual({ ok: false, error: 'server' });
    expect(undoContactRateLimit).toHaveBeenCalledWith('203.0.113.7');
    expect(sendContactMail).not.toHaveBeenCalled();
  });

  it('returns server, logs only the error code fields and gives the slot back when sending fails', async () => {
    sendContactMail.mockRejectedValue(
      Object.assign(new Error('rejected ada@example.org'), { code: 'EENVELOPE', responseCode: 550, command: 'RCPT TO', response: 'ada@example.org' }),
    );
    expect(await submitContact(base)).toEqual({ ok: false, error: 'server' });
    expect(error).toHaveBeenCalledWith('[contact] delivery failed', { code: 'EENVELOPE', responseCode: 550, command: 'RCPT TO' });
    expect(logged()).not.toContain('ada@example.org');
    expect(undoContactRateLimit).toHaveBeenCalledWith('203.0.113.7');
  });
});

describe('submitContact: usage statistics (spec 100 §5.9)', () => {
  const enqueued = () => enqueue.mock.calls.flatMap(([events]) => events as { type: string }[]);

  it('records one id-free enquiry per successful submission while the analytics UI is dark', async () => {
    expect(await submitContact({ ...base, analytics: true, locale: 'en' })).toEqual({ ok: true });
    expect(enqueued().map((e) => e.type)).toEqual(['enquiry']);
    expect(enqueue.mock.calls[0][1]).toEqual({ priority: true });
    expect(logged()).not.toContain('enquiry');
  });

  it('records nothing when the delivery fails or the visitor is signed in', async () => {
    sendContactMail.mockRejectedValue(Object.assign(new Error('x'), { code: 'ECONNECTION' }));
    await submitContact(base);
    headers.mockResolvedValue(new Headers({ cookie: '__Secure-authjs.session-token=x' }));
    sendContactMail.mockResolvedValue(undefined);
    await submitContact(base);
    expect(enqueued()).toEqual([]);
  });

  it('keeps the form result when recording fails', async () => {
    enqueue.mockImplementation(() => {
      throw new Error('queue down');
    });
    expect(await submitContact(base)).toEqual({ ok: true });
  });
});
