import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCounterLog, createEraser, RETRY_FOR_MS, type EraseDeps } from './erase';


const A = '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const B = '2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a';

type Reply = number | 'hang' | 'network';
function setup(plan: Record<string, Reply[]> = {}, over: Partial<EraseDeps> = {}) {
  const calls: { id: string; at: number; auth: string }[] = [];
  const counts: Record<string, number> = {};
  const fetchFn = vi.fn(async (url: string, init: RequestInit) => {
    const id = url.split('/').pop()!;
    calls.push({ id, at: Date.now(), auth: (init.headers as Record<string, string>).Authorization });
    const r = plan[id]?.shift() ?? 204;
    if (r === 'network') throw new TypeError('fetch failed');
    if (r === 'hang') {
      return new Promise<Response>((_res, rej) => init.signal?.addEventListener('abort', () => rej(init.signal!.reason)));
    }
    return new Response(null, { status: r });
  });
  let tokenN = 0;
  const deps: EraseDeps = {
    fetch: fetchFn as unknown as typeof fetch,
    now: () => Date.now(),
    getToken: async () => `t${++tokenN}`,
    invalidateToken: vi.fn(),
    visitorUrl: (id) => `http://ds/api/webanalytics/visitors/${id}`,
    count: (k, n = 1) => void (counts[k] = (counts[k] ?? 0) + n),
    ...over,
  };
  return { e: createEraser(deps), calls, counts, deps };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(Date.parse('2026-11-09T10:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('eraseNow (§5.4, M4)', () => {
  it('204 and 400 count as done; other answers retry 3 times, 1 s apart', async () => {
    const { e, calls } = setup({ [A]: [503, 503, 503], [B]: [400] });
    const p = e.eraseNow([A, B]);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(await p).toEqual([A]);
    const t0 = calls[0].at;
    expect(calls.filter((c) => c.id === A).map((c) => c.at - t0)).toEqual([0, 1_000, 2_000]);
    expect(calls.filter((c) => c.id === B)).toHaveLength(1);
  });

  it('erases ids in parallel under one shared 12 s deadline: two slow ids end within 12 s', async () => {
    const { e, calls } = setup({ [A]: ['hang', 'hang', 'hang'], [B]: ['hang', 'hang', 'hang'] });
    const started = Date.now();
    let done = 0;
    const p = e.eraseNow([A, B]).then((r) => ((done = Date.now()), r));
    await vi.advanceTimersByTimeAsync(12_000);
    expect(await p).toEqual([A, B]);
    expect(done - started).toBeLessThanOrEqual(12_000);
    // 3 s per attempt + 1 s gaps: three attempts each fit in 11 s, in parallel.
    expect(calls.filter((c) => c.id === A)).toHaveLength(3);
    expect(calls.filter((c) => c.id === B)).toHaveLength(3);
  });

  it('a slow token request counts against the deadline; no token → every id failed', async () => {
    const { e, calls } = setup({}, { getToken: () => new Promise<string>(() => {}) });
    const p = e.eraseNow([A]);
    await vi.advanceTimersByTimeAsync(12_000);
    expect(await p).toEqual([A]);
    expect(calls).toHaveLength(0);
  });

  it('fetches the token once up front; a 401 refreshes it once for all ids', async () => {
    const { e, calls, deps } = setup({ [A]: [401, 204], [B]: [401, 204] });
    const p = e.eraseNow([A, B]);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(await p).toEqual([]);
    expect(deps.invalidateToken).toHaveBeenCalledTimes(1);
    expect(calls.map((c) => c.auth)).toEqual(['Bearer t1', 'Bearer t1', 'Bearer t2', 'Bearer t2']);
  });
});

describe('slots (M8, N4)', () => {
  it('at most 4 user erasures at once', () => {
    const { e } = setup();
    expect([1, 2, 3, 4, 5].map(() => e.tryAcquire())).toEqual([true, true, true, true, false]);
    e.release();
    expect(e.tryAcquire()).toBe(true);
  });
});

describe('background retry (M7, N2)', () => {
  it('a failed id is retried by the 5-min sweep and leaves the set on success', async () => {
    const { e, counts } = setup({ [A]: [204] });
    e.queueRetry([A]);
    await e.sweep();
    expect(e.retrySize()).toBe(0);
    expect(counts).toMatchObject({ retryQueued: 1, retryDone: 1 });
  });

  it('gives up after 24 h; the set holds at most 1 000 ids (oldest dropped)', async () => {
    const { e, calls } = setup();
    e.queueRetry([A]);
    vi.setSystemTime(Date.now() + RETRY_FOR_MS);
    await e.sweep();
    expect(e.retrySize()).toBe(0);
    expect(calls).toHaveLength(0);
    e.queueRetry(Array.from({ length: 1_001 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`));
    expect(e.retrySize()).toBe(1_000);
  });

  it('a sweep takes ≤ 20 ids, one at a time, and stops at the first failure', async () => {
    const ids = Array.from({ length: 25 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`);
    const { e, calls } = setup({ [ids[2]]: [503] });
    e.queueRetry(ids);
    await e.sweep();
    expect(calls.map((c) => c.id)).toEqual(ids.slice(0, 3));
    expect(e.retrySize()).toBe(23);
    await e.sweep();
    expect(calls).toHaveLength(3 + 20);
  });

  it('a re-DELETE runs once the forward attempt settled; a failed one joins the retry set', async () => {
    const { e, calls, counts } = setup({ [A]: [503] });
    let settle: () => void = () => {};
    e.reDeleteAfter(new Promise<void>((r) => (settle = r)), [A]);
    await vi.advanceTimersByTimeAsync(10);
    expect(calls).toHaveLength(0);
    settle();
    await vi.advanceTimersByTimeAsync(10);
    await e.idle();
    expect(calls).toHaveLength(1);
    expect(counts.reDelete).toBe(1);
    expect(e.retrySize()).toBe(1);
  });

  it('N2: background work never takes a user slot; a full retry set while data-service is down still gives the user a result', async () => {
    const { e } = setup({ [A]: [503, 503, 503] });
    e.queueRetry(Array.from({ length: 1_000 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`));
    void e.sweep();
    expect(e.tryAcquire()).toBe(true);
    const p = e.eraseNow([A]);
    await vi.advanceTimersByTimeAsync(12_000);
    expect(await p).toEqual([A]);
  });
});

describe('#172 review: S1, S2, S8, N2', () => {
  it('S1: a user forget that erases an id removes it from the background retry set', async () => {
    const { e } = setup();
    e.queueRetry([A, B]);
    const p = e.eraseNow([A]);
    await vi.advanceTimersByTimeAsync(10);
    expect(await p).toEqual([]);
    expect(e.retrySize()).toBe(1);
  });

  it('S2: a sweep that fails moves the id to the end, so the next sweep starts with the others', async () => {
    const { e, calls } = setup({ [A]: [503, 204], [B]: [204] });
    e.queueRetry([A, B]);
    await e.sweep();
    expect(calls.map((c) => c.id)).toEqual([A]);
    await e.sweep();
    expect(calls.map((c) => c.id)).toEqual([A, B, A]);
    expect(e.retrySize()).toBe(0);
  });

  it('S2: the moved id keeps its first-failure time (still given up after 24 h)', async () => {
    const { e, calls } = setup({ [A]: [503] });
    e.queueRetry([A]);
    await e.sweep();
    vi.setSystemTime(Date.now() + RETRY_FOR_MS);
    await e.sweep();
    expect(calls).toHaveLength(1);
    expect(e.retrySize()).toBe(0);
  });

  it('S8: a DELETE 403 is counted as "forbidden" (configuration), not as a plain failure', async () => {
    const { e, counts } = setup({ [A]: [403, 403, 403] });
    const p = e.eraseNow([A]);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(await p).toEqual([A]);
    expect(counts.forbidden).toBe(3);
  });

  it('N2 (S6): background DELETEs that hang never delay a user forget beyond 12 s', async () => {
    const ids = Array.from({ length: 5 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`);
    const plan: Record<string, Reply[]> = Object.fromEntries(ids.map((id) => [id, ['hang']]));
    plan[A] = [503, 503, 503];
    const { e } = setup(plan);
    e.queueRetry(ids);
    void e.sweep();
    const started = Date.now();
    let ended = 0;
    const p = e.eraseNow([A]).then((r) => ((ended = Date.now()), r));
    await vi.advanceTimersByTimeAsync(12_000);
    expect(await p).toEqual([A]);
    expect(ended - started).toBeLessThanOrEqual(12_000);
  });
});

describe('createCounterLog (C17)', () => {
  it('logs at most once a minute, counts only', () => {
    const lines: string[] = [];
    let t = 0;
    const c = createCounterLog('[analytics] forget summary', (l) => lines.push(l), () => t);
    c.count('erased', 2);
    c.count('failed');
    t = 61_000;
    c.count('erased');
    expect(lines).toEqual(['[analytics] forget summary: erased=2', '[analytics] forget summary: failed=1 erased=1']);
  });

  it('S7: flush() writes pending counts once the minute has passed, without a new count', () => {
    const lines: string[] = [];
    let t = 0;
    const c = createCounterLog('[analytics] forget summary', (l) => lines.push(l), () => t);
    c.count('erased');
    c.count('failed');
    c.flush();
    expect(lines).toHaveLength(1);
    t = 61_000;
    c.flush();
    c.flush();
    expect(lines).toEqual(['[analytics] forget summary: erased=1', '[analytics] forget summary: failed=1']);
  });

  it('S8: adds a configuration hint when a forbidden DELETE was counted', () => {
    const lines: string[] = [];
    const c = createCounterLog('[analytics] forget summary', (l) => lines.push(l), () => 0, 60_000, { forbidden: 'check-analytics-write-scope-for-visitor-delete' });
    c.count('forbidden');
    expect(lines[0]).toBe('[analytics] forget summary: forbidden=1 hint=check-analytics-write-scope-for-visitor-delete');
  });
});
