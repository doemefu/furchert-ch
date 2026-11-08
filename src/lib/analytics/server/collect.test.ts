import { describe, expect, it, vi } from 'vitest';
import { handleCollect, handleForget, methodNotAllowed, type CollectDeps } from './collect';
import { click, engagement, pageview } from './testEvents';
import type { RawEvent } from './envelope';
import type { EdgeDropReason, ForwardEvent } from './forwardModel';

const NOW = Date.parse('2026-11-08T15:00:00.000Z');
const VID = '3f0c2a1e-8b7d-4c6e-9a5f-1b2c3d4e5f60';
const NEW_VID = '9b1d2c3e-4f5a-4b6c-8d7e-0f1a2b3c4d5e';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const IP = '203.0.113.77';

function deps(over: Partial<CollectDeps> = {}) {
  const enqueued: ForwardEvent[] = [];
  const drops: Partial<Record<EdgeDropReason, number>> = {};
  const d: CollectDeps = {
    queue: {
      enqueue: (events) => void enqueued.push(...events),
      countDrop: (r, n = 1) => void (drops[r] = (drops[r] ?? 0) + n),
    },
    now: () => NOW,
    uiEnabled: true,
    collectEnabled: true,
    expectedOrigin: 'https://furchert.ch',
    secureCookies: true,
    newVisitorId: () => NEW_VID,
    ...over,
  };
  return { d, enqueued, drops };
}

const envelope = (events: RawEvent[], over: Record<string, unknown> = {}) =>
  JSON.stringify({ v: 1, cv: 1, consentDate: '2026-11-08', sentAt: NOW - 100, viewport: '1024-1439', events, ...over });

function req(body: string, headers: Record<string, string> = {}, method = 'POST') {
  return new Request('https://furchert.ch/api/v', {
    method,
    body: method === 'POST' ? body : undefined,
    headers: {
      'content-type': 'application/json',
      'sec-fetch-site': 'same-origin',
      'user-agent': UA,
      'cf-connecting-ip': IP,
      'x-forwarded-for': IP,
      'cf-ipcountry': 'CH',
      ...headers,
    },
  });
}

describe('POST /api/v (§5.3)', () => {
  it('405 for other methods, no-store, Allow: POST (M9)', async () => {
    const res = methodNotAllowed(false, true);
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('415 without a JSON media type, 403 for foreign or missing origin signals', async () => {
    const { d } = deps();
    expect((await handleCollect(req(envelope([pageview()]), { 'content-type': 'text/plain' }), d)).status).toBe(415);
    expect((await handleCollect(req(envelope([pageview()]), { 'content-type': 'application/jsonx' }), d)).status).toBe(415);
    expect((await handleCollect(req(envelope([pageview()]), { 'sec-fetch-site': 'cross-site' }), d)).status).toBe(403);
    const noSignals = new Request('https://furchert.ch/api/v', { method: 'POST', body: envelope([pageview()]), headers: { 'content-type': 'application/json' } });
    expect((await handleCollect(noSignals, d)).status).toBe(403);
    const foreignOrigin = new Request('https://furchert.ch/api/v', { method: 'POST', body: envelope([pageview()]), headers: { 'content-type': 'application/json', origin: 'https://evil.example' } });
    expect((await handleCollect(foreignOrigin, d)).status).toBe(403);
  });

  it('413 over 8 KiB, 400 for 21 events or an unknown key', async () => {
    const { d } = deps();
    expect((await handleCollect(req('x'.repeat(8193)), d)).status).toBe(413);
    expect((await handleCollect(req(envelope(Array.from({ length: 21 }, () => click()))), d)).status).toBe(400);
    expect((await handleCollect(req(envelope([pageview({ extra: 1 })])), d)).status).toBe(400);
    expect((await handleCollect(req('{bad json'), d)).status).toBe(400);
  });

  it('kill switches: 204, nothing enqueued, no cookie', async () => {
    for (const over of [{ uiEnabled: false }, { collectEnabled: false }]) {
      const { d, enqueued } = deps(over);
      const res = await handleCollect(req(envelope([pageview()])), d);
      expect(res.status).toBe(204);
      expect(res.headers.get('set-cookie')).toBeNull();
      expect(enqueued).toEqual([]);
    }
  });

  it('signed-in drop: 204, counted, no cookie', async () => {
    const { d, enqueued, drops } = deps();
    const res = await handleCollect(req(envelope([pageview()]), { cookie: '__Secure-authjs.session-token=abc' }), d);
    expect(res.status).toBe(204);
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(enqueued).toEqual([]);
    expect(drops.signed_in).toBe(1);
  });

  it('cv / consentDate drop: 204 without Set-Cookie (never mints)', async () => {
    for (const over of [{ cv: 2 }, { consentDate: '2025-11-08' }, { consentDate: '2026-11-10' }, { consentDate: 'nope' }]) {
      const { d, enqueued, drops } = deps();
      const res = await handleCollect(req(envelope([pageview()], over)), d);
      expect(res.status, JSON.stringify(over)).toBe(204);
      expect(res.headers.get('set-cookie'), JSON.stringify(over)).toBeNull();
      expect(enqueued).toEqual([]);
      expect(drops.consent).toBe(1);
    }
  });

  it('mints fa_vid only when absent or stale, with the exact attributes and expiry', async () => {
    const fresh = deps();
    const res = await handleCollect(req(envelope([pageview()])), fresh.d);
    expect(res.status).toBe(204);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('set-cookie')).toBe(
      `fa_vid=${NEW_VID}.1; Path=/; Expires=Mon, 08 Nov 2027 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax`,
    );
    expect(fresh.enqueued[0].visitorId).toBe(NEW_VID);

    const known = deps();
    const kept = await handleCollect(req(envelope([pageview()]), { cookie: `fa_vid=${VID}.1` }), known.d);
    expect(kept.headers.get('set-cookie')).toBeNull();
    expect(known.enqueued[0].visitorId).toBe(VID);

    const stale = deps();
    const reminted = await handleCollect(req(envelope([pageview()]), { cookie: `fa_vid=${VID}.0` }), stale.d);
    expect(reminted.headers.get('set-cookie')).toContain(`fa_vid=${NEW_VID}.1`);
  });

  it('does not mint when every event was dropped (L11)', async () => {
    const { d, enqueued, drops } = deps();
    const res = await handleCollect(req(envelope([pageview({ path: '/de/imprint' }), { ...click(), type: 'goal' }])), d);
    expect(res.status).toBe(204);
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(enqueued).toEqual([]);
    expect(drops).toMatchObject({ path: 1, invalid: 1 });
  });

  it('canonicalises and enriches; the forwarded payload never holds IP, UA, query or mailto values', async () => {
    const { d, enqueued } = deps();
    await handleCollect(
      req(
        envelope([
          pageview({ path: '/de/automation?utm_source=x#faq', referrerHost: 'www.google.com', utmSource: 'LinkedIn' }),
          engagement(),
          click({ kind: 'mailto', target: 'mailto:x@y.ch' }),
          click({ kind: 'nav', target: '/en/contact?from=home-cta', area: 'header' }),
        ]),
        { 'cf-ipcountry': 'XX' },
      ),
      d,
    );
    expect(enqueued.map((e) => e.type)).toEqual(['pageview', 'engagement', 'click', 'click']);
    expect(enqueued[0]).toMatchObject({ path: '/automation', locale: 'de', referrerDomain: 'google.com', utmSource: 'linkedin', country: null, browserFamily: 'chrome', viewport: '1024-1439' });
    expect(enqueued[2].clickTarget).toBeNull();
    expect(enqueued[3].clickTarget).toBe('/contact');
    const text = JSON.stringify(enqueued);
    for (const needle of [IP, 'Mozilla', 'AppleWebKit', '?', '#', 'x@y.ch', 'mailto:']) expect(text).not.toContain(needle);
  });

  it('turns T1 into a null country and tolerates junk headers without logging', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { d, enqueued } = deps();
    await handleCollect(req(envelope([pageview()]), { 'cf-ipcountry': 'T1', cookie: 'fa_vid=%%%; ;=;' }), d);
    expect(enqueued[0].country).toBeNull();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('error handling (M5)', () => {
  it('logs nothing for malformed JSON, bad URLs or unknown keys', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    const { d } = deps();
    const bodies = [
      '{"v":1,',
      envelope([pageview({ path: 'http://[::1' })]),
      envelope([pageview({ path: '//evil.example/de' })]),
      envelope([click({ kind: 'outbound', target: '%%%' })]),
      envelope([pageview({ referrerHost: 'a..b' })]),
      envelope([pageview({ unknown: 'x' })]),
    ];
    for (const b of bodies) await handleCollect(req(b), d);
    for (const s of spies) {
      expect(s).not.toHaveBeenCalled();
      s.mockRestore();
    }
  });
});

describe('POST /api/v/forget (§5.4, WA-2b)', () => {
  const forget = (headers: Record<string, string> = {}, method = 'POST') =>
    new Request('https://furchert.ch/api/v/forget', {
      method,
      body: method === 'POST' ? '{}' : undefined,
      headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin', ...headers },
    });
  const CLEAR = 'fa_vid=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax';

  it('always 204 with the clear header; never mints; ignores kill switches and sign-in', async () => {
    for (const over of [{}, { collectEnabled: false }, { uiEnabled: false }]) {
      const { d } = deps(over);
      const res = await handleForget(forget({ cookie: `fa_vid=${VID}.1; __Secure-authjs.session-token=x` }), d);
      expect(res.status).toBe(204);
      expect(res.headers.get('set-cookie')).toBe(CLEAR);
      expect(res.headers.get('cache-control')).toBe('no-store');
    }
  });

  it('clears on every response except 429, incl. 405/415/403/413 (L6)', async () => {
    const { d } = deps();
    const cases = [
      await handleForget(forget({ 'content-type': 'text/plain' }), d),
      await handleForget(forget({ 'sec-fetch-site': 'cross-site' }), d),
      await handleForget(new Request('https://furchert.ch/api/v/forget', { method: 'POST', body: 'x'.repeat(9000), headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' } }), d),
      methodNotAllowed(true, true),
    ];
    expect(cases.map((r) => r.status)).toEqual([415, 403, 413, 405]);
    for (const r of cases) expect(r.headers.get('set-cookie')).toBe(CLEAR);
  });
});
