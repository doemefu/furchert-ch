// Fake browser environment for tracker tests (test-only module): event
// targets, a manual clock with timers, a recording fetch and Web Locks.
import type { LocksLike } from './transport';

type Listener = (e: Event) => void;
export class FakeTarget {
  listeners = new Map<string, Set<Listener>>();
  addEventListener(type: string, fn: Listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(fn);
  }
  removeEventListener(type: string, fn: Listener) {
    this.listeners.get(type)?.delete(fn);
  }
  dispatch(type: string, extra: Record<string, unknown> = {}) {
    const e = { type, ...extra } as unknown as Event;
    for (const fn of [...(this.listeners.get(type) ?? [])]) fn(e);
  }
  count() {
    return [...this.listeners.values()].reduce((n, s) => n + s.size, 0);
  }
}

export class Clock {
  t = Date.parse('2026-11-08T15:00:00Z');
  perfT = 1_000;
  private timers: { at: number; fn: () => void; id: number }[] = [];
  private next = 1;
  setTimeout = (fn: () => void, ms: number) => {
    const id = this.next++;
    this.timers.push({ at: this.perfT + ms, fn, id });
    return id;
  };
  clearTimeout = (h: unknown) => {
    this.timers = this.timers.filter((x) => x.id !== h);
  };
  pending() {
    return this.timers.length;
  }
  async advance(ms: number) {
    const end = this.perfT + ms;
    for (;;) {
      this.timers.sort((a, b) => a.at - b.at);
      const due = this.timers[0];
      if (!due || due.at > end) break;
      this.timers.shift();
      this.t += due.at - this.perfT;
      this.perfT = due.at;
      due.fn();
      await settle();
    }
    this.t += end - this.perfT;
    this.perfT = end;
    await settle();
  }
}

export const settle = async () => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};

export type Reply = number | 'network' | (() => Promise<Response>);

export function recordingFetch(replies: Reply[] = []) {
  const bodies: Record<string, unknown>[] = [];
  const inits: RequestInit[] = [];
  const urls: string[] = [];
  const fetchFn = async (url: RequestInfo | URL, init: RequestInit = {}) => {
    urls.push(String(url));
    inits.push(init);
    bodies.push(JSON.parse(String(init.body)));
    const r = replies.shift() ?? 204;
    if (r === 'network') throw new TypeError('Failed to fetch');
    if (typeof r === 'function') return r();
    return new Response(null, { status: r });
  };
  return { fetch: fetchFn as unknown as typeof fetch, bodies, inits, urls };
}

/** Exclusive Web Locks: one holder at a time, FIFO, abortable while waiting. */
export function fakeLocks(): LocksLike & { held: number } {
  let chain = Promise.resolve();
  const locks = {
    held: 0,
    request(_name: string, opts: { signal: AbortSignal }, cb: () => Promise<void>) {
      const run = chain.then(async () => {
        if (opts.signal.aborted) throw new DOMException('Aborted', 'AbortError');
        locks.held += 1;
        try {
          await cb();
        } finally {
          locks.held -= 1;
        }
      });
      chain = run.catch(() => {});
      return run;
    },
  };
  return locks;
}

// Element stand-ins for click and focus targets.
export type FakeNode = { tag: string; attrs: Record<string, string>; parent: FakeNode | null };
export const fakeNode = (tag: string, attrs: Record<string, string> = {}, parent: FakeNode | null = null): FakeNode => ({ tag, attrs, parent });
export function fakeEl(n: FakeNode): { closest(sel: string): ReturnType<typeof fakeEl> | null; getAttribute(name: string): string | null } {
  const matches = (x: FakeNode, sel: string) =>
    sel.split(',').some((s) => {
      s = s.trim();
      if (s === '[data-track]') return 'data-track' in x.attrs;
      if (s === 'a[href]') return x.tag === 'a' && 'href' in x.attrs;
      return x.tag === s;
    });
  return {
    closest(sel) {
      for (let x: FakeNode | null = n; x; x = x.parent) if (matches(x, sel)) return fakeEl(x);
      return null;
    },
    getAttribute: (name) => n.attrs[name] ?? null,
  };
}
