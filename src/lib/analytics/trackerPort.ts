// The consent controller's only handle on the tracker (spec 100 §3.10, §4.4).
// The real tracker (src/lib/analytics/tracker/, WA-2b #154) is loaded through
// a dynamic `import()` after Allow. Contract for implementations:
// - `start()` is idempotent; the controller calls it only while the choice is
//   `granted`, the never-track switch is off, no forget is pending, the
//   visitor is not signed in and the path is not under `/dashboard`. A start
//   after a stop is a restart within the same document: its first pageview
//   is not a landing, and its first flush is serialised and immediate again.
// - `stop()` stops capturing, drops the in-memory queue and clears every
//   timer; `abortInFlight()` aborts every in-flight `/api/v` request through
//   its AbortController. Both are synchronous, so the controller can order
//   them before the forget.
// - `setPath(localeFreePath)` reports soft navigations; `onPageShow()` a
//   bfcache restore that the controller has re-checked (review M1).
// - The tracker asks `hooks.allowed()` right before every request (H3).
// - Stop and abort happen only through this port, never through the
//   `fa:consent` event (which is for observers).

export interface TrackerPort {
  start(): void;
  stop(): void;
  abortInFlight(): void;
  setPath(localeFreePath: string): void;
  onPageShow(): void;
  /** Resolves once the first flush of the current run answered, or after `maxMs`. */
  awaitFirstFlush(maxMs: number): Promise<void>;
}

export interface TrackerHooks {
  /** Tracking allowed right now (granted, not opted out, no forget pending, not signed in). */
  allowed(): boolean;
  /** `at` of the stored consent record, sent as `consentDate`; null = do not send. */
  consentDate(): string | null;
}

export type LoadTracker = (hooks: TrackerHooks) => Promise<TrackerPort>;

export const noopTracker: TrackerPort = {
  start() {},
  stop() {},
  abortInFlight() {},
  setPath() {},
  onPageShow() {},
  awaitFirstFlush: async () => {},
};

/** Placeholder loader for tests and environments without the tracker chunk. */
export const loadNoopTracker: LoadTracker = async () => noopTracker;
