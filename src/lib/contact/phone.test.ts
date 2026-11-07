import { describe, expect, it } from 'vitest';
import { PHONE_MAX_LENGTH, parsePhone } from './phone';

describe('parsePhone', () => {
  it.each([
    ['+41 79 123 45 67', '+41 79 123 45 67'],
    ['044 / 123 45 67', '044 / 123 45 67'],
    ['079.123.45.67', '079.123.45.67'],
    ['0041 79 123 45 67', '0041 79 123 45 67'],
    ['+41 (0)44 123-45-67', '+41 (0)44 123-45-67'],
    ['  079   123 45 67  ', '079 123 45 67'],
  ])('accepts the Swiss number %j', (raw, display) => {
    expect(parsePhone(raw)).toEqual({ display, premium: false, foreign: false });
  });

  it.each([
    ['letters', '079 CALL ME'],
    ['an extension word', '079 123 45 67 ext 2'],
    ['a plus sign inside', '079+123 45 67'],
    ['a tab inside', '079\t123 45 67'],
    ['a line break inside', '079 123\n45 67'],
    ['8 digits', '079 123 45'],
    ['16 digits', '+41 79 123 45 67 89 012'],
    ['only separators', '()/.-'],
    ['an empty value', '   '],
  ])('rejects %s', (_, raw) => {
    expect(parsePhone(raw)).toBeNull();
  });

  it(`rejects more than ${PHONE_MAX_LENGTH} characters, even with a valid digit count`, () => {
    const raw = '079' + ' '.repeat(PHONE_MAX_LENGTH) + '1234567';
    expect(raw.trim().length).toBeGreaterThan(PHONE_MAX_LENGTH);
    expect(parsePhone(raw)).toBeNull();
    expect(parsePhone('0'.repeat(10).padEnd(PHONE_MAX_LENGTH, '-'))).not.toBeNull();
  });

  it.each(['0900 123 456', '0901 123 456', '+41 906 123 456', '0041 900 123 456'])(
    'flags the premium-rate number %j without rejecting it',
    (raw) => {
      expect(parsePhone(raw)).toMatchObject({ premium: true, foreign: false });
    },
  );

  it.each([
    ['a German number', '+49 30 1234567'],
    ['a foreign 00 prefix', '0049 30 1234567'],
    ['no prefix', '79 123 45 67'],
    ['a Swiss prefix with too many digits', '079 123 45 678'],
  ])('flags %s as not Swiss without rejecting it', (_, raw) => {
    expect(parsePhone(raw)).toMatchObject({ premium: false, foreign: true });
  });
});
