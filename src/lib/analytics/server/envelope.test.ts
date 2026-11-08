import { describe, expect, it } from 'vitest';
import { canonicalEvent, canonicalHost, canonicalUtm, canonicalViewport, parseEnvelope, type RawEvent } from './envelope';

import { click, engagement, pageview } from './testEvents';

const uuid = () => crypto.randomUUID();
const envelope = (events: RawEvent[], over: Record<string, unknown> = {}) =>
  JSON.stringify({ v: 1, cv: 1, consentDate: '2026-11-08', sentAt: 1_762_617_700_000, viewport: '1024-1439', events, ...over });

describe('parseEnvelope (step 9)', () => {
  it('accepts the §5.2 example shape', () => {
    expect(parseEnvelope(envelope([pageview(), engagement(), click()]))?.events).toHaveLength(3);
  });

  it('rejects malformed JSON, unknown or missing keys and wrong types', () => {
    const bad = [
      'not json',
      '[]',
      envelope([pageview()], { extra: 1 }),
      JSON.stringify({ v: 1, cv: 1, consentDate: '2026-11-08', sentAt: 1, events: [pageview()] }),
      envelope([pageview()], { v: 2 }),
      envelope([pageview()], { cv: '1' }),
      envelope([pageview()], { sentAt: 1.5 }),
      envelope([pageview({ extra: 1 })]),
      envelope([{ ...pageview(), landing: undefined } as unknown as RawEvent]),
      envelope([pageview({ path: { nested: true } as unknown as string })]),
      envelope([pageview({ utmSource: 'x'.repeat(129) })]),
      envelope([pageview({ path: '/de/' + 'a'.repeat(510) })]),
    ];
    for (const text of bad) expect(parseEnvelope(text), text.slice(0, 80)).toBeNull();
  });

  it('allows 1 to 20 events only', () => {
    expect(parseEnvelope(envelope([]))).toBeNull();
    expect(parseEnvelope(envelope(Array.from({ length: 20 }, () => click())))).not.toBeNull();
    expect(parseEnvelope(envelope(Array.from({ length: 21 }, () => click())))).toBeNull();
  });
});

describe('canonicalEvent (step 11)', () => {
  it('strips the locale, query and fragment and keeps the locale apart', () => {
    const r = canonicalEvent(pageview({ path: '/en/automation/?utm_source=x#faq' }));
    expect(r).toMatchObject({ ok: true, event: { path: '/automation', locale: 'en' } });
  });

  it('drops the legal pages, the dashboard and unknown paths (reason path)', () => {
    for (const path of ['/de/imprint', '/en/privacy', '/de/dashboard', '/de/nope', '/automation']) {
      expect(canonicalEvent(pageview({ path })), path).toEqual({ ok: false, reason: 'path' });
    }
  });

  it('keeps referrer and UTM on a landing pageview only, and normalises them', () => {
    const landing = canonicalEvent(pageview({ referrerHost: 'WWW.Google.COM', utmSource: ' LinkedIn Post ' }));
    expect(landing).toMatchObject({ ok: true, event: { referrerDomain: 'google.com', utmSource: 'linkedin_post' } });
    const later = canonicalEvent(pageview({ landing: false }));
    expect(later).toMatchObject({ ok: true, event: { referrerDomain: null, utmSource: null, utmMedium: null, utmCampaign: null } });
  });

  it('drops posted goals, unknown types, bad ids and out-of-range values', () => {
    const bad: RawEvent[] = [
      { ...pageview(), type: 'goal' },
      pageview({ eventId: 'E1' }),
      pageview({ eventId: uuid().toUpperCase() }),
      pageview({ seq: 1 }),
      engagement({ seq: 0 }),
      click({ seq: 100 }),
      engagement({ engagedMs: 1_800_001 }),
      engagement({ scrollMax: 60 }),
      engagement({ sectionMask: 256 }),
      click({ kind: 'hover' }),
      click({ area: 'sidebar' }),
      click({ target: 'not-registered' }),
      click({ kind: 'lang', target: 'fr' }),
    ];
    for (const e of bad) expect(canonicalEvent(e), JSON.stringify(e).slice(0, 90)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('reduces click targets to the minimum (§5.5)', () => {
    expect(canonicalEvent(click({ kind: 'mailto', target: 'mailto:x@y.ch' }))).toMatchObject({ ok: true, event: { clickTarget: null } });
    expect(canonicalEvent(click({ kind: 'tel', target: '+41 79 000 00 00' }))).toMatchObject({ ok: true, event: { clickTarget: null } });
    expect(canonicalEvent(click({ kind: 'outbound', target: 'WWW.GitHub.com' }))).toMatchObject({ ok: true, event: { clickTarget: 'github.com' } });
    expect(canonicalEvent(click({ kind: 'outbound', target: 'github.com/doemefu' }))).toEqual({ ok: false, reason: 'invalid' });
    expect(canonicalEvent(click({ kind: 'outbound', target: '192.168.1.10' }))).toEqual({ ok: false, reason: 'invalid' });
    expect(canonicalEvent(click({ kind: 'nav', target: '/de/automation', area: 'header' }))).toMatchObject({ ok: true, event: { clickTarget: '/automation' } });
    expect(canonicalEvent(click({ kind: 'nav', target: '/de/whatever?x=1', area: 'footer' }))).toMatchObject({ ok: true, event: { clickTarget: '(other)' } });
    expect(canonicalEvent(click({ kind: 'faq', target: 'cost' }))).toMatchObject({ ok: true, event: { clickTarget: 'cost' } });
  });
});

describe('helpers', () => {
  it('canonicalUtm', () => {
    expect(canonicalUtm('Print')).toBe('print');
    expect(canonicalUtm('2026-11-ki')).toBe('2026-11-ki');
    expect(canonicalUtm('abc1234567')).toBeNull();
    expect(canonicalUtm('a/b')).toBeNull();
    expect(canonicalUtm(null)).toBeNull();
    expect(canonicalUtm('x'.repeat(65))).toBeNull();
  });
  it('canonicalHost', () => {
    expect(canonicalHost('www.Google.com')).toBe('google.com');
    expect(canonicalHost('bücher.ch')).toBe('xn--bcher-kva.ch');
    for (const v of ['furchert.ch', 'www.furchert.ch', 'auth.furchert.ch', 'https://google.com', 'localhost', 'a b', '', null, '192.168.1.10', '10.0.0.1']) {
      expect(canonicalHost(v), String(v)).toBeNull();
    }
  });
  it('canonicalViewport', () => {
    expect(canonicalViewport('<480')).toBe('<480');
    expect(canonicalViewport('1280')).toBeNull();
    expect(canonicalViewport(null)).toBeNull();
  });
});
