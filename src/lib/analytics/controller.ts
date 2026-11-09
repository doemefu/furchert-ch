// Consent controller (spec 100 §4.1, §4.4, §10.1; WA-2a #153): the one place
// that decides whether the bar shows and the tracker runs, and that orders
// Decline/withdrawal before the forget. Dependencies are injected so the
// node tests drive it without a DOM. React binds to it through
// `subscribe`/`getSnapshot` (`useSyncExternalStore`).
//
// Rules this file enforces:
// - Before a choice nothing is written, sent or loaded (§1.4).
// - Decline/withdrawal: store `denied`, stop and abort the tracker, set
//   `fa_forget_pending`, then forget; the marker goes on a 204 only.
// - One forget at a time (`forget()`); a pending forget is retried once per
//   document load and only while tracking is not allowed (choice not
//   `granted`, or the never-track switch on) and the path is public; a 429
//   may schedule one more attempt, cancelled by an Allow.
// - The tracker starts only while granted, not opted out, no forget pending,
//   not on `/dashboard/**`, and `mayStart()` agrees.
// - GPC/DNT (§4.1; WA-5 #157): with no stored choice and no opt-out, the
//   signal is a refusal: `denied` with `by: "signal"` and the pending marker
//   are stored at once, and the boot sends the one forget. An explicit choice
//   from the bar (Allow, or Decline) is stored with `by: "user"` (review L11).
// - The bar first appears on the visitor's first interaction (pointerdown,
//   keydown, wheel, touchstart or scroll; owner decision 2026-11-09, WA-6
//   #158), so it never becomes the page's LCP element. The footer link opens
//   it at once; a bfcache restore with the bar pending counts as interaction.
import {
  CONSENT_EVENT,
  CONSENT_KEY,
  FORGET_PENDING_KEY,
  OPTOUT_KEY,
  readConsent,
  readFlag,
  serializeConsent,
  type ConsentBy,
  type ConsentChoice,
  type ConsentRecord,
  type StorageLike,
} from './consent';
import { sendForget, type ForgetResult } from './forget';
import { isBarSuppressedPath } from './paths';
import { FORM_HOOKS_KEY, type FormHooks } from './formHooks';
import type { LoadTracker, TrackerPort } from './trackerPort';

export interface ControllerDeps {
  /** `localStorage`, or null when the browser blocks it. */
  storage: StorageLike | null;
  fetch: typeof fetch;
  now: () => Date;
  /** Target for the same-tab `fa:consent` event (window). */
  events: Pick<EventTarget, 'dispatchEvent'>;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
  loadTracker: LoadTracker;
  /** Extra start condition (seam; the session status is handled by `setSession`). */
  mayStart?: () => boolean;
  /** GPC or DNT is on (§4.1; WA-5). Absent = no signal. */
  privacySignal?: () => boolean;
  /**
   * Calls `cb` once on the first user interaction and returns a cleanup
   * (WA-6). Absent = the bar may show at once (tests of the other rules).
   */
  onFirstInteraction?: (cb: () => void) => () => void;
}

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface ConsentSnapshot {
  /** False until `init()` ran; the bar never shows before. */
  ready: boolean;
  choice: ConsentChoice | null;
  /** Who made the stored choice; `signal` shows the signal notice when reopened. */
  by: ConsentBy | null;
  optedOut: boolean;
  suppressed: boolean;
  /** Opened from the footer link (shows the current choice). */
  reopened: boolean;
  barOpen: boolean;
}

export interface ConsentController {
  /** Once per document load; later calls only update the path. */
  init(path: string): Promise<void>;
  getSnapshot(): ConsentSnapshot;
  subscribe(listener: () => void): () => void;
  allow(): Promise<void>;
  decline(by?: ConsentBy): Promise<void>;
  /** Serialised forget; WA-2b and the WA-4a never-track switch use it too. */
  forget(): Promise<ForgetResult>;
  /** The never-track switch (§9.3). Resolves false when the switch could not be stored (blocked storage). */
  optOut(on: boolean): Promise<boolean>;
  /** Auth.js session status: `loading` holds the first pageview, `authenticated` stops tracking (§3.4, D8). */
  setSession(status: SessionStatus): void;
  /** §5.9: whether the contact form may ask for a goal (tracking allowed). */
  analyticsFlag(): boolean;
  /** Waits for the tracker's first flush of the current run, at most `maxMs`. */
  awaitFirstFlush(maxMs: number): Promise<void>;
  /** Esc: hide until the next document load, store nothing. */
  dismiss(): void;
  /** Footer link: show the bar with the current choice. */
  reopen(): void;
  /** A `storage` event from another tab (`key` null = storage cleared). */
  onStorage(key: string | null, newValue: string | null): void;
  onPageShow(persisted: boolean): void;
}

export const SERVER_SNAPSHOT: ConsentSnapshot = Object.freeze({
  ready: false,
  choice: null,
  by: null,
  optedOut: false,
  suppressed: false,
  reopened: false,
  barOpen: false,
});

export function createConsentController(deps: ControllerDeps): ConsentController {
  const { storage } = deps;
  let ready = false;
  let booted = false;
  let path = '/';
  let record: ConsentRecord | null = null;
  let optedOut = false;
  let dismissed = false;
  // WA-6: the automatic bar waits for the first interaction (true without the seam).
  let interacted = !deps.onFirstInteraction;
  let stopWaiting: (() => void) | null = null;
  let reopened = false;
  let snapshot = SERVER_SNAPSHOT;
  const listeners = new Set<() => void>();

  let trackerLoad: Promise<TrackerPort> | null = null;
  let tracker: TrackerPort | null = null;
  let started = false;
  let forgetInFlight: Promise<ForgetResult> | null = null;
  let retryTimer: unknown = null;
  let retryUsed = false;
  let session: SessionStatus = 'loading';

  const choice = () => record?.choice ?? null;
  const suppressed = () => isBarSuppressedPath(path);
  const pending = () => readFlag(storage, FORGET_PENDING_KEY);
  // Tracking allowed = granted and the never-track switch off. A pending
  // forget is retried only while tracking is not allowed (F5).
  const trackingAllowed = () => choice() === 'granted' && !optedOut;

  const set = (key: string, value: string): boolean => {
    try {
      if (!storage) return false;
      storage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  };
  const remove = (key: string) => {
    try {
      storage?.removeItem(key);
    } catch {
      // storage blocked: nothing to remove
    }
  };

  const emit = () => {
    const c = choice();
    const sup = suppressed();
    snapshot = {
      ready,
      choice: c,
      by: record?.by ?? null,
      optedOut,
      suppressed: sup,
      reopened,
      barOpen: ready && !sup && (reopened || (interacted && c === null && !optedOut && !dismissed)),
    };
    listeners.forEach((l) => l());
  };

  const announce = () => {
    deps.events.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: { choice: choice() } }));
  };

  // H3: what the tracker asks right before every request.
  const allowed = () => trackingAllowed() && !pending() && session === 'unauthenticated';
  const canStart = () => allowed() && !suppressed() && (deps.mayStart?.() ?? true);

  const maybeStart = () => {
    if (started || !canStart()) return;
    trackerLoad ??= deps.loadTracker({ allowed, consentDate: () => record?.at ?? null });
    void trackerLoad.then((t) => {
      tracker = t;
      if (!started && canStart()) {
        started = true;
        t.setPath(path);
        t.start();
      }
    });
  };

  const halt = () => {
    started = false;
    tracker?.stop();
    tracker?.abortInFlight();
  };

  const clearRetry = () => {
    if (retryTimer !== null) deps.clearTimeout(retryTimer);
    retryTimer = null;
  };

  const forget = (): Promise<ForgetResult> => {
    if (forgetInFlight) return forgetInFlight;
    clearRetry();
    forgetInFlight = sendForget(deps.fetch).then((result) => {
      forgetInFlight = null;
      if (result.ok) {
        if (pending()) remove(FORGET_PENDING_KEY);
      } else if (result.retryAfterMs !== null && !retryUsed) {
        retryUsed = true;
        retryTimer = deps.setTimeout(() => {
          retryTimer = null;
          if (!trackingAllowed() && pending() && !suppressed()) void forget();
        }, result.retryAfterMs);
      }
      return result;
    });
    return forgetInFlight;
  };

  // Deferred start-of-document work; never runs on /dashboard/** (it waits
  // for the first public path) and never sends anything before a choice.
  const boot = async () => {
    booted = true;
    // No network before a choice (§1.4): with neither a choice nor the
    // never-track switch, a pending marker waits for the next choice.
    if (pending() && (choice() !== null || optedOut)) {
      if (trackingAllowed()) {
        // Allowed again while a forget was pending: one attempt, then the
        // marker goes whatever the answer, then the tracker may start.
        await forget();
        if (pending()) remove(FORGET_PENDING_KEY);
      } else {
        await forget();
      }
    }
    maybeStart();
  };

  const reread = () => {
    const wasRunning = started;
    const before = choice();
    record = readConsent(storage, deps.now());
    optedOut = readFlag(storage, OPTOUT_KEY);
    if (choice() !== before) {
      reopened = false;
      announce();
    }
    if (wasRunning && !trackingAllowed()) halt();
    maybeStart();
    emit();
  };

  const store = (next: ConsentChoice, by: ConsentBy) => {
    const before = choice();
    // A user choice also rewrites a signal-made record with the same choice (L11).
    if (before !== next || record?.by !== by) {
      const now = deps.now();
      if (!set(CONSENT_KEY, serializeConsent(next, by, now)) && next === 'denied') {
        remove(CONSENT_KEY); // best effort: never leave an old `granted` behind
      }
      record = JSON.parse(serializeConsent(next, by, now)) as ConsentRecord;
    }
    reopened = false;
    if (before !== next) announce();
    emit();
  };

  return {
    init(nextPath) {
      path = nextPath;
      tracker?.setPath(nextPath);
      if (!ready) {
        ready = true;
        record = readConsent(storage, deps.now());
        optedOut = readFlag(storage, OPTOUT_KEY);
        if (record === null && !optedOut && deps.privacySignal?.()) {
          // GPC/DNT = refusal (§4.1): stored now, the boot sends the forget once.
          store('denied', 'signal');
          set(FORGET_PENDING_KEY, '1');
        }
        // Only a pending first-time bar waits; a stored choice or opt-out shows nothing.
        if (!interacted && record === null && !optedOut && deps.onFirstInteraction) {
          stopWaiting = deps.onFirstInteraction(() => {
            stopWaiting = null;
            interacted = true;
            emit();
          });
        }
      }
      emit();
      if (!booted && !suppressed()) return boot();
      if (!suppressed()) maybeStart();
      return Promise.resolve();
    },
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    async allow() {
      clearRetry();
      store('granted', 'user');
      if (forgetInFlight) await forgetInFlight;
      else if (pending()) await forget();
      clearRetry();
      // A Decline during the await keeps its own marker, and so does an
      // opted-out browser: its opt-out forget is retried (#159 N1).
      if (trackingAllowed() && pending()) remove(FORGET_PENDING_KEY);
      maybeStart();
    },
    async decline(by = 'user') {
      store('denied', by);
      halt();
      set(FORGET_PENDING_KEY, '1');
      await forget();
    },
    forget,
    async optOut(on) {
      if (on) {
        const stored = set(OPTOUT_KEY, '1');
        optedOut = true;
        emit();
        halt();
        set(FORGET_PENDING_KEY, '1');
        await forget();
        return stored;
      }
      let removed = true;
      try {
        storage?.removeItem(OPTOUT_KEY);
        if (!storage) removed = false;
      } catch {
        removed = false;
      }
      optedOut = false;
      emit();
      maybeStart();
      return removed;
    },
    dismiss() {
      dismissed = true;
      reopened = false;
      emit();
    },
    reopen() {
      reopened = true;
      emit();
    },
    onStorage(key) {
      if (!ready) return;
      if (key === null || key === CONSENT_KEY || key === OPTOUT_KEY) reread();
      else if (key === FORGET_PENDING_KEY) maybeStart();
    },
    onPageShow(persisted) {
      if (!ready || !persisted) return;
      if (!interacted) {
        // Back from the bfcache with the bar pending: the visitor came back on purpose.
        stopWaiting?.();
        stopWaiting = null;
        interacted = true;
      }
      reread();
      // M1: the tracker hears about a bfcache restore only if tracking is still allowed.
      if (started) tracker?.onPageShow();
    },
    setSession(status) {
      session = status;
      if (status === 'authenticated' && started) halt();
      else maybeStart();
    },
    analyticsFlag: () => trackingAllowed(),
    awaitFirstFlush: (maxMs) => (started && tracker ? tracker.awaitFirstFlush(maxMs) : Promise.resolve()),
  };
}

/** The events that count as a first interaction (WA-6). Keyboard users: keydown covers Tab. */
export const FIRST_INTERACTION_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;

/**
 * Calls `cb` once on the first of FIRST_INTERACTION_EVENTS on `target`
 * (passive, capture), then removes every listener. Returns a cleanup.
 */
export function onFirstInteraction(target: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>, cb: () => void): () => void {
  const opts = { capture: true, passive: true } as const;
  const stop = () => {
    for (const type of FIRST_INTERACTION_EVENTS) target.removeEventListener(type, fire, opts);
  };
  function fire() {
    stop();
    cb();
  }
  for (const type of FIRST_INTERACTION_EVENTS) target.addEventListener(type, fire, opts);
  return stop;
}

// ── Browser singleton ──────────────────────────────────────────────────────
// One controller per document, shared by the bar, the footer link and (from
// WA-2b) the tracker; it survives client-side navigation.

// On `globalThis`, not module scope: a second bundled copy of this module
// (the dashboard's never-track switch chunk) must reuse the same controller
// (review H1).
const CONTROLLER_KEY = Symbol.for('furchert.analytics.consentController');

export function getConsentController(): ConsentController {
  const g = globalThis as Record<symbol, ConsentController | undefined>;
  let instance = g[CONTROLLER_KEY];
  if (!instance) {
    let storage: StorageLike | null = null;
    try {
      storage = window.localStorage;
    } catch {
      storage = null;
    }
    instance = createConsentController({
      storage,
      fetch: (input, init) => fetch(input, init),
      now: () => new Date(),
      privacySignal: () => {
        const n = navigator as Navigator & { globalPrivacyControl?: boolean };
        return n.globalPrivacyControl === true || n.doNotTrack === '1';
      },
      events: window,
      onFirstInteraction: (cb) => onFirstInteraction(window, cb),
      setTimeout: (fn, ms) => window.setTimeout(fn, ms),
      clearTimeout: (handle) => window.clearTimeout(handle as number),
      // The tracker is its own async chunk, fetched only after Allow.
      loadTracker: (hooks) => import('./tracker').then((m) => m.createBrowserTracker(hooks)),
    });
    g[CONTROLLER_KEY] = instance;
    const controller = instance;
    const hooks: FormHooks = {
      analyticsFlag: () => controller.analyticsFlag(),
      awaitFirstFlush: (maxMs) => controller.awaitFirstFlush(maxMs),
    };
    (globalThis as Record<symbol, unknown>)[FORM_HOOKS_KEY] = hooks;
  }
  return instance;
}

export const subscribeConsent = (listener: () => void) => getConsentController().subscribe(listener);
export const getConsentSnapshot = () => getConsentController().getSnapshot();
export const getServerConsentSnapshot = () => SERVER_SNAPSHOT;
