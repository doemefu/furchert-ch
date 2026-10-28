import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONTACT_ENV, isContactMailConfigured } from '@/contact.env';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('CONTACT_ENV.CONTACT_FROM', () => {
  it('defaults to SMTP_USER when CONTACT_FROM is unset', () => {
    vi.stubEnv('SMTP_USER', 'login@icloud.com');
    vi.stubEnv('CONTACT_FROM', undefined);
    expect(CONTACT_ENV.CONTACT_FROM).toBe('login@icloud.com');
  });

  it('prefers CONTACT_FROM over SMTP_USER', () => {
    vi.stubEnv('SMTP_USER', 'login@icloud.com');
    vi.stubEnv('CONTACT_FROM', 'info@furchert.ch');
    expect(CONTACT_ENV.CONTACT_FROM).toBe('info@furchert.ch');
  });

  it('falls back to SMTP_USER when CONTACT_FROM is an empty string', () => {
    vi.stubEnv('SMTP_USER', 'login@icloud.com');
    vi.stubEnv('CONTACT_FROM', '');
    expect(CONTACT_ENV.CONTACT_FROM).toBe('login@icloud.com');
  });
});

describe('isContactMailConfigured', () => {
  it('does not depend on CONTACT_FROM', () => {
    vi.stubEnv('SMTP_HOST', 'smtp.mail.me.com');
    vi.stubEnv('SMTP_PORT', '587');
    vi.stubEnv('SMTP_USER', 'login@icloud.com');
    vi.stubEnv('SMTP_PASSWORD', 'app-password');
    vi.stubEnv('CONTACT_FROM', undefined);
    expect(isContactMailConfigured()).toBe(true);
    vi.stubEnv('CONTACT_FROM', 'info@furchert.ch');
    expect(isContactMailConfigured()).toBe(true);
  });
});
