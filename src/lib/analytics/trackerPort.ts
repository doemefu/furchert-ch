// The consent controller's only handle on the tracker (spec 100 §3.10, §4.4).
// WA-2a ships no tracker; WA-2b (#154) supplies the real one through a
// dynamic `import()` in the loader. Contract for implementations:
// - `start()` is idempotent; the controller calls it only while the choice is
//   `granted`, the never-track switch is off, no forget is pending and the
//   path is not under `/dashboard`.
// - `stop()` stops capturing and drops the in-memory queue; `abortInFlight()`
//   aborts every in-flight `/api/v` request through its AbortController. Both
//   are synchronous, so the controller can order them before the forget.
// - Stop and abort happen only through this port, never through the
//   `fa:consent` event (which is for observers).

export interface TrackerPort {
  start(): void;
  stop(): void;
  abortInFlight(): void;
}

export type LoadTracker = () => Promise<TrackerPort>;

export const noopTracker: TrackerPort = {
  start() {},
  stop() {},
  abortInFlight() {},
};

/** WA-2a placeholder; WA-2b replaces it with the tracker chunk's import. */
export const loadNoopTracker: LoadTracker = async () => noopTracker;
