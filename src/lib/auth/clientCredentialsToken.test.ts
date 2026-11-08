import { afterEach, describe, expect, it, vi } from 'vitest';
import { createClientCredentialsToken } from './clientCredentialsToken';

const keys: string[] = [];
function make(responses: (() => Promise<Response>)[], now = { t: 1_000_000 }) {
  const key = `test.token.${Math.random()}`;
  keys.push(key);
  const fetchFn = vi.fn(async () => (responses.shift() ?? (async () => new Response('', { status: 500 })))());
  const token = createClientCredentialsToken('analytics:write', key, {
    tokenUrl: () => 'http://auth.test/oauth2/token',
    clientId: () => 'furchert-ch',
    clientSecret: () => 's3cret',
    fetch: fetchFn as unknown as typeof fetch,
    now: () => now.t,
  });
  return { token, fetchFn, now };
}
const ok = (access_token: string, expires_in?: number) => async () =>
  new Response(JSON.stringify({ access_token, expires_in }), { status: 200 });

afterEach(() => {
  for (const k of keys.splice(0)) delete (globalThis as Record<symbol, unknown>)[Symbol.for(k)];
});

describe('createClientCredentialsToken', () => {
  it('requests one scope with Basic auth and form body', async () => {
    const { token, fetchFn } = make([ok('t1', 900)]);
    expect(await token.get()).toBe('t1');
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://auth.test/oauth2/token');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe(`Basic ${btoa('furchert-ch:s3cret')}`);
    expect(String(init.body)).toBe('grant_type=client_credentials&scope=analytics%3Awrite');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('caches until exp − 60 s and dedupes concurrent requests', async () => {
    const { token, fetchFn, now } = make([ok('t1', 900), ok('t2', 900)]);
    const [a, b] = await Promise.all([token.get(), token.get()]);
    expect([a, b]).toEqual(['t1', 't1']);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    now.t += 839_000;
    expect(await token.get()).toBe('t1');
    now.t += 2_000;
    expect(await token.get()).toBe('t2');
  });

  it('uses a 120 s fallback lifetime without expires_in, and invalidate drops the cache', async () => {
    const { token, fetchFn, now } = make([ok('t1'), ok('t2'), ok('t3')]);
    await token.get();
    now.t += 119_000;
    expect(await token.get()).toBe('t1');
    now.t += 2_000;
    expect(await token.get()).toBe('t2');
    token.invalidate();
    expect(await token.get()).toBe('t3');
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('throws on non-2xx or a body without access_token, never echoing the body', async () => {
    const { token } = make([async () => new Response('{"error":"invalid_client","error_description":"secret=x"}', { status: 401 })]);
    await expect(token.get()).rejects.toThrow('token request failed: HTTP 401');
    const bad = make([async () => new Response('{}', { status: 200 })]);
    await expect(bad.token.get()).rejects.toThrow('token response without access_token');
  });

  it('keeps separate caches per symbol key', async () => {
    const a = make([ok('a', 900)]);
    const b = make([ok('b', 900)]);
    expect(await a.token.get()).toBe('a');
    expect(await b.token.get()).toBe('b');
  });
});
