import { describe, expect, it, vi } from 'vitest';
import { enquiryEvent, goalEvent, type ForwardEvent } from './forwardModel';
import { createForwardQueue, type QueueDeps } from './queue';

type Reply = { status: number; body?: unknown } | 'network';
function setup(replies: Reply[] = [], over: Partial<QueueDeps> = {}) {
  const clock = { t: Date.parse('2026-11-08T15:00:00Z') };
  const calls: { events: ForwardEvent[]; edgeDrops: Record<string, number>; bytes: number; auth: string }[] = [];
  const logs: string[] = [];
  const fetchFn = vi.fn(async (_url: string, init: RequestInit) => {
    const body = String(init.body);
    const parsed = JSON.parse(body);
    calls.push({ ...parsed, bytes: Buffer.byteLength(body), auth: (init.headers as Record<string, string>).Authorization });
    const r = replies.shift() ?? { status: 200, body: { accepted: parsed.events.length, duplicates: 0, rejected: 0, capped: false } };
    if (r === 'network') throw new TypeError('fetch failed: secret detail');
    return new Response(r.body === undefined ? '' : JSON.stringify(r.body), { status: r.status });
  });
  const token = { n: 0, fail: false };
  const deps: QueueDeps = {
    fetch: fetchFn as unknown as typeof fetch,
    now: () => clock.t,
    getToken: async () => {
      if (token.fail) throw new Error('token request failed: HTTP 503');
      return `tok${++token.n}`;
    },
    invalidateToken: vi.fn(),
    eventsUrl: () => 'http://ds/api/webanalytics/events',
    log: (line) => logs.push(line),
    ...over,
  };
  return { q: createForwardQueue(deps), calls, logs, clock, fetchFn, token, deps };
}
const ev = (n: number, extra = ''): ForwardEvent[] =>
  Array.from({ length: n }, (_, i) => ({ ...enquiryEvent(Date.now()), eventId: crypto.randomUUID(), type: 'pageview', path: `/p${extra}${i}` }) as ForwardEvent);
const big = (n: number, pad: number): ForwardEvent[] => ev(n).map((e) => ({ ...e, utmCampaign: 'x'.repeat(pad) }));

describe('forward queue (§5.10)', () => {
  it('sends batches in order with a Bearer token and all nine edgeDrops keys', async () => {
    const { q, calls } = setup();
    const events = ev(3);
    q.enqueue(events);
    await q.flush();
    expect(calls).toHaveLength(1);
    expect(calls[0].events.map((e) => e.eventId)).toEqual(events.map((e) => e.eventId));
    expect(calls[0].auth).toBe('Bearer tok1');
    expect(Object.keys(calls[0].edgeDrops).sort()).toEqual(
      ['bot', 'consent', 'expired', 'invalid', 'mint_limited', 'overflow', 'path', 'rate_limited', 'signed_in'],
    );
  });

  it('caps batches at 200 events and 48 KiB of the full envelope, keeping order across batches', async () => {
    const { q, calls } = setup();
    // Small stand-ins: a full 28-field event is ~550 bytes, so real batches
    // hit the 48 KiB bound first (checked below).
    const many = Array.from({ length: 450 }, () => ({ eventId: crypto.randomUUID() }) as unknown as ForwardEvent);
    q.enqueue(many);
    await q.flushAll();
    expect(calls.map((c) => c.events.length)).toEqual([200, 200, 50]);
    expect(calls.flatMap((c) => c.events.map((e) => e.eventId))).toEqual(many.map((e) => e.eventId));

    const sized = setup();
    const heavy = big(150, 400);
    sized.q.enqueue(heavy);
    await sized.q.flushAll();
    for (const c of sized.calls) expect(c.bytes).toBeLessThanOrEqual(48 * 1024);
    expect(sized.calls.length).toBeGreaterThan(1);
    expect(sized.calls.flatMap((c) => c.events.map((e) => e.eventId))).toEqual(heavy.map((e) => e.eventId));
  });

  it('splits a batch on 413 and retries without dropping valid events, order preserved', async () => {
    const { q, calls } = setup([{ status: 413 }, { status: 413 }]);
    const events = ev(8);
    q.enqueue(events);
    await q.flushAll();
    expect(calls.map((c) => c.events.length)).toEqual([8, 4, 2, 2, 4]);
    const delivered = calls.slice(2).flatMap((c) => c.events.map((e) => e.eventId));
    expect(delivered).toEqual(events.map((e) => e.eventId));
  });

  it('drops a single event that alone gets 413 and counts it invalid', async () => {
    const { q, calls } = setup([{ status: 413 }]);
    q.enqueue(ev(1));
    await q.flushAll();
    q.enqueue(ev(1));
    await q.flushAll();
    expect(calls).toHaveLength(2);
    expect(calls[1].edgeDrops.invalid).toBe(1);
  });

  it('sends edgeDrops on the first attempt only; a retry sends them zeroed', async () => {
    const { q, calls, clock } = setup(['network']);
    q.countDrop('consent', 2);
    q.enqueue(ev(1));
    await q.flush();
    clock.t += 5_000;
    await q.flush();
    expect(calls[0].edgeDrops.consent).toBe(2);
    expect(calls[1].edgeDrops.consent).toBe(0);
  });

  it('puts edgeDrops back after a 413 or a failed token request, not after a network error (N5)', async () => {
    const r413 = setup([{ status: 413 }]);
    r413.q.countDrop('consent', 3);
    r413.q.enqueue(ev(2));
    await r413.q.flushAll();
    expect(r413.calls.map((c) => c.edgeDrops.consent)).toEqual([3, 0, 0]);
    r413.q.enqueue(ev(1, 'x'));
    await r413.q.flushAll();
    expect(r413.calls.at(-1)!.edgeDrops.consent).toBe(3);

    const tok = setup();
    tok.token.fail = true;
    tok.q.countDrop('path', 2);
    tok.q.enqueue(ev(1));
    await tok.q.flush();
    expect(tok.q.pendingDrops().path).toBe(2);

    const net = setup(['network']);
    net.q.countDrop('path', 2);
    net.q.enqueue(ev(1));
    await net.q.flush();
    expect(net.q.pendingDrops().path).toBe(0);
  });

  it('adds a fixed configuration hint to the summary after a 403 (N6)', async () => {
    const { q, logs, clock } = setup([{ status: 403 }]);
    q.enqueue(ev(1));
    await q.flushAll();
    clock.t += 61_000;
    await q.flush();
    expect(logs.join('\n')).toMatch(/dropped403=1 .*hint=check-analytics-write-scope-and-webanalytics\.api\.write-clients/);
  });

  it('clamps drop counters at 1 000 000 and sends a drops-only batch at most once a minute (M4)', async () => {
    const { q, calls, clock } = setup();
    q.countDrop('signed_in', 2_000_000);
    await q.flush();
    expect(calls).toHaveLength(1);
    expect(calls[0].events).toEqual([]);
    expect(calls[0].edgeDrops.signed_in).toBe(1_000_000);
    q.countDrop('signed_in', 1);
    clock.t += 30_000;
    await q.flush();
    expect(calls).toHaveLength(1);
    clock.t += 31_000;
    await q.flush();
    expect(calls).toHaveLength(2);
  });

  it('handles 400, 401 (one token refresh), a second 401 and 403 by dropping and logging (L9)', async () => {
    const r400 = setup([{ status: 400 }]);
    r400.q.enqueue(ev(2));
    await r400.q.flushAll();
    expect(r400.q.size()).toBe(0);

    const r401 = setup([{ status: 401 }]);
    r401.q.enqueue(ev(2));
    await r401.q.flushAll();
    expect(r401.deps.invalidateToken).toHaveBeenCalledTimes(1);
    expect(r401.calls.map((c) => c.auth)).toEqual(['Bearer tok1', 'Bearer tok2']);
    expect(r401.q.size()).toBe(0);

    const twice = setup([{ status: 401 }, { status: 401 }]);
    twice.q.enqueue(ev(2));
    await twice.q.flushAll();
    expect(twice.calls).toHaveLength(2);
    expect(twice.q.size()).toBe(0);

    const r403 = setup([{ status: 403 }]);
    r403.q.enqueue(ev(2));
    await r403.q.flushAll();
    expect(r403.q.size()).toBe(0);
    r403.clock.t += 61_000;
    await r403.q.flush();
    expect(r403.logs.join('\n')).toMatch(/403/);
  });

  it('keeps events on network errors, 5xx and token failures, and opens the circuit for 60 s after 3 failures', async () => {
    const { q, calls, clock, token } = setup(['network', { status: 503 }]);
    q.enqueue(ev(1));
    await q.flush();
    clock.t += 5_000;
    await q.flush();
    token.fail = true;
    clock.t += 5_000;
    await q.flush();
    expect(q.size()).toBe(1);
    token.fail = false;
    clock.t += 5_000;
    await q.flush();
    expect(calls).toHaveLength(2);
    clock.t += 56_000;
    await q.flush();
    expect(calls).toHaveLength(3);
    expect(q.size()).toBe(0);
  });

  it('drops events older than 60 min before each attempt (expired)', async () => {
    const { q, calls, clock } = setup(['network']);
    q.enqueue(ev(2));
    await q.flush();
    clock.t += 61 * 60_000;
    q.enqueue(ev(1, 'n'));
    await q.flushAll();
    expect(calls[1].events).toHaveLength(1);
    expect(calls[1].edgeDrops.expired).toBe(2);
  });

  it('caps analytics events at 2 000 (overflow) but always takes goal and enquiry (arch 4)', async () => {
    const { q } = setup();
    q.enqueue(ev(2_000));
    q.enqueue(ev(5));
    expect(q.size()).toBe(2_000);
    q.enqueue([enquiryEvent(Date.now()), goalEvent(crypto.randomUUID(), 'de', Date.now())], { priority: true });
    expect(q.size()).toBe(2_002);
    expect(q.pendingDrops().overflow).toBe(5);
  });

  it('runs one request at a time and uses a 10 s timeout', async () => {
    const signals: AbortSignal[] = [];
    let release: () => void = () => {};
    const { q, calls } = setup([], {
      fetch: (async (_u: string, init: RequestInit) => {
        signals.push(init.signal as AbortSignal);
        await new Promise<void>((r) => (release = r));
        return new Response('{}', { status: 200 });
      }) as unknown as typeof fetch,
    });
    q.enqueue(ev(1));
    const a = q.flush();
    const b = q.flush();
    await Promise.resolve();
    release();
    await Promise.all([a, b]);
    expect(signals).toHaveLength(1);
    expect(calls).toHaveLength(0);
  });

  it('logs at most one summary line per minute, counts only, never error text (C17, M5)', async () => {
    const { q, logs, clock } = setup(['network', 'network']);
    q.enqueue(ev(1));
    await q.flush();
    clock.t += 5_000;
    await q.flush();
    expect(logs.length).toBeLessThanOrEqual(1);
    clock.t += 61_000;
    await q.flush();
    const text = logs.join('\n');
    expect(text).toMatch(/^\[analytics\] /m);
    expect(text).not.toMatch(/secret detail|fetch failed|tok\d|\/p0/);
  });
});
