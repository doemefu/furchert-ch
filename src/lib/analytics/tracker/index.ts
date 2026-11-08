// The consented tracker (spec 100 §3.4 to §3.10; WA-2b #154). Loaded as its
// own async chunk by the consent controller only after Allow (`loadTracker`),
// so nothing here runs before a choice. Pure logic over an injected
// environment; `createBrowserTracker` wires the real window.
//
// - One pageview per locale-free path change (the controller passes it in);
//   locale-only switches are no pageview. `landing` only for the first
//   pageview built in a document (also when Allow happened on an untracked
//   page); referrer and UTM are read only then (first value of a duplicated
//   key wins; values over 64 characters are sent as null). The first pageview
//   of every run is flushed at once (that request mints `fa_vid`). Every
//   event of a pageview keeps the pathname it was built with.
// - Non-tracked paths (legal pages, /dashboard/**) pause capture and sending;
//   coming back is a non-landing pageview (review M6).
// - Engagement snapshots: soft navigation away, hidden, pagehide, before
//   outbound/mailto/tel, and a 60 s heartbeat while engaged if engaged time
//   grew ≥ 10 s; at most 20 per pageview, `seq` 1..99, 50 clicks per pageview.
// - `navigator.webdriver === true` keeps it off. No unload/beforeunload
//   listeners; the controller owns `pageshow` and calls `onPageShow()`.
import { isTracked } from '../registry';
import { ANALYTICS_CONSENT_VERSION } from '../consent';
import type { TrackerHooks, TrackerPort } from '../trackerPort';
import { classifyClick, type ElementLike } from './clicks';
import { EngagementClock, scrollStep } from './engagement';
import { Transport, type ClientEvent, type LocksLike } from './transport';

// §3.7 order; data-track-section values on /automation.
const SECTIONS = ['hero', 'so-arbeite-ich', 'beispiel', 'preise', 'daten', 'ueber-mich', 'faq', 'final'];
const MAX_SNAPSHOTS = 20;
const MAX_CLICKS = 50;
const HEARTBEAT_MS = 60_000;
const HEARTBEAT_MIN_GAIN_MS = 10_000;

type Listener = (e: Event) => void;
interface Target {
  addEventListener(type: string, fn: Listener, opts?: AddEventListenerOptions | boolean): void;
  removeEventListener(type: string, fn: Listener, opts?: EventListenerOptions | boolean): void;
}

export interface TrackerEnv {
  win: Target & {
    innerWidth: number;
    innerHeight: number;
    location: { pathname: string; search: string; host: string; origin: string };
  };
  doc: Target & {
    visibilityState: string;
    referrer: string;
    hasFocus(): boolean;
    querySelector(selector: string): { getBoundingClientRect(): { top: number; height: number } } | null;
  };
  webdriver: boolean;
  locks: LocksLike | null;
  fetch: typeof fetch;
  now: () => number;
  perf: () => number;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
  uuid: () => string;
  /** Calls `onReach(id)` once a `[data-track-section]` top reaches mid-viewport; returns a disconnect. */
  observeSections: (onReach: (id: string) => void) => () => void;
}

export interface Tracker extends TrackerPort {
  awaitFirstFlush(maxMs: number): Promise<void>;
}

interface View {
  id: string;
  /** Raw pathname when the pageview was built; every event of the view keeps it (review B1). */
  rawPath: string;
  seq: number;
  clock: EngagementClock;
  scrollMax: number;
  fits: boolean;
  sectionMask: number;
  formStarted: boolean;
  snapshots: number;
  clicks: number;
  faq: Set<string>;
  lastSnapshot: number;
}

const VIEWPORTS: [number, string][] = [[480, '<480'], [768, '480-767'], [1024, '768-1023'], [1440, '1024-1439']];
export const viewportBucket = (w: number) => VIEWPORTS.find(([max]) => w < max)?.[1] ?? '>=1440';

export function createTracker(env: TrackerEnv, hooks: TrackerHooks): Tracker {
  const { win, doc } = env;
  let running = false;
  // The document's landing pageview is still to come (§3.4); set only once a pageview was built (N2).
  let landingDue = true;
  // The first pageview of a run is flushed at once: it mints `fa_vid` (§3.9).
  let firstOfRun = false;
  let path: string | null = null;
  let view: View | null = null;
  let heartbeat: unknown = null;
  let unobserve: (() => void) | null = null;
  let lastMove = -Infinity;

  const transport = new Transport({
    fetch: env.fetch,
    now: env.now,
    setTimeout: env.setTimeout,
    clearTimeout: env.clearTimeout,
    locks: env.locks,
    allowed: () => running && hooks.allowed(),
    envelope: () => {
      const consentDate = hooks.consentDate();
      return consentDate ? { cv: ANALYTICS_CONSENT_VERSION, consentDate, viewport: viewportBucket(win.innerWidth) } : null;
    },
  });

  const base = (type: string, seq: number): ClientEvent => ({
    eventId: env.uuid(),
    type,
    ts: env.now(),
    pageviewId: view!.id,
    seq,
    path: view!.rawPath,
  });

  const nextSeq = () => (view && view.seq < 99 ? ++view.seq : null);

  function measureScroll() {
    const main = doc.querySelector('main');
    if (!main || !view) return;
    const r = main.getBoundingClientRect();
    view.scrollMax = Math.max(view.scrollMax, scrollStep(r.top, r.height, win.innerHeight));
  }

  function snapshot() {
    if (!view || view.snapshots >= MAX_SNAPSHOTS) return;
    const seq = nextSeq();
    if (seq === null) return;
    view.snapshots += 1;
    view.lastSnapshot = view.clock.value(env.perf());
    measureScroll();
    transport.push({
      ...base('engagement', seq),
      engagedMs: view.lastSnapshot,
      scrollMax: view.scrollMax,
      fits: view.fits,
      sectionMask: view.sectionMask,
      formStarted: view.formStarted,
    });
  }

  function armHeartbeat() {
    if (heartbeat !== null) env.clearTimeout(heartbeat);
    heartbeat = env.setTimeout(() => {
      heartbeat = null;
      if (!running || !view) return;
      const t = env.perf();
      if (view.clock.engaged(t) && view.clock.value(t) - view.lastSnapshot >= HEARTBEAT_MIN_GAIN_MS) snapshot();
      armHeartbeat();
    }, HEARTBEAT_MS);
  }

  // Optional landing values longer than the canonical 64 characters go out as
  // null; one overlong value would otherwise fail the whole batch (N1).
  const short = (v: string | null) => (v !== null && v.length <= 64 ? v : null);

  function pageview(bfcache = false) {
    const landing = landingDue && !bfcache;
    const immediate = firstOfRun;
    landingDue = false;
    firstOfRun = false;
    const t = env.perf();
    view = {
      id: env.uuid(),
      rawPath: win.location.pathname,
      seq: 0,
      clock: new EngagementClock(t, doc.visibilityState === 'visible', doc.hasFocus()),
      scrollMax: 0,
      fits: false,
      sectionMask: 0,
      formStarted: false,
      snapshots: 0,
      clicks: 0,
      faq: new Set(),
      lastSnapshot: 0,
    };
    const main = doc.querySelector('main');
    if (main) {
      const r = main.getBoundingClientRect();
      view.fits = r.top + r.height <= win.innerHeight;
      measureScroll();
    }
    let referrerHost: string | null = null;
    let utm: (string | null)[] = [null, null, null];
    if (landing) {
      try {
        const ref = doc.referrer ? new URL(doc.referrer) : null;
        if (ref && /^https?:$/.test(ref.protocol) && ref.host !== win.location.host) referrerHost = short(ref.hostname);
      } catch {
        referrerHost = null;
      }
      const q = new URLSearchParams(win.location.search);
      utm = ['utm_source', 'utm_medium', 'utm_campaign'].map((k) => short(q.get(k)));
    }
    transport.push(
      { ...base('pageview', 0), landing, referrerHost, utmSource: utm[0], utmMedium: utm[1], utmCampaign: utm[2] },
      immediate,
    );
    unobserve?.();
    unobserve = path === '/automation'
      ? env.observeSections((id) => {
          const i = SECTIONS.indexOf(id);
          if (view && i >= 0) view.sectionMask |= 1 << i;
        })
      : null;
  }

  const on = {
    visibility: () => {
      if (!view) return;
      const hidden = doc.visibilityState !== 'visible';
      view.clock.visibility(!hidden, env.perf());
      if (hidden) {
        snapshot();
        void transport.flush();
      }
    },
    focus: () => view?.clock.focus(true, env.perf()),
    blur: () => view?.clock.focus(false, env.perf()),
    activity: (e: Event) => {
      if (!view) return;
      const t = env.perf();
      if (e.type === 'pointermove') {
        if (t - lastMove < 1_000) return;
        lastMove = t;
      }
      view.clock.activity(t);
      if (e.type === 'scroll') measureScroll();
    },
    pagehide: () => {
      snapshot();
      void transport.flush();
    },
    click: (e: Event) => {
      if (!view || (e.type === 'auxclick' && (e as MouseEvent).button !== 1)) return;
      const info = classifyClick(e.target as unknown as ElementLike, win.location.origin);
      if (!info || view.clicks >= MAX_CLICKS) return;
      if (info.kind === 'faq') {
        if (!info.opening || view.faq.has(info.target!)) return;
        view.faq.add(info.target!);
      }
      const leaving = info.kind === 'outbound' || info.kind === 'mailto' || info.kind === 'tel';
      if (leaving) snapshot();
      const seq = nextSeq();
      if (seq === null) return;
      view.clicks += 1;
      transport.push({ ...base('click', seq), kind: info.kind, target: info.target, area: info.area }, leaving);
    },
    focusin: (e: Event) => {
      const el = e.target as unknown as ElementLike | null;
      if (view && path === '/contact' && el?.closest?.('form')) view.formStarted = true;
    },
  };

  const passive = { capture: true, passive: true };
  const bindings: [Target, string, Listener, AddEventListenerOptions | boolean][] = [
    [doc, 'visibilitychange', on.visibility, false],
    [win, 'focus', on.focus, false],
    [win, 'blur', on.blur, false],
    ...(['scroll', 'pointerdown', 'keydown', 'touchstart', 'pointermove'].map(
      (type) => [win, type, on.activity, passive] as [Target, string, Listener, AddEventListenerOptions],
    )),
    [win, 'pagehide', on.pagehide, false],
    [doc, 'click', on.click, passive],
    [doc, 'auxclick', on.click, passive],
    [doc, 'focusin', on.focusin, passive],
  ];

  return {
    start() {
      if (running || env.webdriver) return;
      running = true;
      firstOfRun = true;
      transport.restart();
      for (const [t, type, fn, opts] of bindings) t.addEventListener(type, fn, opts);
      armHeartbeat();
      if (path !== null && isTracked(path)) pageview();
    },
    stop() {
      if (!running) return;
      running = false;
      for (const [t, type, fn, opts] of bindings) t.removeEventListener(type, fn, opts);
      if (heartbeat !== null) env.clearTimeout(heartbeat);
      heartbeat = null;
      unobserve?.();
      unobserve = null;
      view = null;
      transport.stop();
    },
    abortInFlight() {
      transport.abortInFlight();
    },
    setPath(next) {
      if (next === path) return;
      path = next;
      if (!running) return;
      snapshot();
      if (isTracked(next)) pageview();
      else {
        void transport.flush();
        unobserve?.();
        unobserve = null;
        view = null;
      }
    },
    onPageShow() {
      if (running && path !== null && isTracked(path)) pageview(true);
    },
    awaitFirstFlush: (maxMs) => transport.awaitFirstFlush(maxMs),
  };
}

/** The real browser environment; called by the controller's tracker loader. */
export function createBrowserTracker(hooks: TrackerHooks): Tracker {
  const nav = navigator as Navigator & { locks?: LocksLike };
  return createTracker(
    {
      win: window,
      doc: document,
      webdriver: nav.webdriver === true,
      locks: nav.locks ?? null,
      fetch: (input, init) => fetch(input, init),
      now: () => Date.now(),
      perf: () => performance.now(),
      setTimeout: (fn, ms) => window.setTimeout(fn, ms),
      clearTimeout: (h) => window.clearTimeout(h as number),
      uuid: () => crypto.randomUUID(),
      observeSections(onReach) {
        if (typeof IntersectionObserver === 'undefined') return () => {};
        const io = new IntersectionObserver(
          (entries) => {
            for (const e of entries) {
              if (e.isIntersecting) onReach((e.target as HTMLElement).dataset.trackSection ?? '');
            }
          },
          { rootMargin: '0px 0px -50% 0px' },
        );
        document.querySelectorAll('[data-track-section]').forEach((el) => io.observe(el));
        return () => io.disconnect();
      },
    },
    hooks,
  );
}
