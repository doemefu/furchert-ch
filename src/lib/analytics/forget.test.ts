// Stubbed forget contract test (spec 100 §10.1, F21): the request WA-2a
// sends to `POST /api/v/forget`. The route itself ships in WA-2b (#154).
import { describe, expect, it, vi } from 'vitest';
import { FORGET_ENDPOINT, parseRetryAfter, sendForget } from './forget';

const respond = (status: number, headers: Record<string, string> = {}) =>
  vi.fn(async () => new Response(status === 204 ? null : '', { status, headers }));

describe('sendForget', () => {
  it('sends the data-free forget request exactly as the contract says', async () => {
    const fetchFn = respond(204);
    await sendForget(fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith('/api/v/forget', {
      method: 'POST',
      keepalive: true,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect(FORGET_ENDPOINT).toBe('/api/v/forget');
  });

  it('succeeds only on 204', async () => {
    expect(await sendForget(respond(204))).toEqual({ ok: true });
    for (const status of [200, 400, 404, 500, 503]) {
      expect(await sendForget(respond(status)), String(status)).toEqual({ ok: false, retryAfterMs: null });
    }
  });

  it('passes a 429 Retry-After on as milliseconds', async () => {
    expect(await sendForget(respond(429, { 'Retry-After': '30' }))).toEqual({ ok: false, retryAfterMs: 30_000 });
    expect(await sendForget(respond(429))).toEqual({ ok: false, retryAfterMs: null });
  });

  it('reports a network error as a failure without throwing', async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    expect(await sendForget(fetchFn)).toEqual({ ok: false, retryAfterMs: null });
  });
});

describe('parseRetryAfter', () => {
  it('accepts 1 to 600 delta-seconds only', () => {
    expect(parseRetryAfter('1')).toBe(1_000);
    expect(parseRetryAfter('600')).toBe(600_000);
    for (const v of [null, '', '0', '601', '-5', '1.5', 'Wed, 21 Oct 2026 07:28:00 GMT']) {
      expect(parseRetryAfter(v), String(v)).toBeNull();
    }
  });
});
