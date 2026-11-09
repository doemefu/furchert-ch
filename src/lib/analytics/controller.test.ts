// Consent controller (spec 100 §4, §10.1; WA-2a #153). Every dependency is
// a recording fake that writes into one shared call log, so the tests can
// assert the exact order of operations on Decline and withdrawal.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ANALYTICS_CONSENT_VERSION, CONSENT_KEY, FORGET_PENDING_KEY, OPTOUT_KEY, type StorageLike } from './consent';
import { createConsentController, FIRST_INTERACTION_EVENTS, onFirstInteraction, type ControllerDeps } from './controller';
import type { TrackerHooks, TrackerPort } from './trackerPort';

const NOW = new Date('2026-11-08T12:00:00Z');
const record = (choice: 'granted' | 'denied', at = '2026-11-01', v = ANALYTICS_CONSENT_VERSION) =>
  JSON.stringify({ v, choice, by: 'user', at });

type Responder = () => Promise<Response>;
const status = (code: number, headers: Record<string, string> = {}): Responder => async () =>
  new Response(code === 204 ? null : '', { status: code, headers });
const networkError: Responder = async () => {
  throw new TypeError('Failed to fetch');
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

interface FakeEnvOptions {
  data?: Map<string, string>;
  log?: string[];
  responses?: Responder[];
  failSet?: boolean;
  mayStart?: () => boolean;
  /** Resolves loadTracker only when the test calls the returned release(). */
  holdTracker?: boolean;
}

function fakeEnv(opts: FakeEnvOptions = {}) {
  const log = opts.log ?? [];
  const data = opts.data ?? new Map<string, string>();
  const responses = [...(opts.responses ?? [])];
  const storage: StorageLike = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      if (opts.failSet) throw new Error('QuotaExceededError');
      log.push(`set ${k} ${k === CONSENT_KEY ? JSON.parse(v).choice : v}`);
      data.set(k, v);
    },
    removeItem: (k) => {
      log.push(`remove ${k}`);
      data.delete(k);
    },
  };
  const fetchFn = vi.fn(async (url: RequestInfo | URL) => {
    log.push(`fetch ${String(url)}`);
    const next = responses.shift() ?? status(204);
    return next();
  });
  const paths: string[] = [];
  const tracker: TrackerPort = {
    start: vi.fn(() => void log.push('tracker.start')),
    stop: vi.fn(() => void log.push('tracker.stop')),
    abortInFlight: vi.fn(() => void log.push('tracker.abortInFlight')),
    setPath: vi.fn((p: string) => void paths.push(p)),
    onPageShow: vi.fn(() => void log.push('tracker.onPageShow')),
    awaitFirstFlush: vi.fn(async () => {}),
  };
  let release: () => void = () => {};
  const loadTracker = vi.fn(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_hooks: TrackerHooks) =>
      new Promise<TrackerPort>((resolve) => {
        if (opts.holdTracker) release = () => resolve(tracker);
        else resolve(tracker);
      }),
  );
  const timers: { fn: () => void; ms: number; cleared: boolean }[] = [];
  const deps: ControllerDeps = {
    storage,
    fetch: fetchFn as unknown as typeof fetch,
    now: () => NOW,
    events: {
      dispatchEvent: (e: Event) => {
        log.push(`event ${e.type} ${(e as CustomEvent).detail?.choice ?? 'null'}`);
        return true;
      },
    },
    setTimeout: (fn, ms) => {
      timers.push({ fn, ms, cleared: false });
      return timers.length - 1;
    },
    clearTimeout: (handle) => {
      const t = timers[handle as number];
      if (t) t.cleared = true;
    },
    loadTracker,
    mayStart: opts.mayStart,
  };
  const fireTimers = async () => {
    for (const t of timers.splice(0)) if (!t.cleared) t.fn();
    await flush();
  };
  const writes = () => log.filter((l) => l.startsWith('set ') || l.startsWith('remove '));
  return { deps, log, data, fetchFn, tracker, loadTracker, timers, fireTimers, writes, paths, release: () => release() };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// Most tests model an anonymous visitor; session handling has its own tests.
function ctl(deps: ControllerDeps) {
  const c = createConsentController(deps);
  c.setSession('unauthenticated');
  return c;
}

describe('before a choice', () => {
  it('shows the bar and sends, writes and reads nothing else', async () => {
    // Any access to a device property throws (spec §1.4: no device-property
    // reads before a choice). The controller only uses its injected deps.
    const trap = (name: string) =>
      new Proxy(
        {},
        {
          get: (_t, prop) => {
            throw new Error(`${name}.${String(prop)} read before a choice`);
          },
          has: (_t, prop) => {
            throw new Error(`${name}.${String(prop)} probed before a choice`);
          },
        },
      );
    for (const name of ['navigator', 'screen', 'window', 'document']) vi.stubGlobal(name, trap(name));

    const env = fakeEnv();
    const c = ctl(env.deps);
    expect(c.getSnapshot().ready).toBe(false);
    expect(c.getSnapshot().barOpen).toBe(false);
    await c.init('/');
    const snap = c.getSnapshot();
    expect(snap).toMatchObject({ ready: true, choice: null, barOpen: true, reopened: false });
    expect(env.fetchFn).not.toHaveBeenCalled();
    expect(env.log.filter((l) => l.startsWith('set '))).toEqual([]);
    expect(env.log.filter((l) => l.startsWith('remove '))).toEqual([]);
    expect(env.loadTracker).not.toHaveBeenCalled();
  });

  it('keeps an old-version or expired record unwritten and asks again', async () => {
    for (const raw of [record('granted', '2026-11-01', ANALYTICS_CONSENT_VERSION - 1), record('granted', '2025-11-08')]) {
      const env = fakeEnv({ data: new Map([[CONSENT_KEY, raw]]) });
      const c = ctl(env.deps);
      await c.init('/');
      expect(c.getSnapshot().barOpen, raw).toBe(true);
      expect(env.log.filter((l) => l.startsWith('set ')), raw).toEqual([]);
      expect(env.loadTracker).not.toHaveBeenCalled();
    }
  });

  it('sends nothing for a pending forget and keeps the marker for the next choice (M5b)', async () => {
    const env = fakeEnv({ data: new Map([[FORGET_PENDING_KEY, '1']]) });
    const c = ctl(env.deps);
    await c.init('/');
    expect(env.fetchFn).not.toHaveBeenCalled();
    expect(env.data.get(FORGET_PENDING_KEY)).toBe('1');
    expect(c.getSnapshot().barOpen).toBe(true);
  });

  it('never shows the bar on /dashboard/**', async () => {
    const env = fakeEnv();
    const c = ctl(env.deps);
    await c.init('/dashboard/network');
    expect(c.getSnapshot()).toMatchObject({ ready: true, suppressed: true, barOpen: false });
    c.init('/about');
    expect(c.getSnapshot()).toMatchObject({ suppressed: false, barOpen: true });
  });

  it('hides the bar while the never-track switch is on', async () => {
    const env = fakeEnv({ data: new Map([[OPTOUT_KEY, '1']]) });
    const c = ctl(env.deps);
    await c.init('/');
    expect(c.getSnapshot()).toMatchObject({ optedOut: true, barOpen: false });
  });
});

describe('Esc is not consent', () => {
  it('hides the bar for this document only and stores nothing', async () => {
    const env = fakeEnv();
    const c = ctl(env.deps);
    await c.init('/');
    c.dismiss();
    expect(c.getSnapshot()).toMatchObject({ barOpen: false, choice: null });
    expect(env.log).toEqual([]);
    // Next document load: a new controller on the same storage asks again.
    const next = ctl(fakeEnv({ data: env.data }).deps);
    await next.init('/');
    expect(next.getSnapshot().barOpen).toBe(true);
  });

  it('also closes a bar reopened from the footer (M3)', async () => {
    const env = fakeEnv({ data: new Map([[CONSENT_KEY, record('denied')]]) });
    const c = ctl(env.deps);
    await c.init('/');
    c.reopen();
    expect(c.getSnapshot()).toMatchObject({ barOpen: true, reopened: true, choice: 'denied' });
    c.dismiss();
    expect(c.getSnapshot()).toMatchObject({ barOpen: false, reopened: false, choice: 'denied' });
    expect(env.writes()).toEqual([]);
  });
});

describe('Decline', () => {
  it('first Decline: store denied, then forget, then drop the marker on 204', async () => {
    const env = fakeEnv();
    const c = ctl(env.deps);
    await c.init('/');
    await c.decline();
    expect(env.log).toEqual([
      'set fa_consent denied',
      'event fa:consent denied',
      `set ${FORGET_PENDING_KEY} 1`,
      'fetch /api/v/forget',
      `remove ${FORGET_PENDING_KEY}`,
    ]);
    expect(c.getSnapshot()).toMatchObject({ choice: 'denied', barOpen: false });
    expect(JSON.parse(env.data.get(CONSENT_KEY)!)).toMatchObject({ choice: 'denied', by: 'user', at: '2026-11-08' });
  });

  it('withdrawal: denied first, stop, abort, marker, forget, in that order', async () => {
    const env = fakeEnv({ data: new Map([[CONSENT_KEY, record('granted')]]) });
    const c = ctl(env.deps);
    await c.init('/');
    await flush();
    expect(env.tracker.start).toHaveBeenCalledTimes(1);
    env.log.length = 0;
    c.reopen();
    await c.decline();
    expect(env.log).toEqual([
      'set fa_consent denied',
      'event fa:consent denied',
      'tracker.stop',
      'tracker.abortInFlight',
      `set ${FORGET_PENDING_KEY} 1`,
      'fetch /api/v/forget',
      `remove ${FORGET_PENDING_KEY}`,
    ]);
    expect(env.tracker.start).toHaveBeenCalledTimes(1);
    expect(c.getSnapshot()).toMatchObject({ choice: 'denied', barOpen: false, reopened: false });
  });

  it('a Decline while the tracker is still loading never starts it', async () => {
    const env = fakeEnv({ data: new Map([[CONSENT_KEY, record('granted')]]), holdTracker: true });
    const c = ctl(env.deps);
    await c.init('/');
    await c.decline();
    env.release();
    await flush();
    expect(env.tracker.start).not.toHaveBeenCalled();
  });

  it('keeps going when storage writes fail and clears the old choice best-effort (L4)', async () => {
    const env = fakeEnv({ data: new Map([[CONSENT_KEY, record('granted')]]), failSet: true });
    const c = ctl(env.deps);
    await c.init('/');
    await flush();
    env.log.length = 0;
    await c.decline();
    expect(env.log).toEqual([
      `remove ${CONSENT_KEY}`,
      'event fa:consent denied',
      'tracker.stop',
      'tracker.abortInFlight',
      'fetch /api/v/forget',
    ]);
    expect(c.getSnapshot().choice).toBe('denied');
  });

  it('does not rewrite a valid denied record (fixed date) but still forgets', async () => {
    const env = fakeEnv({ data: new Map([[CONSENT_KEY, record('denied', '2026-10-01')]]) });
    const c = ctl(env.deps);
    await c.init('/');
    await c.decline();
    expect(JSON.parse(env.data.get(CONSENT_KEY)!).at).toBe('2026-10-01');
    expect(env.fetchFn).toHaveBeenCalledTimes(1);
  });

  it('passes the decline origin through (seam for the WA-5 signal decline)', async () => {
    const env = fakeEnv();
    const c = ctl(env.deps);
    await c.init('/');
    await c.decline('signal');
    expect(JSON.parse(env.data.get(CONSENT_KEY)!).by).toBe('signal');
  });
});

describe('fa_forget_pending retry', () => {
  for (const [name, responder] of [
    ['network error', networkError],
    ['503', status(503)],
    ['404', status(404)],
  ] as const) {
    it(`keeps the marker after ${name} and retries exactly once on the next load`, async () => {
      const first = fakeEnv({ responses: [responder] });
      const c1 = ctl(first.deps);
      await c1.init('/');
      await c1.decline();
      expect(first.data.get(FORGET_PENDING_KEY)).toBe('1');

      const second = fakeEnv({ data: first.data, responses: [status(204)] });
      const c2 = ctl(second.deps);
      await c2.init('/');
      expect(second.fetchFn).toHaveBeenCalledTimes(1);
      expect(second.data.has(FORGET_PENDING_KEY)).toBe(false);

      const third = fakeEnv({ data: first.data });
      await ctl(third.deps).init('/');
      expect(third.fetchFn).not.toHaveBeenCalled();
    });
  }

  it('a failed retry stays pending and is not repeated within the same load', async () => {
    const env = fakeEnv({
      data: new Map([
        [CONSENT_KEY, record('denied')],
        [FORGET_PENDING_KEY, '1'],
      ]),
      responses: [status(503)],
    });
    const c = ctl(env.deps);
    await c.init('/');
    c.init('/about');
    await flush();
    expect(env.fetchFn).toHaveBeenCalledTimes(1);
    expect(env.data.get(FORGET_PENDING_KEY)).toBe('1');
  });

  it('does not retry on /dashboard/** until a public path is shown (Arch 3)', async () => {
    const env = fakeEnv({
      data: new Map([
        [CONSENT_KEY, record('denied')],
        [FORGET_PENDING_KEY, '1'],
      ]),
    });
    const c = ctl(env.deps);
    await c.init('/dashboard');
    expect(env.fetchFn).not.toHaveBeenCalled();
    await c.init('/');
    expect(env.fetchFn).toHaveBeenCalledTimes(1);
  });

  it('429 with Retry-After schedules one retry in the same document', async () => {
    const env = fakeEnv({ responses: [status(429, { 'Retry-After': '30' }), status(429, { 'Retry-After': '30' })] });
    const c = ctl(env.deps);
    await c.init('/');
    await c.decline();
    expect(env.timers.map((t) => t.ms)).toEqual([30_000]);
    await env.fireTimers();
    expect(env.fetchFn).toHaveBeenCalledTimes(2);
    // The second 429 schedules nothing more; the next load retries.
    expect(env.timers).toEqual([]);
    expect(env.data.get(FORGET_PENDING_KEY)).toBe('1');
  });

  it('429 then Allow: the retry timer is cancelled and never sends (H1)', async () => {
    const env = fakeEnv({ responses: [status(429, { 'Retry-After': '30' })] });
    const c = ctl(env.deps);
    await c.init('/');
    await c.decline();
    c.reopen();
    await c.allow();
    const fetches = env.fetchFn.mock.calls.length;
    // Even if a host ignored clearTimeout, firing re-checks choice and marker.
    for (const t of env.timers) t.fn();
    await flush();
    expect(env.fetchFn.mock.calls.length).toBe(fetches);
    expect(env.timers.every((t) => t.cleared)).toBe(true);
  });

  it('a 429 retry does not fire once the page moved to /dashboard/** (F4)', async () => {
    const env = fakeEnv({ responses: [status(429, { 'Retry-After': '30' })] });
    const c = ctl(env.deps);
    await c.init('/');
    await c.decline();
    await c.init('/dashboard/network');
    await env.fireTimers();
    expect(env.fetchFn).toHaveBeenCalledTimes(1);
    expect(env.data.get(FORGET_PENDING_KEY)).toBe('1');
  });

  it('opt-out with granted: a failed forget is retried, not abandoned (F5)', async () => {
    const first = fakeEnv({
      data: new Map([[CONSENT_KEY, record('granted')]]),
      responses: [status(429, { 'Retry-After': '30' }), status(503)],
    });
    const c1 = ctl(first.deps);
    await c1.init('/');
    await flush();
    await c1.optOut(true);
    await first.fireTimers();
    expect(first.fetchFn).toHaveBeenCalledTimes(2);
    expect(first.data.get(FORGET_PENDING_KEY)).toBe('1');

    // Next load: granted + opted out + pending is a retry, not the M5a path.
    const second = fakeEnv({ data: first.data, responses: [status(503)] });
    const c2 = ctl(second.deps);
    await c2.init('/');
    await flush();
    expect(second.log).toEqual(['fetch /api/v/forget']);
    expect(second.data.get(FORGET_PENDING_KEY)).toBe('1');
    expect(second.tracker.start).not.toHaveBeenCalled();
  });

  it('granted + pending at load: one forget, marker dropped whatever the answer, then start (M5a)', async () => {
    for (const responder of [status(204), status(503)]) {
      const env = fakeEnv({
        data: new Map([
          [CONSENT_KEY, record('granted')],
          [FORGET_PENDING_KEY, '1'],
        ]),
        responses: [responder],
      });
      const c = ctl(env.deps);
      await c.init('/');
      await flush();
      expect(env.log).toEqual(['fetch /api/v/forget', `remove ${FORGET_PENDING_KEY}`, 'tracker.start']);
    }
  });
});

describe('Allow', () => {
  it('stores granted and starts the tracker', async () => {
    const env = fakeEnv();
    const c = ctl(env.deps);
    await c.init('/');
    await c.allow();
    await flush();
    expect(env.log).toEqual(['set fa_consent granted', 'event fa:consent granted', 'tracker.start']);
    expect(c.getSnapshot()).toMatchObject({ choice: 'granted', barOpen: false });
  });

  it('runs a pending forget first and starts only after it answered, even on failure', async () => {
    const env = fakeEnv({ data: new Map([[FORGET_PENDING_KEY, '1']]), responses: [networkError] });
    const c = ctl(env.deps);
    await c.init('/');
    await c.allow();
    await flush();
    expect(env.log).toEqual([
      'set fa_consent granted',
      'event fa:consent granted',
      'fetch /api/v/forget',
      `remove ${FORGET_PENDING_KEY}`,
      'tracker.start',
    ]);
  });

  it('awaits a forget that is already in flight instead of starting early (M1)', async () => {
    let answer: (r: Response) => void = () => {};
    const env = fakeEnv({ responses: [() => new Promise<Response>((resolve) => (answer = resolve))] });
    const c = ctl(env.deps);
    await c.init('/');
    const declined = c.decline();
    await flush();
    c.reopen();
    const allowed = c.allow();
    await flush();
    expect(env.tracker.start).not.toHaveBeenCalled();
    expect(env.fetchFn).toHaveBeenCalledTimes(1);
    answer(new Response(null, { status: 204 }));
    await Promise.all([declined, allowed]);
    await flush();
    expect(env.fetchFn).toHaveBeenCalledTimes(1);
    expect(env.tracker.start).toHaveBeenCalledTimes(1);
    expect(env.data.has(FORGET_PENDING_KEY)).toBe(false);
  });

  it('does not rewrite a valid granted record (12 months fixed)', async () => {
    const env = fakeEnv({ data: new Map([[CONSENT_KEY, record('granted', '2026-01-01')]]) });
    const c = ctl(env.deps);
    await c.init('/');
    c.reopen();
    await c.allow();
    expect(JSON.parse(env.data.get(CONSENT_KEY)!).at).toBe('2026-01-01');
    expect(c.getSnapshot()).toMatchObject({ barOpen: false, reopened: false });
  });

  it('does not start on /dashboard/** or when mayStart says no', async () => {
    const dash = fakeEnv({ data: new Map([[CONSENT_KEY, record('granted')]]) });
    const c = ctl(dash.deps);
    await c.init('/dashboard');
    await flush();
    expect(dash.loadTracker).not.toHaveBeenCalled();
    await c.init('/it');
    await flush();
    expect(dash.tracker.start).toHaveBeenCalledTimes(1);

    const blocked = fakeEnv({ data: new Map([[CONSENT_KEY, record('granted')]]), mayStart: () => false });
    await ctl(blocked.deps).init('/');
    await flush();
    expect(blocked.tracker.start).not.toHaveBeenCalled();
  });
});

describe('multi-tab', () => {
  it('a withdrawal in tab A stops tab B without a second forget', async () => {
    const data = new Map([[CONSENT_KEY, record('granted')]]);
    const a = fakeEnv({ data });
    const b = fakeEnv({ data });
    const tabA = ctl(a.deps);
    const tabB = ctl(b.deps);
    await tabA.init('/');
    await tabB.init('/automation');
    await flush();
    b.log.length = 0;

    await tabA.decline();
    // The browser fires `storage` in the other tab for each change.
    tabB.onStorage(CONSENT_KEY, data.get(CONSENT_KEY) ?? null);
    tabB.onStorage(FORGET_PENDING_KEY, null);
    await flush();
    expect(b.log).toEqual(['event fa:consent denied', 'tracker.stop', 'tracker.abortInFlight']);
    expect(b.fetchFn).not.toHaveBeenCalled();
    expect(tabB.getSnapshot()).toMatchObject({ choice: 'denied', barOpen: false });
  });

  it('an Allow in tab A starts tab B only once the pending marker is gone (M2)', async () => {
    const data = new Map([[FORGET_PENDING_KEY, '1']]);
    let answer: (r: Response) => void = () => {};
    const a = fakeEnv({ data, responses: [() => new Promise<Response>((resolve) => (answer = resolve))] });
    const b = fakeEnv({ data });
    const tabA = ctl(a.deps);
    const tabB = ctl(b.deps);
    await tabA.init('/');
    await tabB.init('/');

    const allowed = tabA.allow();
    tabB.onStorage(CONSENT_KEY, data.get(CONSENT_KEY) ?? null);
    await flush();
    expect(tabB.getSnapshot()).toMatchObject({ choice: 'granted', barOpen: false });
    expect(b.tracker.start).not.toHaveBeenCalled();

    answer(new Response(null, { status: 204 }));
    await allowed;
    tabB.onStorage(FORGET_PENDING_KEY, null);
    await flush();
    expect(b.tracker.start).toHaveBeenCalledTimes(1);
  });

  it('re-reads the state when a page comes back from the bfcache', async () => {
    const data = new Map<string, string>();
    const env = fakeEnv({ data });
    const c = ctl(env.deps);
    await c.init('/');
    data.set(CONSENT_KEY, record('denied'));
    c.onPageShow(false);
    expect(c.getSnapshot().choice).toBeNull();
    c.onPageShow(true);
    expect(c.getSnapshot()).toMatchObject({ choice: 'denied', barOpen: false });
  });
});

describe('never-track switch (seam for WA-4a)', () => {
  it('on: marker, stop, abort, forget; off: removes the flag', async () => {
    const env = fakeEnv({ data: new Map([[CONSENT_KEY, record('granted')]]) });
    const c = ctl(env.deps);
    await c.init('/');
    await flush();
    env.log.length = 0;
    await c.optOut(true);
    expect(env.log).toEqual([
      `set ${OPTOUT_KEY} 1`,
      'tracker.stop',
      'tracker.abortInFlight',
      `set ${FORGET_PENDING_KEY} 1`,
      'fetch /api/v/forget',
      `remove ${FORGET_PENDING_KEY}`,
    ]);
    expect(c.getSnapshot()).toMatchObject({ optedOut: true, barOpen: false });
    env.log.length = 0;
    await c.optOut(false);
    await flush();
    expect(env.log).toEqual([`remove ${OPTOUT_KEY}`, 'tracker.start']);
  });
});

describe('snapshot and lifecycle', () => {
  it('init is idempotent and the snapshot object is stable between changes (L5)', async () => {
    const env = fakeEnv({ data: new Map([[CONSENT_KEY, record('granted')]]) });
    const c = ctl(env.deps);
    await c.init('/');
    await c.init('/');
    await flush();
    expect(env.loadTracker).toHaveBeenCalledTimes(1);
    expect(env.tracker.start).toHaveBeenCalledTimes(1);
    expect(c.getSnapshot()).toBe(c.getSnapshot());
  });

  it('notifies subscribers on every change and stops after unsubscribe', async () => {
    const env = fakeEnv();
    const c = ctl(env.deps);
    const listener = vi.fn();
    const unsubscribe = c.subscribe(listener);
    await c.init('/');
    const calls = listener.mock.calls.length;
    expect(calls).toBeGreaterThan(0);
    c.reopen();
    expect(listener.mock.calls.length).toBe(calls + 1);
    unsubscribe();
    c.dismiss();
    expect(listener.mock.calls.length).toBe(calls + 1);
  });

  it('reopen shows the current choice and writes nothing', async () => {
    const env = fakeEnv({ data: new Map([[CONSENT_KEY, record('granted')]]) });
    const c = ctl(env.deps);
    await c.init('/');
    await flush();
    env.log.length = 0;
    c.reopen();
    expect(c.getSnapshot()).toMatchObject({ barOpen: true, reopened: true, choice: 'granted' });
    expect(env.log).toEqual([]);
  });
});

describe('session, path and form hooks (WA-2b)', () => {
  it('holds the start while the session is loading and stops on sign-in without a forget', async () => {
    const env = fakeEnv({ data: new Map([[CONSENT_KEY, record('granted')]]) });
    const c = createConsentController(env.deps);
    await c.init('/');
    await flush();
    expect(env.loadTracker).not.toHaveBeenCalled();
    c.setSession('unauthenticated');
    await flush();
    expect(env.tracker.start).toHaveBeenCalledTimes(1);
    c.setSession('authenticated');
    expect(env.log).toEqual(['tracker.start', 'tracker.stop', 'tracker.abortInFlight']);
    expect(env.fetchFn).not.toHaveBeenCalled();
    c.setSession('unauthenticated');
    await flush();
    expect(env.tracker.start).toHaveBeenCalledTimes(2);
  });

  it('gives the tracker allowed() and consentDate() hooks that follow the state (H3)', async () => {
    const env = fakeEnv({ data: new Map([[CONSENT_KEY, record('granted', '2026-11-01')]]) });
    const c = ctl(env.deps);
    await c.init('/');
    await flush();
    const hooks = env.loadTracker.mock.calls[0][0];
    expect(hooks.allowed()).toBe(true);
    expect(hooks.consentDate()).toBe('2026-11-01');
    c.setSession('authenticated');
    expect(hooks.allowed()).toBe(false);
    c.setSession('unauthenticated');
    await c.optOut(true);
    expect(hooks.allowed()).toBe(false);
  });

  it('passes the path before start and on every navigation', async () => {
    const env = fakeEnv({ data: new Map([[CONSENT_KEY, record('granted')]]) });
    const c = ctl(env.deps);
    await c.init('/automation');
    await flush();
    await c.init('/contact');
    expect(env.paths).toEqual(['/automation', '/contact']);
  });

  it('forwards a bfcache restore only when tracking is still allowed (M1)', async () => {
    const data = new Map([[CONSENT_KEY, record('granted')]]);
    const env = fakeEnv({ data });
    const c = ctl(env.deps);
    await c.init('/');
    await flush();
    c.onPageShow(true);
    expect(env.log).toContain('tracker.onPageShow');
    env.log.length = 0;
    data.set(CONSENT_KEY, record('denied')); // withdrawn in another tab while this page sat in the bfcache
    c.onPageShow(true);
    expect(env.log).toEqual(['event fa:consent denied', 'tracker.stop', 'tracker.abortInFlight']);
  });

  it('analyticsFlag and awaitFirstFlush for the contact form', async () => {
    const env = fakeEnv({ data: new Map([[CONSENT_KEY, record('granted')]]) });
    const c = ctl(env.deps);
    expect(c.analyticsFlag()).toBe(false); // nothing read before init
    await c.awaitFirstFlush(1000);
    expect(env.tracker.awaitFirstFlush).not.toHaveBeenCalled();
    await c.init('/');
    expect(c.analyticsFlag()).toBe(true);
    await flush();
    await c.awaitFirstFlush(1000);
    expect(env.tracker.awaitFirstFlush).toHaveBeenCalledWith(1000);
    await c.decline();
    expect(c.analyticsFlag()).toBe(false);
  });
});

describe('WA-4a seams (#155)', () => {
  it('N1 (#159): an opted-out browser that clicks Allow keeps the pending opt-out forget', async () => {
    const env = fakeEnv({ data: new Map([[OPTOUT_KEY, '1'], [FORGET_PENDING_KEY, '1']]), responses: [status(503), status(503)] });
    const c = ctl(env.deps);
    await c.init('/');
    await c.allow();
    expect(env.data.get(FORGET_PENDING_KEY)).toBe('1');
    expect(env.tracker.start).not.toHaveBeenCalled();
  });

  it('M7: optOut reports whether the switch could be stored', async () => {
    const ok = fakeEnv();
    const c1 = ctl(ok.deps);
    await c1.init('/dashboard/analytics');
    expect(await c1.optOut(true)).toBe(true);
    expect(await c1.optOut(false)).toBe(true);

    const blocked = fakeEnv({ failSet: true });
    const c2 = ctl(blocked.deps);
    await c2.init('/dashboard/analytics');
    expect(await c2.optOut(true)).toBe(false);
    expect(c2.getSnapshot().optedOut).toBe(true); // in memory for this page
  });

  it('H1: the browser controller is one instance per page, even across module copies', async () => {
    const store = new Map<string, string>();
    const win = {
      localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) },
      dispatchEvent: () => true,
      setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
      clearTimeout: (h: number) => clearTimeout(h),
    };
    vi.stubGlobal('window', win);
    const key = Symbol.for('furchert.analytics.consentController');
    const hooksKey = Symbol.for('furchert.analytics.form');
    const g = globalThis as Record<symbol, unknown>;
    delete g[key];
    delete g[hooksKey];
    vi.resetModules();
    const a = (await import('./controller')).getConsentController();
    const hooks = g[hooksKey];
    vi.resetModules();
    const b = (await import('./controller')).getConsentController();
    expect(b).toBe(a);
    expect(g[hooksKey]).toBe(hooks);
    delete g[key];
    delete g[hooksKey];
  });
});

describe('GPC/DNT auto-decline (§4.1, WA-5 #157)', () => {
  const withSignal = (opts: FakeEnvOptions = {}) => {
    const env = fakeEnv(opts);
    env.deps.privacySignal = () => true;
    return env;
  };
  const stored = (data: Map<string, string>) => JSON.parse(data.get(CONSENT_KEY)!);

  it('no stored choice + signal: stores denied by "signal", sets the marker, sends one forget, bar closed', async () => {
    const env = withSignal();
    const c = ctl(env.deps);
    await c.init('/');
    expect(stored(env.data)).toMatchObject({ choice: 'denied', by: 'signal' });
    expect(env.data.get(FORGET_PENDING_KEY)).toBeUndefined(); // dropped after the 204
    expect(env.fetchFn).toHaveBeenCalledTimes(1);
    expect(c.getSnapshot()).toMatchObject({ choice: 'denied', by: 'signal', barOpen: false });
    expect(env.loadTracker).not.toHaveBeenCalled();
    await c.init('/about');
    expect(env.fetchFn).toHaveBeenCalledTimes(1);
  });

  it('a stored user choice wins over the signal; an opted-out browser stores nothing', async () => {
    const granted = withSignal({ data: new Map([[CONSENT_KEY, record('granted')]]) });
    const c = ctl(granted.deps);
    await c.init('/');
    expect(stored(granted.data)).toMatchObject({ choice: 'granted', by: 'user' });
    expect(granted.fetchFn).not.toHaveBeenCalled();
    await flush();
    expect(granted.tracker.start).toHaveBeenCalled();

    const opted = withSignal({ data: new Map([[OPTOUT_KEY, '1']]) });
    await ctl(opted.deps).init('/');
    expect(opted.data.has(CONSENT_KEY)).toBe(false);
  });

  it('on /dashboard first: the choice is stored, the forget waits for the first public path', async () => {
    const env = withSignal();
    const c = ctl(env.deps);
    await c.init('/dashboard/analytics');
    expect(stored(env.data).by).toBe('signal');
    expect(env.fetchFn).not.toHaveBeenCalled();
    await c.init('/');
    expect(env.fetchFn).toHaveBeenCalledTimes(1);
  });

  it('an expired record is declined again by the signal', async () => {
    const env = withSignal({ data: new Map([[CONSENT_KEY, record('granted', '2025-10-01')]]) });
    await ctl(env.deps).init('/');
    expect(stored(env.data)).toMatchObject({ choice: 'denied', by: 'signal', at: '2026-11-08' });
  });

  it('an explicit Allow overrides the signal: by "user", the tracker runs, the goal flag is on', async () => {
    const env = withSignal();
    const c = ctl(env.deps);
    await c.init('/');
    c.reopen();
    await c.allow();
    await flush();
    expect(stored(env.data)).toMatchObject({ choice: 'granted', by: 'user' });
    expect(env.tracker.start).toHaveBeenCalled();
    expect(c.analyticsFlag()).toBe(true);
  });

  it('L11: a user Decline after the signal rewrites the record to by "user" with a new date', async () => {
    const env = withSignal({ data: new Map([[CONSENT_KEY, JSON.stringify({ v: 1, choice: 'denied', by: 'signal', at: '2026-11-01' })]]) });
    const c = ctl(env.deps);
    await c.init('/');
    expect(c.getSnapshot().by).toBe('signal');
    c.reopen();
    await c.decline();
    expect(stored(env.data)).toMatchObject({ choice: 'denied', by: 'user', at: '2026-11-08' });
    expect(c.getSnapshot().by).toBe('user');
  });

  it('a 503 on the signal forget keeps the marker for the next load; Allow then runs the pending forget first', async () => {
    const env = withSignal({ responses: [status(503)] });
    const c = ctl(env.deps);
    await c.init('/');
    expect(env.data.get(FORGET_PENDING_KEY)).toBe('1');
    // The next load retries once and fails again; a later Allow runs the pending forget before the tracker.
    const next = fakeEnv({ data: env.data, responses: [status(503), status(204)] });
    next.deps.privacySignal = () => true;
    const c2 = ctl(next.deps);
    await c2.init('/');
    c2.reopen();
    await c2.allow();
    await flush();
    const order = next.log.filter((l) => l.startsWith('fetch') || l === 'tracker.start');
    expect(order).toEqual(['fetch /api/v/forget', 'fetch /api/v/forget', 'tracker.start']);
  });
});

describe('bar on the first interaction (WA-6 #158, owner decision)', () => {
  const withGate = (opts: FakeEnvOptions = {}) => {
    const env = fakeEnv(opts);
    const gate = { cb: null as null | (() => void), stopped: 0, armed: 0 };
    env.deps.onFirstInteraction = (cb) => {
      gate.armed += 1;
      gate.cb = cb;
      return () => void (gate.stopped += 1);
    };
    return { env, gate };
  };

  it('the bar is not open before the first interaction and opens after it; nothing is sent or loaded', async () => {
    const { env, gate } = withGate();
    const c = ctl(env.deps);
    await c.init('/');
    expect(c.getSnapshot()).toMatchObject({ ready: true, choice: null, barOpen: false });
    expect(gate.armed).toBe(1);
    gate.cb!();
    expect(c.getSnapshot().barOpen).toBe(true);
    expect(env.fetchFn).not.toHaveBeenCalled();
    expect(env.loadTracker).not.toHaveBeenCalled();
  });

  it('the footer link opens the bar without any interaction', async () => {
    const { env } = withGate();
    const c = ctl(env.deps);
    await c.init('/');
    c.reopen();
    expect(c.getSnapshot()).toMatchObject({ reopened: true, barOpen: true });
  });

  it('a stored choice, an opt-out or a GPC/DNT signal arm no listener and show no bar', async () => {
    for (const setup of [
      (e: ReturnType<typeof withGate>) => e.env.data.set(CONSENT_KEY, record('denied')),
      (e: ReturnType<typeof withGate>) => e.env.data.set(OPTOUT_KEY, '1'),
      (e: ReturnType<typeof withGate>) => (e.env.deps.privacySignal = () => true),
    ]) {
      const e = withGate();
      setup(e);
      const c = ctl(e.env.deps);
      await c.init('/');
      expect(e.gate.armed).toBe(0);
      expect(c.getSnapshot().barOpen).toBe(false);
    }
  });

  it('a bfcache restore with the bar pending counts as interaction and removes the listeners', async () => {
    const { env, gate } = withGate();
    const c = ctl(env.deps);
    await c.init('/');
    c.onPageShow(true);
    expect(gate.stopped).toBe(1);
    expect(c.getSnapshot().barOpen).toBe(true);
  });

  it('nothing is tracked before Allow, also after the interaction', async () => {
    const { env, gate } = withGate();
    const c = ctl(env.deps);
    await c.init('/');
    gate.cb!();
    await flush();
    expect(env.loadTracker).not.toHaveBeenCalled();
    await c.allow();
    await flush();
    expect(env.loadTracker).toHaveBeenCalledTimes(1);
  });
});

describe('onFirstInteraction (WA-6)', () => {
  it.each(FIRST_INTERACTION_EVENTS)('fires once on "%s" and removes every listener (passive, capture)', (type) => {
    const target = new EventTarget();
    const add = vi.spyOn(target, 'addEventListener');
    const remove = vi.spyOn(target, 'removeEventListener');
    const cb = vi.fn();
    onFirstInteraction(target, cb);
    expect(add.mock.calls.map((c) => c[0])).toEqual([...FIRST_INTERACTION_EVENTS]);
    for (const call of add.mock.calls) expect(call[2]).toEqual({ capture: true, passive: true });
    target.dispatchEvent(new Event(type));
    for (const other of FIRST_INTERACTION_EVENTS) target.dispatchEvent(new Event(other));
    expect(cb).toHaveBeenCalledTimes(1);
    expect(remove.mock.calls.map((c) => c[0])).toEqual([...FIRST_INTERACTION_EVENTS]);
  });

  it('the cleanup removes the listeners without firing', () => {
    const target = new EventTarget();
    const cb = vi.fn();
    const stop = onFirstInteraction(target, cb);
    stop();
    target.dispatchEvent(new Event('pointerdown'));
    expect(cb).not.toHaveBeenCalled();
  });
});

