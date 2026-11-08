import { describe, expect, it } from 'vitest';
import { canonicalEvent, parseEnvelope } from '../server/envelope';
import { classify } from '../server/c13Mirror';
import { toForwardEvent } from '../server/forwardModel';
import { createTracker, viewportBucket } from './index';
import { Clock, FakeTarget, fakeEl, fakeNode, recordingFetch, settle } from './testEnv';
import type { ClientEvent } from './transport';

function setup(opts: { search?: string; referrer?: string; webdriver?: boolean; pathname?: string } = {}) {
  const clock = new Clock();
  const f = recordingFetch();
  const main = { top: 64, height: 3000 };
  const win = Object.assign(new FakeTarget(), {
    innerWidth: 1280,
    innerHeight: 800,
    location: { pathname: opts.pathname ?? '/de/automation', search: opts.search ?? '', host: 'furchert.ch', origin: 'https://furchert.ch' },
  });
  const doc = Object.assign(new FakeTarget(), {
    visibilityState: 'visible',
    referrer: opts.referrer ?? '',
    hasFocus: () => true,
    querySelector: (s: string) => (s === 'main' ? { getBoundingClientRect: () => ({ ...main }) } : null),
  });
  let reach: ((id: string) => void) | null = null;
  const state = { allowed: true };
  const tracker = createTracker(
    {
      win,
      doc,
      webdriver: opts.webdriver ?? false,
      locks: null,
      fetch: f.fetch,
      now: () => clock.t,
      perf: () => clock.perfT,
      setTimeout: clock.setTimeout,
      clearTimeout: clock.clearTimeout,
      uuid: () => crypto.randomUUID(),
      observeSections: (cb) => {
        reach = cb;
        return () => (reach = null);
      },
    },
    { allowed: () => state.allowed, consentDate: () => '2026-11-08' },
  );
  const events = () => f.bodies.flatMap((b) => b.events as ClientEvent[]);
  const flushAll = async () => {
    win.dispatch('pagehide');
    await settle();
  };
  return { tracker, clock, f, win, doc, main, events, flushAll, state, reach: (id: string) => reach?.(id) };
}

describe('pageviews (§3.4)', () => {
  it('first start: a landing pageview with referrer host and UTM, flushed at once', async () => {
    const s = setup({ search: '?utm_source=print&utm_source=other&utm_medium=shortlink&utm_campaign=ki&x=1', referrer: 'https://www.google.com/search?q=secret' });
    s.tracker.setPath('/automation');
    s.tracker.start();
    await settle();
    expect(s.f.bodies).toHaveLength(1);
    expect(s.events()[0]).toMatchObject({
      type: 'pageview', seq: 0, path: '/de/automation', landing: true,
      referrerHost: 'www.google.com', utmSource: 'print', utmMedium: 'shortlink', utmCampaign: 'ki',
    });
    expect(JSON.stringify(s.f.bodies)).not.toContain('secret');
  });

  it('same-host referrer gives null; a locale-only switch is no pageview', async () => {
    const s = setup({ referrer: 'https://furchert.ch/de' });
    s.tracker.setPath('/automation');
    s.tracker.start();
    await settle();
    s.tracker.setPath('/automation');
    await s.flushAll();
    expect(s.events().filter((e) => e.type === 'pageview')).toHaveLength(1);
    expect(s.events()[0].referrerHost).toBeNull();
  });

  it('soft navigation: a snapshot for the old page, then a non-landing pageview without referrer/UTM', async () => {
    const s = setup({ search: '?utm_source=print' });
    s.tracker.setPath('/automation');
    s.tracker.start();
    await settle();
    s.win.location.pathname = '/de/it';
    s.tracker.setPath('/it');
    await s.flushAll();
    const [, snap, pv2] = s.events();
    expect(snap).toMatchObject({ type: 'engagement', seq: 1 });
    expect(pv2).toMatchObject({ type: 'pageview', path: '/de/it', landing: false, referrerHost: null, utmSource: null });
    expect(pv2.pageviewId).not.toBe(s.events()[0].pageviewId);
  });

  it('pauses on non-tracked paths and resumes with a non-landing pageview (M6)', async () => {
    const s = setup();
    s.tracker.setPath('/automation');
    s.tracker.start();
    await settle();
    s.tracker.setPath('/dashboard');
    s.doc.dispatch('click', { target: fakeEl(fakeNode('a', { href: 'https://github.com' }, fakeNode('main'))) });
    s.tracker.setPath('/imprint');
    await s.flushAll();
    const before = s.events().length;
    s.tracker.setPath('/');
    await s.flushAll();
    const after = s.events().slice(before);
    expect(after[0]).toMatchObject({ type: 'pageview', landing: false }); // then the pagehide snapshot
    expect(after.filter((e) => e.type === 'pageview')).toHaveLength(1);
    expect(s.events().some((e) => e.kind === 'outbound')).toBe(false);
  });

  it('restart after stop: not a landing, flushed at once; bfcache restore is a non-landing pageview', async () => {
    const s = setup();
    s.tracker.setPath('/');
    s.tracker.start();
    await settle();
    s.tracker.stop();
    s.tracker.start();
    await settle();
    expect(s.f.bodies).toHaveLength(2);
    expect(s.events()[1]).toMatchObject({ type: 'pageview', landing: false });
    s.tracker.onPageShow();
    await s.flushAll();
    expect(s.events().filter((e) => e.type === 'pageview').at(-1)).toMatchObject({ landing: false });
  });

  it('stays off for navigator.webdriver', async () => {
    const s = setup({ webdriver: true });
    s.tracker.setPath('/');
    s.tracker.start();
    await s.flushAll();
    expect(s.f.bodies).toEqual([]);
    expect(s.win.count() + s.doc.count()).toBe(0);
  });
});

describe('review fixes (#161)', () => {
  it('B1: the soft-navigation snapshot keeps the old page path, also when the next page is not tracked', async () => {
    for (const [next, key] of [['/de/it', '/it'], ['/de/privacy', '/privacy']] as const) {
      const s = setup();
      s.tracker.setPath('/automation');
      s.tracker.start();
      await settle();
      s.win.location.pathname = next; // the App Router has already pushed the new URL
      s.tracker.setPath(key);
      await s.flushAll();
      const snap = s.events().find((e) => e.type === 'engagement')!;
      expect(snap.path, next).toBe('/de/automation');
      expect(canonicalEvent(snap).ok, next).toBe(true);
    }
  });

  it('N1: overlong UTM values and referrer hosts are sent as null, so the batch is not rejected', async () => {
    const long = 'x'.repeat(200);
    const s = setup({ search: `?utm_source=print&utm_campaign=${long}`, referrer: `https://${'a'.repeat(70)}.example.com/` });
    s.tracker.setPath('/automation');
    s.tracker.start();
    await settle();
    const pv = s.events()[0];
    expect(pv).toMatchObject({ utmSource: 'print', utmCampaign: null, referrerHost: null });
    expect(parseEnvelope(JSON.stringify(s.f.bodies[0]))).not.toBeNull();
  });

  it('N2: Allow on an untracked page keeps the landing for the first tracked pageview, flushed at once', async () => {
    const s = setup({ pathname: '/de/privacy', search: '?utm_source=print' });
    s.tracker.setPath('/privacy');
    s.tracker.start();
    await settle();
    expect(s.f.bodies).toEqual([]);
    s.win.location.pathname = '/de/automation';
    s.tracker.setPath('/automation');
    await settle();
    expect(s.f.bodies).toHaveLength(1);
    expect(s.events()[0]).toMatchObject({ type: 'pageview', landing: true, utmSource: 'print', path: '/de/automation' });
  });
});

describe('engagement (§3.5)', () => {
  it('snapshots on hidden and pagehide with engaged time, scroll step and fits', async () => {
    const s = setup();
    s.tracker.setPath('/automation');
    s.tracker.start();
    await settle();
    await s.clock.advance(20_000);
    s.main.top = -1500;
    s.win.dispatch('scroll');
    s.doc.visibilityState = 'hidden';
    s.doc.dispatch('visibilitychange');
    await settle();
    const snap = s.events().find((e) => e.type === 'engagement')!;
    expect(snap).toMatchObject({ engagedMs: 20_000, scrollMax: 75, fits: false, sectionMask: 0, formStarted: false });
  });

  it('heartbeat every 60 s while engaged and grown ≥ 10 s; at most 20 snapshots', async () => {
    const s = setup();
    s.tracker.setPath('/automation');
    s.tracker.start();
    await settle();
    for (let i = 0; i < 30; i += 1) {
      s.win.dispatch('pointerdown');
      await s.clock.advance(30_000);
      s.win.dispatch('keydown');
      await s.clock.advance(30_000);
    }
    await s.flushAll();
    const snaps = s.events().filter((e) => e.type === 'engagement');
    expect(snaps.length).toBe(20);
    expect(snaps.map((e) => e.seq)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it('sets section bits on /automation and formStarted on /contact', async () => {
    const s = setup();
    s.tracker.setPath('/automation');
    s.tracker.start();
    await settle();
    s.reach('hero');
    s.reach('preise');
    s.reach('final');
    await s.flushAll();
    expect(s.events().find((e) => e.type === 'engagement')!.sectionMask).toBe(1 | 8 | 128);

    const c = setup({ pathname: '/de/contact' });
    c.tracker.setPath('/contact');
    c.tracker.start();
    await settle();
    c.doc.dispatch('focusin', { target: fakeEl(fakeNode('input', {}, fakeNode('form'))) });
    await c.flushAll();
    expect(c.events().find((e) => e.type === 'engagement')!.formStarted).toBe(true);
  });
});

describe('clicks (§3.6)', () => {
  const main = fakeNode('main');
  it('counts left and middle clicks, ignores other buttons, caps at 50 per pageview', async () => {
    const s = setup();
    s.tracker.setPath('/automation');
    s.tracker.start();
    await settle();
    const cta = fakeEl(fakeNode('a', { href: '/de/contact?from=automation-hero', 'data-track': 'cta:automation-hero' }, main));
    s.doc.dispatch('click', { target: cta });
    s.doc.dispatch('auxclick', { target: cta, button: 1 });
    s.doc.dispatch('auxclick', { target: cta, button: 2 });
    for (let i = 0; i < 60; i += 1) s.doc.dispatch('click', { target: cta });
    await s.flushAll();
    const clicks = s.events().filter((e) => e.type === 'click');
    expect(clicks).toHaveLength(50);
    expect(clicks[0]).toMatchObject({ kind: 'cta', target: 'automation-hero', area: 'main' });
  });

  it('faq once per item and only on open; outbound flushes at once after a snapshot', async () => {
    const s = setup();
    s.tracker.setPath('/automation');
    s.tracker.start();
    await settle();
    const faq = (expanded: string) => fakeEl(fakeNode('button', { 'data-track': 'faq:cost', 'aria-expanded': expanded }, main));
    s.doc.dispatch('click', { target: faq('false') });
    s.doc.dispatch('click', { target: faq('true') });
    s.doc.dispatch('click', { target: faq('false') });
    const bodiesBefore = s.f.bodies.length;
    s.doc.dispatch('click', { target: fakeEl(fakeNode('a', { href: 'https://www.linkedin.com/in/x' }, fakeNode('footer'))) });
    await settle();
    expect(s.f.bodies.length).toBe(bodiesBefore + 1);
    const types = s.events().map((e) => `${e.type}:${e.kind ?? ''}`);
    expect(types.filter((t) => t === 'click:faq')).toHaveLength(1);
    expect(types.slice(-2)).toEqual(['engagement:', 'click:outbound']);
    expect(s.events().at(-1)).toMatchObject({ target: 'linkedin.com', area: 'footer' });
  });
});

describe('hygiene and contract', () => {
  it('never sends a query, fragment, full URL or mailto/tel value', async () => {
    const s = setup({ search: '?utm_source=print&secret=1', referrer: 'https://www.google.com/?q=secret#frag' });
    s.tracker.setPath('/automation');
    s.tracker.start();
    await settle();
    s.doc.dispatch('click', { target: fakeEl(fakeNode('a', { href: 'mailto:someone@example.org' }, main())) });
    s.doc.dispatch('click', { target: fakeEl(fakeNode('a', { href: 'tel:+41790000000' }, main())) });
    s.doc.dispatch('click', { target: fakeEl(fakeNode('a', { href: '/de/it?x=secret#top' }, fakeNode('header'))) });
    await s.flushAll();
    const text = JSON.stringify(s.f.bodies);
    for (const needle of ['secret', '#', 'mailto:', 'tel:', 'someone@', '+4179', 'https://', '?']) expect(text).not.toContain(needle);
    function main() {
      return fakeNode('main');
    }
  });

  it('every envelope the tracker sends passes the server schema and the C13 mirror (M3 round trip)', async () => {
    const s = setup({ search: '?utm_source=print&utm_medium=shortlink&utm_campaign=ki', referrer: 'https://www.google.com/' });
    s.tracker.setPath('/automation');
    s.tracker.start();
    await settle();
    s.doc.dispatch('click', { target: fakeEl(fakeNode('a', { href: '/de/contact?from=automation-hero', 'data-track': 'cta:automation-hero' }, fakeNode('main'))) });
    s.doc.dispatch('click', { target: fakeEl(fakeNode('a', { href: '/de/it' }, fakeNode('header'))) });
    s.doc.dispatch('click', { target: fakeEl(fakeNode('button', { 'data-track': 'lang:en' }, fakeNode('header'))) });
    s.win.location.pathname = '/de/contact';
    s.tracker.setPath('/contact');
    await s.flushAll();
    const now = s.clock.t;
    let n = 0;
    for (const body of s.f.bodies) {
      const env = parseEnvelope(JSON.stringify(body));
      expect(env, JSON.stringify(body).slice(0, 120)).not.toBeNull();
      for (const raw of env!.events) {
        const c = canonicalEvent(raw);
        expect(c.ok, JSON.stringify(raw)).toBe(true);
        if (!c.ok) continue;
        const out = toForwardEvent(c.event, {
          visitorId: crypto.randomUUID(), receivedAtMs: now, sentAt: env!.sentAt, viewport: null,
          device: { country: 'CH', deviceClass: 'desktop', browserFamily: 'firefox', osFamily: 'macos' },
        });
        expect(classify(out, now)).toBe('accepted');
        n += 1;
      }
    }
    expect(n).toBeGreaterThanOrEqual(6);
  });

  it('a stopped tracker sends nothing: no listeners, no timers (H3)', async () => {
    const s = setup();
    s.tracker.setPath('/automation');
    s.tracker.start();
    await settle();
    s.doc.dispatch('click', { target: fakeEl(fakeNode('a', { href: '/x', 'data-track': 'cta:automation-hero' }, fakeNode('main'))) });
    s.tracker.stop();
    expect(s.win.count() + s.doc.count()).toBe(0);
    await s.clock.advance(300_000);
    expect(s.f.bodies).toHaveLength(1);
    expect(s.clock.pending()).toBe(0);
  });

  it('asks allowed() before sending', async () => {
    const s = setup();
    s.state.allowed = false;
    s.tracker.setPath('/');
    s.tracker.start();
    await s.flushAll();
    expect(s.f.bodies).toEqual([]);
  });

  it('maps the viewport to the five buckets', () => {
    expect([320, 480, 800, 1024, 1439, 1440, 2560].map(viewportBucket)).toEqual(['<480', '480-767', '768-1023', '1024-1439', '1024-1439', '>=1440', '>=1440']);
  });
});
