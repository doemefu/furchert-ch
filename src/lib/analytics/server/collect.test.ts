import { describe, expect, it, vi } from 'vitest';
import { handleCollect, handleForget, methodNotAllowed, type CollectDeps, type CollectLimits, type ForgetDeps } from './collect';
import { createEraser } from './erase';
import { createLimiter } from './limiter';
import { createForwardQueue } from './queue';
import { click, engagement, pageview } from './testEvents';
import type { RawEvent } from './envelope';
import type { EdgeDropReason, ForwardEvent } from './forwardModel';

const NOW = Date.parse('2026-11-08T15:00:00.000Z');
const VID = '3f0c2a1e-8b7d-4c6e-9a5f-1b2c3d4e5f60';
const NEW_VID = '9b1d2c3e-4f5a-4b6c-8d7e-0f1a2b3c4d5e';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const IP = '203.0.113.77';

const MINUTE = 60_000;
const collectLimits = (): CollectLimits => ({
  requestsPerKey: createLimiter({ limit: 20, windowMs: MINUTE }),
  requestsGlobal: createLimiter({ limit: 300, windowMs: MINUTE }),
  eventsPerKey: createLimiter({ limit: 200, windowMs: 10 * MINUTE }),
  eventsGlobal: createLimiter({ limit: 2_000, windowMs: MINUTE }),
  mintsPerKey: createLimiter({ limit: 5, windowMs: 60 * MINUTE }),
});

function deps(over: Partial<CollectDeps> = {}) {
  const enqueued: ForwardEvent[] = [];
  const drops: Partial<Record<EdgeDropReason, number>> = {};
  const counts: Record<string, number> = {};
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
    limits: collectLimits(),
    count: (k, n = 1) => void (counts[k] = (counts[k] ?? 0) + n),
    ...over,
  };
  return { d, enqueued, drops, counts };
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

describe('POST /api/v WA-5: bots, rate limits, mint limit (§5.3 steps 7, 8, 12; §5.8)', () => {
  it('step 7: bot UAs and prefetch requests are dropped (204, counted per request, nothing enqueued)', async () => {
    const { d, enqueued, drops } = deps();
    expect((await handleCollect(req(envelope([pageview()]), { 'user-agent': 'curl/8.7.1 (x86_64-apple-darwin23.0) libcurl/8.7.1' }), d)).status).toBe(204);
    expect((await handleCollect(req(envelope([pageview()]), { 'sec-purpose': 'prefetch' }), d)).status).toBe(204);
    expect(enqueued).toEqual([]);
    expect(drops.bot).toBe(2);
  });

  it('per-key request window: the 21st request in a minute is 429 with Retry-After; another key passes', async () => {
    const { d, drops } = deps();
    const cookie = { cookie: `fa_vid=${VID}.1` };
    for (let i = 0; i < 20; i += 1) expect((await handleCollect(req(envelope([pageview()]), cookie), d)).status).toBe(204);
    const res = await handleCollect(req(envelope([pageview()]), cookie), d);
    expect(res.status).toBe(429);
    expect(Number(res.headers.get('retry-after'))).toBeGreaterThanOrEqual(1);
    expect(Number(res.headers.get('retry-after'))).toBeLessThanOrEqual(600);
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(drops.rate_limited).toBe(1);
    expect((await handleCollect(req(envelope([pageview()]), { ...cookie, 'cf-connecting-ip': '198.51.100.9' }), d)).status).toBe(204);
  });

  it('IPv6 addresses share the /64 budget; missing CF-Connecting-IP uses one shared key and is counted', async () => {
    const { d, counts } = deps();
    const cookie = `fa_vid=${VID}.1`;
    for (let i = 0; i < 20; i += 1) await handleCollect(req(envelope([pageview()]), { cookie, 'cf-connecting-ip': `2001:db8:1:2::${i + 1}` }), d);
    expect((await handleCollect(req(envelope([pageview()]), { cookie, 'cf-connecting-ip': '2001:db8:1:2:ffff::1' }), d)).status).toBe(429);
    expect((await handleCollect(req(envelope([pageview()]), { cookie, 'cf-connecting-ip': '' }), d)).status).toBe(204);
    expect(counts.unknownKey).toBe(1);
  });

  it('per-key event window: 200 events / 10 min; a rejection charges nothing', async () => {
    const { d } = deps();
    const cookie = { cookie: `fa_vid=${VID}.1` };
    const twenty = () => envelope(Array.from({ length: 20 }, (_, i) => click({ seq: i + 1 })));
    for (let i = 0; i < 10; i += 1) {
      expect((await handleCollect(req(twenty(), cookie), d)).status).toBe(204);
      d.now = () => NOW + (i + 1) * 61_000; // keep the request window open
    }
    expect((await handleCollect(req(twenty(), cookie), d)).status).toBe(429);
    expect(d.limits.eventsGlobal.wouldExceed('global', 1_800, NOW + 10 * 61_000)).toBe(false);
  });

  it('global request window: 300 / minute across keys', async () => {
    const { d } = deps();
    for (let i = 0; i < 300; i += 1) await handleCollect(req(envelope([pageview()]), { cookie: `fa_vid=${VID}.1`, 'cf-connecting-ip': `198.51.${i >> 8}.${i & 255}` }), d);
    expect((await handleCollect(req(envelope([pageview()]), { 'cf-connecting-ip': '192.0.2.1' }), d)).status).toBe(429);
  });

  it('mint limit 5/h per key: the 6th mint is dropped (204, no cookie, nothing enqueued, counted per event)', async () => {
    const { d, enqueued, drops } = deps();
    for (let i = 0; i < 5; i += 1) expect((await handleCollect(req(envelope([pageview()])), d)).headers.get('set-cookie')).toContain('fa_vid=');
    const res = await handleCollect(req(envelope([pageview(), engagement()])), d);
    expect(res.status).toBe(204);
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(enqueued).toHaveLength(5);
    expect(drops.mint_limited).toBe(2);
    // An existing cookie is not a mint and still passes.
    expect((await handleCollect(req(envelope([pageview()]), { cookie: `fa_vid=${VID}.1` }), d)).status).toBe(204);
    expect(enqueued).toHaveLength(6);
  });
});

describe('POST /api/v/forget (§5.4, WA-5)', () => {
  const A = '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
  const B = '2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a';
  const C = '3e4f5a6b-7c8d-4e9f-8a0b-2c3d4e5f6a7b';
  const D = '4f5a6b7c-8d9e-4f0a-9b1c-3d4e5f6a7b8c';
  const CLEAR = 'fa_vid=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax';
  const CLEAR_F = 'fa_forget=; Path=/api/v/forget; Max-Age=0; HttpOnly; Secure; SameSite=Strict';
  const SET_F = (...ids: string[]) => `fa_forget=${ids.join('.')}; Path=/api/v/forget; Max-Age=2592000; HttpOnly; Secure; SameSite=Strict`;
  const forget = (headers: Record<string, string> = {}, body = '{}') =>
    new Request('https://furchert.ch/api/v/forget', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin', 'cf-connecting-ip': IP, ...headers },
    });
  const cookies = (r: Response) => r.headers.getSetCookie();

  function fdeps(opts: { fail?: string[]; settled?: boolean; over?: Partial<ForgetDeps> } = {}) {
    const log: string[] = [];
    const counts: Record<string, number> = {};
    let slots = 0;
    const d: ForgetDeps = {
      expectedOrigin: 'https://furchert.ch',
      secureCookies: true,
      now: () => NOW,
      limits: { perKey: createLimiter({ limit: 30, windowMs: MINUTE }), global: createLimiter({ limit: 120, windowMs: MINUTE }) },
      queue: {
        purgeVisitors: async (ids) => (log.push(`purge ${ids.join(',')}`), { settled: opts.settled ?? true }),
        onInFlightSettled: (cb) => cb(),
      },
      eraser: {
        tryAcquire: () => (slots < 4 ? (slots += 1, true) : false),
        release: () => void (slots -= 1),
        eraseNow: async (ids) => (log.push(`erase ${ids.join(',')}`), ids.filter((id) => opts.fail?.includes(id))),
        queueRetry: (ids) => void log.push(`retry ${ids.join(',')}`),
        reDeleteAfter: (_p, ids) => void log.push(`redelete ${ids.join(',')}`),
      },
      count: (k, n = 1) => void (counts[k] = (counts[k] ?? 0) + n),
      ...opts.over,
    };
    return { d, log, counts, slots: () => slots };
  }

  it('erases fa_vid (any version) and fa_forget ids: purge first, then DELETE; 204 clears both cookies', async () => {
    const { d, log, counts } = fdeps();
    const res = await handleForget(forget({ cookie: `fa_vid=${VID}.0; fa_forget=${A}.${B}` }), d);
    expect(res.status).toBe(204);
    expect(cookies(res)).toEqual([CLEAR, CLEAR_F]);
    expect(log).toEqual([`purge ${A},${B},${VID}`, `erase ${A},${B},${VID}`]);
    expect(counts.erased).toBe(3);
  });

  it('no ids: 204 with the fa_vid clear (and the fa_forget clear when one was sent); nothing erased', async () => {
    const none = fdeps();
    const res = await handleForget(forget(), none.d);
    expect(res.status).toBe(204);
    expect(cookies(res)).toEqual([CLEAR]);
    expect(none.log).toEqual([]);
    const bad = fdeps();
    const r2 = await handleForget(forget({ cookie: 'fa_forget=junk' }), bad.d);
    expect(cookies(r2)).toEqual([CLEAR, CLEAR_F]);
    expect(bad.counts.bad_id).toBe(1);
  });

  it('one id deleted, one failed → 503 with exactly the failed id; both failed → both; the failed go to the retry set', async () => {
    const one = fdeps({ fail: [A] });
    const r1 = await handleForget(forget({ cookie: `fa_vid=${VID}.1; fa_forget=${A}` }), one.d);
    expect(r1.status).toBe(503);
    expect(cookies(r1)).toEqual([CLEAR, SET_F(A)]);
    expect(one.log).toContain(`retry ${A}`);
    const both = fdeps({ fail: [A, VID] });
    const r2 = await handleForget(forget({ cookie: `fa_vid=${VID}.1; fa_forget=${A}` }), both.d);
    expect(cookies(r2)).toEqual([CLEAR, SET_F(A, VID)]);
  });

  it('N3: five failed ids → the cookie keeps the newest four (fa_vid last); the dropped one stays in the retry set', async () => {
    const all = [A, B, C, D, VID];
    const { d, log } = fdeps({ fail: all });
    const res = await handleForget(forget({ cookie: `fa_vid=${VID}.1; fa_forget=${A}.${B}.${C}.${D}` }), d);
    expect(cookies(res)).toEqual([CLEAR, SET_F(B, C, D, VID)]);
    expect(log).toContain(`retry ${all.join(',')}`);
  });

  it('M5: fa_forget accumulates across failed forgets (A, then A.B, …) up to four', async () => {
    const { d } = fdeps({ fail: [A, B, C, D, VID] });
    let jar = '';
    for (const vid of [A, B, C, D, VID]) {
      const res = await handleForget(forget({ cookie: `fa_vid=${vid}.1${jar ? `; fa_forget=${jar}` : ''}` }), d);
      jar = cookies(res)[1].split(';')[0].slice('fa_forget='.length);
    }
    expect(jar).toBe([B, C, D, VID].join('.'));
  });

  it('per-key limit 30/min: over it 429 + Retry-After and fa_vid kept; a NAT neighbour can exhaust it', async () => {
    const { d, log } = fdeps();
    for (let i = 0; i < 30; i += 1) await handleForget(forget(), d); // a neighbour behind the same IP
    const res = await handleForget(forget({ cookie: `fa_vid=${VID}.1` }), d);
    expect(res.status).toBe(429);
    expect(Number(res.headers.get('retry-after'))).toBeGreaterThanOrEqual(1);
    expect(cookies(res)).toEqual([]);
    expect(log).toEqual([]);
  });

  it('global limit 120/min across keys → 429', async () => {
    const { d } = fdeps();
    for (let i = 0; i < 120; i += 1) await handleForget(forget({ 'cf-connecting-ip': `198.51.100.${i}` }), d);
    expect((await handleForget(forget({ 'cf-connecting-ip': '192.0.2.200' }), d)).status).toBe(429);
  });

  it('N4: a 5th concurrent forget gets 429 Retry-After 2, charges no window; slots are released after errors', async () => {
    const gate: (() => void)[] = [];
    const { d, slots } = fdeps({
      over: {},
    });
    d.queue.purgeVisitors = () => new Promise((r) => gate.push(() => r({ settled: true })));
    const running = [A, B, C, D].map((id) => handleForget(forget({ cookie: `fa_vid=${id}.1`, 'cf-connecting-ip': `198.51.100.${id.charCodeAt(0)}` }), d));
    await Promise.resolve();
    await Promise.resolve();
    const fifth = await handleForget(forget({ cookie: `fa_vid=${VID}.1`, 'cf-connecting-ip': '192.0.2.5' }), d);
    expect(fifth.status).toBe(429);
    expect(fifth.headers.get('retry-after')).toBe('2');
    expect(d.limits.perKey.wouldExceed('192.0.2.5', 30, NOW)).toBe(false);
    gate.forEach((g) => g());
    await Promise.all(running);
    expect(slots()).toBe(0);
    d.queue.purgeVisitors = async () => {
      throw new Error('boom');
    };
    // Review W2: an unexpected error after the guard keeps the ids pending (503 + fa_forget).
    const err = await handleForget(forget({ cookie: `fa_vid=${VID}.1` }), d);
    expect(err.status).toBe(503);
    expect(cookies(err)).toEqual([CLEAR, SET_F(VID)]);
    expect(slots()).toBe(0);
  });

  it('M3: a timed-out in-flight wait schedules one background re-DELETE', async () => {
    const { d, log } = fdeps({ settled: false });
    await handleForget(forget({ cookie: `fa_vid=${VID}.1` }), d);
    expect(log).toEqual([`purge ${VID}`, `erase ${VID}`, `redelete ${VID}`]);
  });

  it('N7: unaffected by the kill switches and the signed-in drop: purge + DELETE still run; never mints', async () => {
    const { d, log } = fdeps();
    const res = await handleForget(forget({ cookie: `fa_vid=${VID}.1; __Secure-authjs.session-token=x` }), d);
    expect(res.status).toBe(204);
    expect(log).toEqual([`purge ${VID}`, `erase ${VID}`]);
    expect(cookies(res).some((c) => c.startsWith('fa_vid=') && !c.includes('Max-Age=0'))).toBe(false);
  });

  it('guard errors clear fa_vid; 408/413 also keep the ids pending in fa_forget (arch Q5); 403 erases nothing', async () => {
    const { d, log } = fdeps();
    const big = await handleForget(forget({ cookie: `fa_vid=${VID}.1; fa_forget=${A}` }, 'x'.repeat(9000)), d);
    expect(big.status).toBe(413);
    expect(cookies(big)).toEqual([CLEAR, SET_F(A, VID)]);
    const cross = await handleForget(forget({ cookie: `fa_vid=${VID}.1`, 'sec-fetch-site': 'cross-site' }), d);
    expect(cross.status).toBe(403);
    expect(cookies(cross)).toEqual([CLEAR]);
    const type = await handleForget(forget({ 'content-type': 'text/plain' }), d);
    expect(cookies(type)).toEqual([CLEAR]);
    expect(methodNotAllowed(true, true).headers.get('set-cookie')).toBe(CLEAR);
    expect(log).toEqual([]);
  });

  it('W2: an unexpected error after the guard queues the ids for the background retry', async () => {
    const { d, log } = fdeps();
    d.eraser.eraseNow = async () => {
      throw new Error('boom');
    };
    const res = await handleForget(forget({ cookie: `fa_vid=${VID}.1; fa_forget=${A}` }), d);
    expect(res.status).toBe(503);
    expect(cookies(res)).toEqual([CLEAR, SET_F(A, VID)]);
    expect(log).toContain(`retry ${A},${VID}`);
  });

  it('integration: queued events never sent, in-flight batch answered before the DELETE, data-service down then up', async () => {
    const order: string[] = [];
    let release: (r: Response) => void = () => {};
    let dsUp = false;
    let first = true;
    const fetchFn = (async (url: string, init: RequestInit) => {
      if (init.method === 'DELETE') {
        order.push(`DELETE ${url.split('/').pop()}`);
        return dsUp ? new Response(null, { status: 204 }) : new Response(null, { status: 503 });
      }
      const ev = JSON.parse(String(init.body)).events as ForwardEvent[];
      order.push(`POST ${ev.map((e) => e.visitorId).join(',')}`);
      if (first) {
        first = false;
        return new Promise<Response>((r) => (release = r));
      }
      return new Response('{}', { status: 200 });
    }) as unknown as typeof fetch;
    const queue = createForwardQueue({ fetch: fetchFn, now: () => Date.now(), getToken: async () => 't', invalidateToken: () => {}, eventsUrl: () => 'http://ds/events', log: () => {} });
    const eraser = createEraser({ fetch: fetchFn, now: () => Date.now(), getToken: async () => 't', invalidateToken: () => {}, visitorUrl: (id) => `http://ds/visitors/${id}`, count: () => {} });
    const base = fdeps().d;
    const d: ForgetDeps = { ...base, queue, eraser };
    const ev = (vid: string) => ({ ...JSON.parse(JSON.stringify({})), eventId: crypto.randomUUID(), type: 'pageview', visitorId: vid }) as unknown as ForwardEvent;
    queue.enqueue([ev(VID), ev(A)]);
    const flushing = queue.flush(); // in flight: VID, A
    await Promise.resolve();
    queue.enqueue([ev(VID), ev(B)]); // queued behind it
    vi.useFakeTimers();
    try {
      const forgetting = handleForget(forget({ cookie: `fa_vid=${VID}.1` }), d);
      await vi.advanceTimersByTimeAsync(0);
      release(new Response('{}', { status: 200 }));
      await flushing;
      await vi.advanceTimersByTimeAsync(3_000);
      const down = await forgetting;
      expect(down.status).toBe(503);
      expect(cookies(down)).toEqual([CLEAR, SET_F(VID)]);
      expect(order.slice(0, 2)).toEqual([`POST ${VID},${A}`, `DELETE ${VID}`]);
      dsUp = true;
      const up = await handleForget(forget({ cookie: `fa_forget=${VID}` }), d);
      expect(up.status).toBe(204);
      expect(cookies(up)).toEqual([CLEAR, CLEAR_F]);
    } finally {
      vi.useRealTimers();
    }
    await queue.flushAll();
    expect(order.filter((o) => o.startsWith('POST')).slice(1)).toEqual([`POST ${B}`]);
  });

  it('two concurrent first collects without Web Locks, then withdrawal: the cookie id is erased, the orphan stays (R13)', async () => {
    const enq: ForwardEvent[] = [];
    let n = 0;
    const ids = [A, B];
    const c = deps({ newVisitorId: () => ids[n++], queue: { enqueue: (e) => void enq.push(...e), countDrop: () => {} } });
    const r1 = await handleCollect(req(envelope([pageview()])), c.d);
    const r2 = await handleCollect(req(envelope([pageview()])), c.d);
    expect(r1.headers.get('set-cookie')).toContain(A);
    const jar = r2.headers.get('set-cookie')!.split(';')[0]; // the browser keeps the last Set-Cookie
    const { d, log } = fdeps();
    await handleForget(forget({ cookie: jar }), d);
    expect(log).toEqual([`purge ${B}`, `erase ${B}`]);
    expect(enq.map((e) => e.visitorId)).toEqual([A, B]); // A is the documented orphan
  });
});
