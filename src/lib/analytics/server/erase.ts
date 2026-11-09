// Erasure client for `DELETE /api/webanalytics/visitors/{id}` (spec 100 §5.4,
// §6.5; WA-5 #157, reviews M3, M4, M7, M8, N2). Called synchronously by the
// forget handler, plus a bounded background retry. Never logs an id.
//
// - User forgets: every id in parallel under one shared 12 s deadline; the
//   `analytics:write` token is fetched once up front (inside the deadline);
//   per id 3 attempts, 1 s apart, 3 s each; 204 (and 400, impossible for a
//   regex-checked id) count as done; one 401 refreshes the token.
// - At most 4 user forgets erase at once (`tryAcquire`/`release`, M8).
// - Background work has its own budget (N2): one job at a time. Failed ids
//   wait in a retry set (max 1 000, oldest dropped) that a sweep retries
//   every 5 min for 24 h, ≤ 20 ids per sweep, stopping at the first failure.
//   After a timed-out in-flight wait, one re-DELETE runs once the forward
//   attempt settled (M3); a failed one joins the retry set. The set lives in
//   memory and is lost on a restart (the client's `fa_forget` retry remains).

export const ERASE_DEADLINE_MS = 12_000;
const ATTEMPTS = 3;
const ATTEMPT_TIMEOUT_MS = 3_000;
const ATTEMPT_GAP_MS = 1_000;
export const ERASE_SLOTS = 4;
export const RETRY_SET_MAX = 1_000;
export const RETRY_FOR_MS = 24 * 60 * 60_000;
export const SWEEP_EVERY_MS = 5 * 60_000;
const SWEEP_BATCH = 20;

export interface EraseDeps {
  fetch: typeof fetch;
  now: () => number;
  getToken: () => Promise<string>;
  invalidateToken: () => void;
  visitorUrl: (id: string) => string;
  count: (key: string, n?: number) => void;
}

export interface Eraser {
  /** Erases every id now (parallel, one 12 s deadline); resolves to the ids that failed. */
  eraseNow(ids: string[]): Promise<string[]>;
  tryAcquire(): boolean;
  release(): void;
  /** Failed ids for the background retry (24 h, every 5 min). */
  queueRetry(ids: string[]): void;
  /** One background re-DELETE once `settled` resolves (M3). */
  reDeleteAfter(settled: Promise<void>, ids: string[]): void;
  /** One retry sweep on the background budget (the runtime calls it every 5 min). */
  sweep(): Promise<void>;
  /** Resolves when the background budget is idle (tests). */
  idle(): Promise<void>;
  retrySize(): number;
}

/** An abort signal after `ms` (global timers, so fake timers drive it in tests). */
function timer(ms: number): { signal: AbortSignal; clear: () => void } {
  const c = new AbortController();
  const h = setTimeout(() => c.abort(new DOMException('timeout', 'TimeoutError')), Math.max(0, ms));
  return { signal: c.signal, clear: () => clearTimeout(h) };
}

/** Rejects as soon as `signal` aborts. */
function bounded<T>(p: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    p.then(
      (v) => (signal.removeEventListener('abort', onAbort), resolve(v)),
      (e) => (signal.removeEventListener('abort', onAbort), reject(e)),
    );
  });
}

const wait = (ms: number, signal: AbortSignal) => bounded(new Promise<void>((r) => setTimeout(r, ms)), signal);

export function createEraser(deps: EraseDeps): Eraser {
  let slots = 0;
  const retry = new Map<string, number>(); // id → first failure (ms)
  let background: Promise<void> = Promise.resolve();
  let sweepQueued = false;

  /** One DELETE; 'done', 'auth' (401) or 'failed'. */
  async function deleteOnce(id: string, token: string, signal: AbortSignal): Promise<'done' | 'auth' | 'failed'> {
    try {
      const res = await deps.fetch(deps.visitorUrl(id), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        cache: 'no-store',
        signal,
      });
      if (res.status === 204 || res.status === 400) return 'done';
      return res.status === 401 ? 'auth' : 'failed';
    } catch {
      return 'failed';
    }
  }

  async function eraseNow(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const deadline = timer(ERASE_DEADLINE_MS);
    try {
      let token = await bounded(deps.getToken(), deadline.signal);
      let refresh: Promise<string> | null = null;
      const one = async (id: string): Promise<boolean> => {
        for (let attempt = 0; attempt < ATTEMPTS && !deadline.signal.aborted; attempt += 1) {
          if (attempt > 0) await wait(ATTEMPT_GAP_MS, deadline.signal).catch(() => {});
          if (deadline.signal.aborted) break;
          const per = timer(ATTEMPT_TIMEOUT_MS);
          const outcome = await deleteOnce(id, token, AbortSignal.any([per.signal, deadline.signal]));
          per.clear();
          if (outcome === 'done') return true;
          if (outcome === 'auth') {
            // One shared refresh for all ids, inside the deadline.
            refresh ??= (deps.invalidateToken(), bounded(deps.getToken(), deadline.signal));
            token = await refresh.catch(() => token);
          }
        }
        return false;
      };
      const results = await Promise.all(ids.map((id) => one(id)));
      return ids.filter((_, i) => !results[i]);
    } catch {
      return [...ids]; // no token within the deadline
    } finally {
      deadline.clear();
    }
  }

  const queueRetry = (ids: string[]) => {
    for (const id of ids) {
      if (retry.has(id)) continue;
      if (retry.size >= RETRY_SET_MAX) {
        const oldest = retry.keys().next().value;
        if (oldest !== undefined) retry.delete(oldest);
      }
      retry.set(id, deps.now());
      deps.count('retryQueued');
    }
  };

  /** Appends a job to the background budget (one at a time; never blocks user forgets). */
  const enqueueBackground = (job: () => Promise<void>) => {
    background = background.then(job).catch(() => {});
  };

  /** One attempt per id on the background budget; true when done. */
  async function backgroundDelete(id: string): Promise<boolean> {
    const per = timer(ATTEMPT_TIMEOUT_MS);
    try {
      const token = await bounded(deps.getToken(), per.signal);
      const outcome = await deleteOnce(id, token, per.signal);
      if (outcome === 'auth') deps.invalidateToken();
      return outcome === 'done';
    } catch {
      return false;
    } finally {
      per.clear();
    }
  }

  async function runSweep() {
    sweepQueued = false;
    const now = deps.now();
    let done = 0;
    for (const [id, since] of [...retry]) {
      if (done >= SWEEP_BATCH) break;
      if (now - since >= RETRY_FOR_MS) {
        retry.delete(id); // gave up after 24 h
        deps.count('retryExpired');
        continue;
      }
      done += 1;
      if (!(await backgroundDelete(id))) break; // stop at the first failure (N2)
      retry.delete(id);
      deps.count('retryDone');
    }
  }

  return {
    eraseNow,
    tryAcquire() {
      if (slots >= ERASE_SLOTS) return false;
      slots += 1;
      return true;
    },
    release() {
      slots = Math.max(0, slots - 1);
    },
    queueRetry,
    reDeleteAfter(settled, ids) {
      void settled.then(() =>
        enqueueBackground(async () => {
          for (const id of ids) {
            deps.count('reDelete');
            if (!(await backgroundDelete(id))) queueRetry([id]);
          }
        }),
      );
    },
    sweep() {
      if (!sweepQueued && retry.size > 0) {
        sweepQueued = true;
        enqueueBackground(runSweep);
      }
      return background;
    },
    idle: () => background,
    retrySize: () => retry.size,
  };
}

/** At most one `<prefix>` summary line a minute with counts only (C17). */
export function createCounterLog(prefix: string, log: (line: string) => void, now: () => number, everyMs = 60_000) {
  let counts: Record<string, number> = {};
  let last = -Infinity;
  return {
    count(key: string, n = 1) {
      counts[key] = (counts[key] ?? 0) + n;
      const t = now();
      if (t - last < everyMs) return;
      last = t;
      log(`${prefix}: ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(' ')}`);
      counts = {};
    },
  };
}
