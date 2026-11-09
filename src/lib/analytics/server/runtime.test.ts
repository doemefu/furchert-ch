// Process wiring (spec 100 §5.8; #172 review S6): the forget route never
// shares a limiter instance with the collect route.
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/auth.env', () => ({ AUTH_ENV: { OIDC_CLIENT_ID: 'x', OIDC_CLIENT_SECRET: 'y' } }));

const { collectDeps, forgetDeps } = await import('./runtime');

describe('runtime wiring', () => {
  it('collect and forget limiters are separate instances; one process-wide set each', () => {
    const c = collectDeps().limits;
    const f = forgetDeps().limits;
    const collect = Object.values(c);
    const forget = Object.values(f);
    expect(new Set([...collect, ...forget]).size).toBe(collect.length + forget.length);
    expect(collectDeps().limits.requestsPerKey).toBe(c.requestsPerKey);
    expect(forgetDeps().limits.perKey).toBe(f.perKey);
  });

  it('charging the collect windows leaves the forget windows untouched', () => {
    const c = collectDeps().limits;
    const now = Date.now();
    c.requestsPerKey.charge('203.0.113.1', 20, now);
    c.requestsGlobal.charge('global', 300, now);
    const f = forgetDeps().limits;
    expect(f.perKey.wouldExceed('203.0.113.1', 1, now)).toBe(false);
    expect(f.global.wouldExceed('global', 1, now)).toBe(false);
  });
});
