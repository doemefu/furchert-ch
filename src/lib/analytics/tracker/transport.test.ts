import { describe, expect, it } from 'vitest';
import { Clock, fakeLocks, recordingFetch, settle, type Reply } from './testEnv';
import { Transport, type ClientEvent } from './transport';

function setup(replies: Reply[] = [], opts: { locks?: boolean; allowed?: () => boolean } = {}) {
  const clock = new Clock();
  const f = recordingFetch(replies);
  const locks = opts.locks ? fakeLocks() : null;
  const t = new Transport({
    fetch: f.fetch,
    now: () => clock.t,
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    locks,
    allowed: opts.allowed ?? (() => true),
    envelope: () => ({ cv: 1, consentDate: '2026-11-08', viewport: '1024-1439' }),
  });
  t.restart();
  return { t, clock, ...f, locks };
}
const e = (i: number, pad = 0): ClientEvent => ({ eventId: `e${i}`, type: 'click', pad: 'x'.repeat(pad) });

describe('Transport (§3.9)', () => {
  it('posts JSON with keepalive, same-origin credentials and its own AbortController signal', async () => {
    const { t, urls, inits, bodies } = setup();
    t.push(e(1), true);
    await settle();
    expect(urls).toEqual(['/api/v']);
    expect(inits[0]).toMatchObject({ method: 'POST', keepalive: true, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } });
    expect(inits[0].signal).toBeInstanceOf(AbortSignal);
    expect(bodies[0]).toMatchObject({ v: 1, cv: 1, consentDate: '2026-11-08', viewport: '1024-1439', events: [e(1)] });
    expect(typeof bodies[0].sentAt).toBe('number');
  });

  it('flushes at 20 events or 10 s after the first queued event', async () => {
    const a = setup();
    a.t.push(e(0), true);
    await settle();
    for (let i = 1; i <= 19; i += 1) a.t.push(e(i));
    await settle();
    expect(a.bodies).toHaveLength(1);
    a.t.push(e(20));
    await settle();
    expect(a.bodies).toHaveLength(2);
    expect((a.bodies[1].events as unknown[]).length).toBe(20);

    const b = setup();
    b.t.push(e(0), true);
    await settle();
    b.t.push(e(1));
    await b.clock.advance(9_999);
    expect(b.bodies).toHaveLength(1);
    await b.clock.advance(1);
    expect(b.bodies).toHaveLength(2);
  });

  it('keeps every body ≤ 7 680 bytes, splitting in order', async () => {
    const { t, bodies, inits } = setup();
    t.push(e(0), true);
    await settle();
    for (let i = 1; i <= 20; i += 1) t.push(e(i, 900));
    await settle();
    for (const init of inits) expect(String(init.body).length).toBeLessThanOrEqual(7_680);
    expect(bodies.slice(1).flatMap((b) => (b.events as ClientEvent[]).map((x) => x.eventId))).toEqual(
      Array.from({ length: 20 }, (_, i) => `e${i + 1}`),
    );
  });

  it('runs one request at a time', async () => {
    let release: () => void = () => {};
    const { t, bodies } = setup([() => new Promise((r) => (release = () => r(new Response(null, { status: 204 }))))]);
    t.push(e(1), true);
    await settle();
    t.push(e(2), true);
    await settle();
    expect(bodies).toHaveLength(1);
    release();
    await settle();
    expect(bodies).toHaveLength(2);
  });

  it('retries network errors and 5xx after 5 s, then 30 s, then drops; no retry on other 4xx', async () => {
    const { t, clock, bodies } = setup(['network', 503, 'network']);
    t.push(e(1), true);
    await settle();
    await clock.advance(4_999);
    expect(bodies).toHaveLength(1);
    await clock.advance(1);
    expect(bodies).toHaveLength(2);
    await clock.advance(30_000);
    expect(bodies).toHaveLength(3);
    await clock.advance(120_000);
    expect(bodies).toHaveLength(3);

    const four = setup([400]);
    four.t.push(e(1), true);
    await settle();
    await four.clock.advance(60_000);
    expect(four.bodies).toHaveLength(1);
  });

  it('pauses 60 s after a 429 and then sends the same events', async () => {
    const { t, clock, bodies } = setup([429]);
    t.push(e(1), true);
    await settle();
    t.push(e(2), true);
    await clock.advance(59_000);
    expect(bodies).toHaveLength(1);
    await clock.advance(1_000);
    expect(bodies).toHaveLength(2);
    expect((bodies[1].events as ClientEvent[]).map((x) => x.eventId)).toEqual(['e1', 'e2']);
  });

  it('abortInFlight aborts every in-flight request and does not retry them', async () => {
    const { t, inits, clock, bodies } = setup([
      () => new Promise((_r, reject) => inits[0].signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))),
    ]);
    t.push(e(1), true);
    await settle();
    t.abortInFlight();
    await settle();
    expect(inits[0].signal!.aborted).toBe(true);
    await clock.advance(60_000);
    expect(bodies).toHaveLength(1);
  });

  describe('a stopped transport sends nothing (H3)', () => {
    it('pending 10 s flush timer', async () => {
      const { t, clock, bodies } = setup();
      t.push(e(0), true);
      await settle();
      t.push(e(1));
      t.stop();
      await clock.advance(60_000);
      expect(bodies).toHaveLength(1);
      expect(clock.pending()).toBe(0);
    });
    it('pending retry timer', async () => {
      const { t, clock, bodies } = setup(['network']);
      t.push(e(1), true);
      await settle();
      t.stop();
      await clock.advance(60_000);
      expect(bodies).toHaveLength(1);
    });
    it('429 pause', async () => {
      const { t, clock, bodies } = setup([429]);
      t.push(e(1), true);
      await settle();
      t.stop();
      await clock.advance(120_000);
      expect(bodies).toHaveLength(1);
    });
    it('waiting for the first-flush lock', async () => {
      const clock = new Clock();
      const f = recordingFetch();
      const locks = fakeLocks();
      let release: () => void = () => {};
      // Another tab holds the lock.
      void locks.request('fa-first-flush', { signal: new AbortController().signal }, () => new Promise<void>((r) => (release = r)));
      const tr = new Transport({
        fetch: f.fetch,
        now: () => clock.t,
        setTimeout: clock.setTimeout,
        clearTimeout: clock.clearTimeout,
        locks,
        allowed: () => true,
        envelope: () => ({ cv: 1, consentDate: '2026-11-08', viewport: null }),
      });
      tr.restart();
      tr.push(e(1), true);
      await settle();
      tr.stop();
      release();
      await settle();
      expect(f.bodies).toEqual([]);
    });
    it('allowed() false right before the fetch', async () => {
      let ok = true;
      const { t, bodies } = setup([], { allowed: () => ok });
      ok = false;
      t.push(e(1), true);
      await settle();
      expect(bodies).toEqual([]);
    });
  });

  it('serialises the first flush of parallel tabs with Web Locks, and runs unserialised without', async () => {
    const locks = fakeLocks();
    const order: string[] = [];
    const tab = (name: string) => {
      const clock = new Clock();
      let release: () => void = () => {};
      const tr = new Transport({
        fetch: (async () => {
          order.push(`${name} sent`);
          await new Promise<void>((r) => (release = r));
          order.push(`${name} answered`);
          return new Response(null, { status: 204 });
        }) as unknown as typeof fetch,
        now: () => clock.t,
        setTimeout: clock.setTimeout,
        clearTimeout: clock.clearTimeout,
        locks,
        allowed: () => true,
        envelope: () => ({ cv: 1, consentDate: '2026-11-08', viewport: null }),
      });
      tr.restart();
      return { tr, release: () => release() };
    };
    const a = tab('A');
    const b = tab('B');
    a.tr.push(e(1), true);
    b.tr.push(e(2), true);
    await settle();
    expect(order).toEqual(['A sent']);
    a.release();
    await settle();
    expect(order).toEqual(['A sent', 'A answered', 'B sent']);
    b.release();
    await settle();

    const c = setup();
    const d = setup();
    c.t.push(e(1), true);
    d.t.push(e(2), true);
    await settle();
    expect(c.bodies).toHaveLength(1);
    expect(d.bodies).toHaveLength(1);
  });

  it('awaitFirstFlush resolves on the first answer or after maxMs', async () => {
    const { t } = setup();
    let done = false;
    void t.awaitFirstFlush(1_000).then(() => (done = true));
    t.push(e(1), true);
    await settle();
    expect(done).toBe(true);

    const slow = setup([() => new Promise(() => {})]);
    let timedOut = false;
    slow.t.push(e(1), true);
    void slow.t.awaitFirstFlush(1_000).then(() => (timedOut = true));
    await slow.clock.advance(999);
    expect(timedOut).toBe(false);
    await slow.clock.advance(1);
    expect(timedOut).toBe(true);
  });
});
