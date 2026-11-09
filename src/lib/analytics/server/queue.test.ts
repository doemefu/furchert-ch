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

// ── WA-5 (#157): two lanes, capped 429, erasure ────────────────────────────

const visitor = (id: string, n: number, tag = 'v'): ForwardEvent[] => ev(n, tag).map((e) => ({ ...e, visitorId: id }));
const enquiry = () => enquiryEvent(Date.now());
const goal = (id: string) => goalEvent(id, 'de', Date.now());
const capped = (retryAt: string, capScope = 'hour') => ({ status: 429, body: { accepted: 0, duplicates: 0, rejected: 0, capped: true, capScope, retryAt } });
const ids = (c: { events: ForwardEvent[] }) => c.events.map((e) => e.eventId);
const types = (c: { events: ForwardEvent[] }) => c.events.map((e) => e.type);

describe('forward queue lanes (WA-5 H1)', () => {
  it('a fresh batch takes the priority lane first, then analytics; capacity applies to analytics only', async () => {
    const { q, calls } = setup();
    q.enqueue(ev(2));
    q.enqueue([enquiry()], { priority: true });
    await q.flush();
    expect(types(calls[0])).toEqual(['enquiry', 'pageview', 'pageview']);
  });

  it('a 200 on a priority-only batch removes exactly those items', async () => {
    const { q, calls, clock } = setup([capped('2026-11-08T15:30:00Z')]);
    const a = ev(3);
    q.enqueue(a);
    await q.flush(); // capped → paused
    q.enqueue([enquiry(), goal(crypto.randomUUID())], { priority: true });
    clock.t += 5_000;
    await q.flush();
    expect(types(calls[1])).toEqual(['enquiry', 'goal']);
    expect(q.size()).toBe(3);
    clock.t = Date.parse('2026-11-08T15:30:01Z');
    await q.flush();
    expect(ids(calls[2])).toEqual(a.map((e) => e.eventId));
    expect(q.size()).toBe(0);
  });
});

describe('capped 429 (§5.10, M2, N1)', () => {
  it('pauses analytics until retryAt (clamped), keeps the events, restores drops, no circuit failure, no hot loop', async () => {
    const { q, calls, clock, logs } = setup([capped('2026-11-08T15:30:00Z')]);
    q.countDrop('consent', 2);
    q.enqueue(ev(2));
    await q.flushAll();
    expect(calls).toHaveLength(1);
    expect(q.size()).toBe(2);
    expect(q.pendingDrops().consent).toBe(2);
    clock.t += 61_000;
    await q.flush(); // paused, empty priority lane: only the drops-only batch may go
    expect(calls).toHaveLength(2);
    expect(calls[1].events).toEqual([]);
    expect(logs.join('\n')).toMatch(/capped=hour pausedFor=\d+/);
    clock.t = Date.parse('2026-11-08T15:30:00Z');
    await q.flush();
    expect(calls[2].events).toHaveLength(2);
  });

  it('clamps retryAt to now + 1 s … now + 25 h', async () => {
    const past = setup([capped('2020-01-01T00:00:00Z')]);
    past.q.enqueue(ev(1));
    await past.q.flush();
    past.clock.t += 999;
    await past.q.flush();
    expect(past.calls).toHaveLength(1);
    past.clock.t += 2;
    await past.q.flush();
    expect(past.calls).toHaveLength(2);

    // Three days ahead is clamped to 25 h (events would expire long before; the log shows the pause).
    const far = setup([capped('2026-11-11T15:00:00Z', 'day')]);
    far.q.enqueue([enquiry()], { priority: true });
    far.q.enqueue(ev(1));
    await far.q.flush();
    far.clock.t += 5_000;
    await far.q.flush(); // the enquiry goes alone while paused
    expect(types(far.calls[1])).toEqual(['enquiry']);
    far.clock.t += 56_000;
    far.q.countDrop('bot');
    await far.q.flush();
    expect(far.logs.join('\n')).toMatch(/capped=day pausedFor=89939\b/);
  });

  it('a 429 on a priority-only batch or without a valid body counts as a failure', async () => {
    const prio = setup([capped('2026-11-08T16:00:00Z'), capped('2026-11-08T16:00:00Z'), { status: 429, body: 'nope' }, { status: 429 }]);
    prio.q.enqueue(ev(1));
    await prio.q.flush(); // pause
    prio.q.enqueue([enquiry()], { priority: true });
    prio.clock.t += 1_000;
    await prio.q.flush(); // priority-only 429: failure 1
    prio.clock.t += 1_000;
    await prio.q.flush(); // malformed: failure 2
    prio.clock.t += 1_000;
    await prio.q.flush(); // no body: failure 3 → circuit open
    prio.clock.t += 1_000;
    await prio.q.flush();
    expect(prio.calls).toHaveLength(4);
    expect(prio.q.size()).toBe(2);
  });

  it('N1: a mixed 413 split, then a capped 429 on half 1 → no analytics before retryAt, priority still flows', async () => {
    const { q, calls, clock } = setup([{ status: 413 }, capped('2026-11-08T16:00:00Z')]);
    q.enqueue([enquiry()], { priority: true });
    q.enqueue(ev(3));
    await q.flush(); // 413 → halves [enquiry, pv] and [pv, pv]
    await q.flush(); // half 1 capped → splits discarded, paused
    expect(types(calls[1])).toEqual(['enquiry', 'pageview']);
    q.enqueue([goal(crypto.randomUUID())], { priority: true });
    clock.t += 5_000;
    await q.flush();
    expect(types(calls[2])).toEqual(['enquiry', 'goal']);
    clock.t += 5_000;
    await q.flush();
    expect(calls).toHaveLength(3);
    clock.t = Date.parse('2026-11-08T16:00:00Z');
    await q.flushAll();
    expect(calls.slice(3).flatMap(types)).toEqual(['pageview', 'pageview', 'pageview']);
  });

  it('a 413 split while paused splits the priority-only batch; the analytics lane is untouched', async () => {
    const { q, calls, clock } = setup([capped('2026-11-08T16:00:00Z'), { status: 413 }]);
    q.enqueue(ev(2));
    await q.flush();
    q.enqueue([enquiry(), enquiry()], { priority: true });
    clock.t += 5_000;
    await q.flushAll();
    expect(calls.map((c) => c.events.length)).toEqual([2, 2, 1, 1]);
    expect(calls.slice(1).flatMap(types)).toEqual(['enquiry', 'enquiry', 'enquiry', 'enquiry']);
    expect(q.size()).toBe(2);
  });
});

describe('N5: a failed batch is retried with the same composition', () => {
  it('after a 5xx the next attempt sends the same batch, minus items erased or expired meanwhile', async () => {
    const { q, calls, clock } = setup([{ status: 503 }]);
    const a = visitor('a', 2);
    const b = visitor('b', 1);
    q.enqueue([...a, ...b]);
    await q.flush();
    q.enqueue(ev(1, 'late'));
    await q.purgeVisitors(['b']);
    clock.t += 5_000;
    await q.flush();
    expect(ids(calls[1])).toEqual(a.map((e) => e.eventId));
    await q.flush();
    expect(calls[2].events).toHaveLength(1);
  });
});

describe('enquiry path regression (L9)', () => {
  it('normal, 5xx retry, 413 split and 401 refresh deliver the enquiry with the same shape', async () => {
    for (const replies of [[], [{ status: 503 }], [{ status: 413 }], [{ status: 401 }]] as Reply[][]) {
      const { q, calls, clock } = setup(replies);
      const e = enquiry();
      q.enqueue([e], { priority: true });
      q.enqueue(ev(1));
      await q.flushAll();
      clock.t += 5_000;
      await q.flushAll();
      const delivered = calls.at(-1)!.events.concat(calls.length > 1 ? calls.at(-2)!.events : []);
      expect(delivered.find((x) => x.eventId === e.eventId)).toEqual(e);
      expect(q.size()).toBe(0);
    }
  });
});

describe('purgeVisitors (§5.4, M3)', () => {
  it('a queued batch of the id is never sent; other visitors keep their order; the id is not re-enqueued', async () => {
    const { q, calls } = setup();
    const a = visitor('a', 2);
    const b = visitor('b', 2);
    q.enqueue([a[0], b[0], a[1], b[1]]);
    q.enqueue([goal('a')], { priority: true });
    expect(await q.purgeVisitors(['a'])).toEqual({ settled: true });
    q.enqueue(visitor('a', 1, 'again'));
    await q.flushAll();
    expect(calls.flatMap(ids)).toEqual(b.map((e) => e.eventId));
  });

  it('purge during an in-flight priority-only batch: matching analytics go at once, nothing of the id is sent later', async () => {
    let release: (r: Response) => void = () => {};
    const sent: ForwardEvent[][] = [];
    let n = 0;
    const { q, clock } = setup([], {
      fetch: (async (_u: string, init: RequestInit) => {
        sent.push(JSON.parse(String(init.body)).events);
        n += 1;
        if (n === 1) return new Response(JSON.stringify(capped('2026-11-08T15:30:00Z').body), { status: 429 });
        if (n === 2) return new Promise<Response>((r) => (release = r));
        return new Response('{}', { status: 200 });
      }) as unknown as typeof fetch,
    });
    q.enqueue([...visitor('a', 2), ...visitor('b', 1)]);
    await q.flush(); // capped: paused, analytics wait
    q.enqueue([goal('a'), enquiry()], { priority: true });
    clock.t += 5_000;
    const flushing = q.flush(); // in flight: the priority-only batch [goal(a), enquiry]
    await Promise.resolve();
    expect(sent[1].map((e) => e.type)).toEqual(['goal', 'enquiry']);
    const purge = q.purgeVisitors(['a']);
    expect(q.size()).toBe(3); // a×2 removed at once; goal(a), enquiry (in flight) and b stay
    release(new Response('{}', { status: 200 }));
    await flushing;
    expect(await purge).toEqual({ settled: true });
    clock.t = Date.parse('2026-11-08T15:30:00Z');
    await q.flushAll();
    expect(sent.slice(2).flat().map((e) => e.visitorId)).toEqual(['b']);
    expect(q.size()).toBe(0);
  });

  it('a failed in-flight batch is not resent for the erased id (retry after delete)', async () => {
    let fail: (e: Error) => void = () => {};
    const bodies: ForwardEvent[][] = [];
    let first = true;
    const { q, clock } = setup([], {
      fetch: (async (_u: string, init: RequestInit) => {
        bodies.push(JSON.parse(String(init.body)).events);
        if (first) {
          first = false;
          return new Promise<Response>((_r, rej) => (fail = rej));
        }
        return new Response('{}', { status: 200 });
      }) as unknown as typeof fetch,
    });
    q.enqueue([...visitor('a', 2), ...visitor('b', 1)]);
    const flushing = q.flush();
    await Promise.resolve();
    const purge = q.purgeVisitors(['a']);
    fail(new TypeError('network'));
    await flushing;
    await purge;
    clock.t += 5_000;
    await q.flushAll();
    expect(bodies[1].map((e) => e.visitorId)).toEqual(['b']);
  });

  it('times out after maxWaitMs with settled: false; onInFlightSettled fires once the attempt settles', async () => {
    let release: (r: Response) => void = () => {};
    const { q } = setup([], {
      fetch: (async () => new Promise<Response>((r) => (release = r))) as unknown as typeof fetch,
      sleep: async () => {},
    });
    q.enqueue(visitor('a', 1));
    const flushing = q.flush();
    await Promise.resolve();
    expect(await q.purgeVisitors(['a'], 10_500)).toEqual({ settled: false });
    const fired = vi.fn();
    q.onInFlightSettled(fired);
    expect(fired).not.toHaveBeenCalled();
    release(new Response('{}', { status: 200 }));
    await flushing;
    await Promise.resolve();
    expect(fired).toHaveBeenCalledTimes(1);
    const now = vi.fn();
    q.onInFlightSettled(now);
    expect(now).toHaveBeenCalledTimes(1);
  });

  it('erased ids expire after 2 h; the set evicts the oldest at its cap', async () => {
    const { q, clock } = setup();
    await q.purgeVisitors(['a']);
    q.enqueue(visitor('a', 1));
    expect(q.size()).toBe(0);
    clock.t += 2 * 3_600_000 + 1;
    q.enqueue(visitor('a', 1));
    expect(q.size()).toBe(1);

    const cap = setup();
    await cap.q.purgeVisitors(Array.from({ length: 10_001 }, (_, i) => `id${i}`));
    cap.q.enqueue([...visitor('id0', 1), ...visitor('id1', 1)]);
    expect(cap.q.size()).toBe(1);
  });
});

describe('#172 review: W1, S4, S5', () => {
  it('W1: a valid capped 429 puts the drops back also for a priority-only or drops-only batch (still a failure)', async () => {
    const prio = setup([capped('2026-11-08T15:30:00Z')]);
    prio.q.countDrop('bot', 3);
    prio.q.enqueue([enquiry()], { priority: true });
    await prio.q.flush();
    expect(prio.q.pendingDrops().bot).toBe(3);
    expect(prio.q.size()).toBe(1);

    const only = setup([capped('2026-11-08T15:30:00Z')]);
    only.q.countDrop('consent', 2);
    await only.q.flush(); // drops-only batch
    expect(only.calls[0].events).toEqual([]);
    expect(only.q.pendingDrops().consent).toBe(2);
  });

  it('S5: the pause is clamped against the time of the response, not of the attempt start', async () => {
    const holder: { clock?: { t: number } } = {};
    let calls = 0;
    const s = setup([], {
      fetch: (async () => {
        calls += 1;
        if (calls > 1) return new Response('{}', { status: 200 });
        holder.clock!.t += 5_000; // the first POST takes 5 s
        return new Response(JSON.stringify(capped('2020-01-01T00:00:00Z').body), { status: 429 });
      }) as unknown as typeof fetch,
    });
    holder.clock = s.clock;
    s.q.enqueue(ev(1));
    await s.q.flush(); // retryAt in the past → pause until response time + 1 s
    s.clock.t += 999;
    s.q.enqueue([enquiry()], { priority: true });
    await s.q.flush();
    // Still paused: the priority-only batch goes out alone.
    expect(s.q.size()).toBe(1);
  });

  it('S4: the purge wait timer is cancelled when the in-flight attempt settles first', async () => {
    const aborted: boolean[] = [];
    let release: (r: Response) => void = () => {};
    const { q } = setup([], {
      fetch: (async () => new Promise<Response>((r) => (release = r))) as unknown as typeof fetch,
      sleep: (_ms, signal) =>
        new Promise<void>((resolve) => {
          signal.addEventListener('abort', () => (aborted.push(true), resolve()), { once: true });
        }),
    });
    q.enqueue(visitor('a', 1));
    const flushing = q.flush();
    await Promise.resolve();
    const purge = q.purgeVisitors(['a']);
    release(new Response('{}', { status: 200 }));
    await flushing;
    expect(await purge).toEqual({ settled: true });
    expect(aborted).toEqual([true]);
  });
});

