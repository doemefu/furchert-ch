import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ENV = {
  DATA_SERVICE_URL: 'http://ds.test',
  DATA_SERVICE_TOKEN_URL: 'http://auth.test/oauth2/token',
  OIDC_ISSUER: 'http://auth.test',
  OIDC_CLIENT_ID: 'furchert-ch',
  OIDC_CLIENT_SECRET: 'placeholder-not-a-secret',
  AUTH_SECRET: 'placeholder-not-a-secret',
};

type Reply = { status: number; body?: unknown } | 'network';
let replies: Reply[] = [];
let calls: { url: string; auth?: string }[] = [];
let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  for (const [k, v] of Object.entries(ENV)) vi.stubEnv(k, v);
  replies = [];
  calls = [];
  let tokenN = 0;
  vi.stubGlobal('fetch', async (url: string, init: RequestInit = {}) => {
    if (url.endsWith('/oauth2/token')) return new Response(JSON.stringify({ access_token: `tok${++tokenN}`, expires_in: 900 }), { status: 200 });
    calls.push({ url, auth: (init.headers as Record<string, string>)?.Authorization });
    const r = replies.shift() ?? { status: 200, body: {} };
    if (r === 'network') throw new TypeError('fetch failed http://ds.test/secret?x=1');
    return new Response(r.body === undefined ? '' : JSON.stringify(r.body), { status: r.status });
  });
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  delete (globalThis as Record<symbol, unknown>)[Symbol.for('furchert.analytics.read-token')];
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  warn.mockRestore();
});

const range = { from: '2026-10-12', to: '2026-11-08', days: 28, lastCompleteDay: '2026-11-08', previous: { from: '2026-09-14', to: '2026-10-11' } };
const filters = { applied: {}, ignored: [] };
const page = {
  path: '/automation', pageviews: 10, pageviewsByLocale: { de: 8, en: 2 }, visitsViewed: 9, entries: 5, exits: 4,
  landingEngagedVisits: 3, landingConvertingVisits: 1, engagementSamples: 10, engagedMsSum: 100000,
  engagedHistogram: [1, 1, 2, 2, 2, 1, 1, 0], scrollSamples: 10, scrollReached: { p25: 9, p50: 7, p75: 5, p90: 3, p100: 2 },
};

describe('read client', () => {
  it('builds URLs from validated params only, with explicit limit=100 for lists (L7)', async () => {
    const read = await import('./read');
    replies = [{ status: 200, body: { range, filters, items: [] } }, { status: 200, body: { range, filters, items: [] } }];
    await read.getClicks({ from: '2026-10-12', to: '2026-11-08', compare: 'previous', locale: 'de' }, 'cta');
    await read.getPages({ from: undefined, to: undefined });
    expect(calls[0].url).toBe('http://ds.test/api/webanalytics/clicks?from=2026-10-12&to=2026-11-08&compare=previous&locale=de&kind=cta&limit=100');
    expect(calls[1].url).toBe('http://ds.test/api/webanalytics/pages?limit=100');
    expect(calls[0].auth).toBe('Bearer tok1');
  });

  it('retries once with a fresh token after 401', async () => {
    const read = await import('./read');
    replies = [{ status: 401 }, { status: 200, body: { range, filters, items: [page] } }];
    const r = await read.getPages({});
    expect(r.ok).toBe(true);
    expect(calls.map((c) => c.auth)).toEqual(['Bearer tok1', 'Bearer tok2']);
  });

  it('maps problems, network errors and bad shapes, logging status only', async () => {
    const read = await import('./read');
    replies = [{ status: 400, body: { code: 'invalid_window', detail: 'x' } }, 'network', { status: 200, body: { range, filters, items: [{ ...page, engagedHistogram: [1, 2] }] } }];
    expect(await read.getPages({})).toEqual({ ok: false, kind: 'problem', status: 400, code: 'invalid_window' });
    expect(await read.getPages({})).toEqual({ ok: false, kind: 'unreachable' });
    expect(await read.getPages({})).toEqual({ ok: false, kind: 'malformed' });
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).not.toMatch(/tok\d|secret|\?x=1|ds\.test/);
  });

  it('accepts the empty range and nullable fields (M5)', async () => {
    const read = await import('./read');
    const empty = { from: null, to: null, days: 0, lastCompleteDay: null, previous: null };
    const counts = Object.fromEntries(['visits', 'newVisits', 'returningVisits', 'engagedVisits', 'offerVisits', 'engagedOfferVisits', 'contactIntentVisits', 'formStartVisits', 'convertingVisits', 'conversions', 'pageviews', 'excludedVisits', 'enquiriesTotal'].map((k) => [k, 0]));
    replies = [{ status: 200, body: { range: empty, filters, current: counts, previous: null, visitors: null, daily: [] } }];
    expect((await read.getOverview({})).ok).toBe(true);
    expect(read.isRange({ ...empty, days: '0' })).toBe(false);
  });

  it('skips every call outside production without the data-service env', async () => {
    vi.stubEnv('DATA_SERVICE_URL', '');
    const read = await import('./read');
    expect(await read.getStatus()).toEqual({ ok: false, kind: 'disabled' });
    expect(calls).toEqual([]);
  });

  it('accepts both shapes of the /clicks remainder and rejects other drift (N1)', async () => {
    const read = await import('./read');
    const row = { kind: 'cta', target: 'automation-hero', path: '/automation', area: 'main', clicks: 3, visits: 3, convertingVisits: 0, pageVisits: 10 };
    const specShape = { kind: null, target: '(other)', path: null, area: null, clicks: 4, visits: 4, convertingVisits: 0, pageVisits: null };
    const mainShape = { kind: '(other)', target: null, path: '(other)', area: null, clicks: 4, visits: 4, convertingVisits: 0, pageVisits: null };
    expect(read.isClicks({ range, filters, items: [row, specShape, mainShape] })).toBe(true);
    expect(read.isClicks({ range, filters, items: [{ ...row, clicks: '3' }] })).toBe(false);
    expect(read.isClicks({ range, filters, items: [{ ...row, path: 7 }] })).toBe(false);
    expect([row, specShape, mainShape, { ...row, kind: 'nav', target: '(other)' }].map(read.isClickRemainder)).toEqual([false, true, true, false]);
  });
});
