// Engagement measures of one pageview (spec 100 §3.5). Pure state machines
// driven by timestamps from `performance.now()`; no polling timer.

export const ENGAGED_CAP_MS = 1_800_000;
const IDLE_MS = 60_000;

/**
 * Engaged = visible AND focused AND last activity ≤ 60 s ago. Time is summed
 * in segments; the pageview start counts as activity.
 */
export class EngagementClock {
  private total = 0;
  private since: number | null = null;
  private lastActivity: number;
  private visible: boolean;
  private focused: boolean;

  constructor(now: number, visible: boolean, focused: boolean) {
    this.lastActivity = now;
    this.visible = visible;
    this.focused = focused;
    if (visible && focused) this.since = now;
  }

  private settle(now: number) {
    if (this.since !== null) {
      const end = Math.min(now, this.lastActivity + IDLE_MS);
      if (end > this.since) this.total += end - this.since;
      this.since = null;
    }
  }

  private resume(now: number) {
    if (this.visible && this.focused && now - this.lastActivity <= IDLE_MS) this.since = now;
  }

  activity(now: number) {
    this.settle(now);
    this.lastActivity = now;
    this.resume(now);
  }

  visibility(visible: boolean, now: number) {
    this.settle(now);
    this.visible = visible;
    this.resume(now);
  }

  focus(focused: boolean, now: number) {
    this.settle(now);
    this.focused = focused;
    this.resume(now);
  }

  /** True while the visitor counts as engaged. */
  engaged(now: number): boolean {
    return this.visible && this.focused && now - this.lastActivity <= IDLE_MS;
  }

  value(now: number): number {
    let v = this.total;
    if (this.since !== null) v += Math.max(0, Math.min(now, this.lastActivity + IDLE_MS) - this.since);
    return Math.min(Math.round(v), ENGAGED_CAP_MS);
  }
}

const STEPS = [100, 90, 75, 50, 25, 0];

/** Highest step reached: how far the viewport bottom got down `<main>`. */
export function scrollStep(mainTop: number, mainHeight: number, viewportHeight: number): number {
  if (mainHeight <= 0) return 0;
  const seen = ((viewportHeight - mainTop) / mainHeight) * 100;
  return STEPS.find((s) => seen >= s) ?? 0;
}
