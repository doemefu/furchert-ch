import { describe, expect, it } from 'vitest';
import {
  contactEmailAddress,
  contactEmailPlaceholder,
  contactMailtoHref,
} from './contact-email';

// Built here from parts, so this file does not carry the address either.
const EXPECTED = ['dominic', 'furchert.ch'].join('@');

describe('contact e-mail helpers (#147)', () => {
  it('assembles the address', () => {
    expect(contactEmailAddress()).toBe(EXPECTED);
  });

  it('builds a placeholder that is no address pattern', () => {
    expect(contactEmailPlaceholder()).toBe('dominic [at] furchert.ch');
    expect(contactEmailPlaceholder()).not.toContain('@');
  });

  it('builds the mailto href, with an encoded subject when given', () => {
    expect(contactMailtoHref()).toBe(`mailto:${EXPECTED}`);
    expect(contactMailtoHref('Live-Demo: Anfrage')).toBe(
      `mailto:${EXPECTED}?subject=Live-Demo%3A%20Anfrage`,
    );
  });
});
