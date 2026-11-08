// What the contact form may ask the consent layer (spec 100 §5.9; review H2),
// without importing it: the controller registers these hooks on `globalThis`
// when it starts; while it does not exist (analytics dark, no JavaScript yet)
// the form gets `false` and an immediately resolved wait. Deliberately tiny
// and free of the consent code's marker strings, so the contact page chunk
// carries none of it.

export const FORM_HOOKS_KEY = Symbol.for('furchert.analytics.form');

export interface FormHooks {
  analyticsFlag(): boolean;
  awaitFirstFlush(maxMs: number): Promise<void>;
}

const hooks = () => (globalThis as Record<symbol, FormHooks | undefined>)[FORM_HOOKS_KEY];

/** True only while the visitor allows tracking. */
export function formAnalyticsFlag(): boolean {
  try {
    return hooks()?.analyticsFlag() === true;
  } catch {
    return false;
  }
}

/** Waits at most `maxMs` for a pending first flush, so a goal can find `fa_vid`. */
export function formAwaitFirstFlush(maxMs = 1000): Promise<void> {
  try {
    return hooks()?.awaitFirstFlush(maxMs).catch(() => {}) ?? Promise.resolve();
  } catch {
    return Promise.resolve();
  }
}
