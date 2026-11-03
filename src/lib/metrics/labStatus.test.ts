import { describe, expect, it, vi } from 'vitest';
import type { PromSample } from './prometheus';
import {
  AVAILABLE_QUERY,
  COVERAGE_QUERY,
  EXPECTED_SAMPLES,
  LAB_WORKLOADS,
  SPEC_QUERY,
  UPTIME_QUERY,
  buildStatusRows,
  buildUptimeRows,
  createCache,
  createLabStatusProvider,
} from './labStatus';
import { LAB_SERVICE_IDS } from '@/data/homelab-lab';

const sample = (namespace: string, deployment: string, value: number, extra = {}): PromSample => ({
  metric: { namespace, deployment, ...extra },
  value,
});
const W = Object.fromEntries(LAB_WORKLOADS.map((w) => [w.id, w]));

describe('queries', () => {
  it('aggregate away scrape-target labels, so a kube-state-metrics restart never splits a series', () => {
    for (const q of [AVAILABLE_QUERY, SPEC_QUERY, UPTIME_QUERY, COVERAGE_QUERY]) {
      expect(q).toContain('max by (namespace, deployment)');
      expect(q).not.toMatch(/\b(pod|instance)\b/);
    }
  });

  it('only ever select the allowlisted workloads (constants, no input)', () => {
    for (const w of LAB_WORKLOADS) {
      expect(AVAILABLE_QUERY).toContain(w.deployment);
    }
    expect(AVAILABLE_QUERY).toMatch(/namespace=~"[a-z0-9|-]+"/);
    expect(UPTIME_QUERY).toContain('[14d:5m]');
    expect(COVERAGE_QUERY).toContain('count_over_time');
    expect(EXPECTED_SAMPLES).toBe(4032);
  });

  it('count a workload scaled to zero as no data, not as downtime', () => {
    expect(UPTIME_QUERY).toMatch(/and on \(namespace, deployment\)/);
    expect(UPTIME_QUERY).toMatch(/kube_deployment_spec_replicas[^)]*\) > 0/);
  });

  it('lists only public services', () => {
    expect(LAB_WORKLOADS.map((w) => w.id)).toEqual([...LAB_SERVICE_IDS]);
    expect(LAB_WORKLOADS.map((w) => w.deployment)).not.toContain('data-service');
    expect(LAB_WORKLOADS.map((w) => w.namespace)).not.toContain('flux-system');
  });
});

describe('buildStatusRows', () => {
  it('maps ready workloads to up, missing replicas to down', () => {
    const rows = buildStatusRows(
      [sample(W.website.namespace, W.website.deployment, 1), sample(W.iot.namespace, W.iot.deployment, 0)],
      [sample(W.website.namespace, W.website.deployment, 1), sample(W.iot.namespace, W.iot.deployment, 1)],
    );
    expect(rows.get('website')).toBe('up');
    expect(rows.get('iot')).toBe('down');
  });

  it('is unknown for scaled-to-zero, missing and non-finite values', () => {
    const rows = buildStatusRows(
      [sample(W.identity.namespace, W.identity.deployment, 0), sample(W.assistant.namespace, W.assistant.deployment, NaN)],
      [sample(W.identity.namespace, W.identity.deployment, 0), sample(W.assistant.namespace, W.assistant.deployment, 1)],
    );
    expect(rows.get('identity')).toBe('unknown');
    expect(rows.get('assistant')).toBe('unknown');
    expect(rows.get('monitoring')).toBe('unknown');
  });

  it('matches namespace and deployment exactly and ignores everything else', () => {
    const rows = buildStatusRows(
      [
        sample('other', W.website.deployment, 1),
        sample(W.website.namespace, `${W.website.deployment}-x`, 1),
        sample(W.website.namespace, 'something-else', 1),
      ],
      [sample('other', W.website.deployment, 1), sample(W.website.namespace, 'something-else', 1)],
    );
    expect(rows.get('website')).toBe('unknown');
    expect(rows.size).toBe(LAB_SERVICE_IDS.length);
  });

  it('copes with duplicate series by taking the best value', () => {
    const rows = buildStatusRows(
      [sample(W.iot.namespace, W.iot.deployment, 0), sample(W.iot.namespace, W.iot.deployment, 1, { pod: 'x' })],
      [sample(W.iot.namespace, W.iot.deployment, 1)],
    );
    expect(rows.get('iot')).toBe('up');
  });
});

describe('buildUptimeRows', () => {
  const full = EXPECTED_SAMPLES;
  it('floors to one decimal and reports 100 only for a perfect window', () => {
    const rows = buildUptimeRows(
      [sample(W.website.namespace, W.website.deployment, 0.99997), sample(W.iot.namespace, W.iot.deployment, 1)],
      [sample(W.website.namespace, W.website.deployment, full), sample(W.iot.namespace, W.iot.deployment, full)],
    );
    expect(rows.get('website')).toBe(99.9);
    expect(rows.get('iot')).toBe(100);
  });

  it('is null without enough coverage, without a count or with a bad value', () => {
    const rows = buildUptimeRows(
      [
        sample(W.website.namespace, W.website.deployment, 1),
        sample(W.iot.namespace, W.iot.deployment, 1),
        sample(W.identity.namespace, W.identity.deployment, NaN),
      ],
      [
        sample(W.website.namespace, W.website.deployment, full * 0.5),
        sample(W.identity.namespace, W.identity.deployment, full),
      ],
    );
    expect(rows.get('website')).toBeNull();
    expect(rows.get('iot')).toBeNull();
    expect(rows.get('identity')).toBeNull();
    expect(rows.get('monitoring')).toBeNull();
  });

  it('clamps out-of-range ratios', () => {
    const rows = buildUptimeRows(
      [sample(W.website.namespace, W.website.deployment, 1.2)],
      [sample(W.website.namespace, W.website.deployment, full)],
    );
    expect(rows.get('website')).toBe(100);
  });
});

describe('createCache', () => {
  function setup(load: () => Promise<string>) {
    let t = 1_000_000;
    const onError = vi.fn();
    const cache = createCache<string>({
      ttlMs: 60_000,
      retryMs: 15_000,
      maxStaleMs: 300_000,
      load,
      now: () => t,
      onError,
    });
    return { cache, advance: (ms: number) => (t += ms), onError };
  }

  it('serves from cache within the TTL and shares one in-flight load', async () => {
    const load = vi.fn().mockResolvedValue('a');
    const { cache, advance } = setup(load);
    const [x, y] = await Promise.all([cache.get(), cache.get()]);
    expect([x, y]).toEqual(['a', 'a']);
    advance(59_000);
    expect(await cache.get()).toBe('a');
    expect(load).toHaveBeenCalledTimes(1);
    advance(2_000);
    await cache.get();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('serves the last good value for up to maxStale on failure, then null', async () => {
    const load = vi.fn().mockResolvedValueOnce('a').mockRejectedValue(new Error('boom'));
    const { cache, advance, onError } = setup(load);
    expect(await cache.get()).toBe('a');
    advance(61_000);
    expect(await cache.get()).toBe('a');
    expect(onError).toHaveBeenCalledTimes(1);
    advance(20_000);
    expect(await cache.get()).toBe('a');
    advance(250_000);
    expect(await cache.get()).toBeNull();
  });

  it('does not hammer a failing source: retries no sooner than retryMs', async () => {
    const load = vi.fn().mockRejectedValue(new Error('down'));
    const { cache, advance } = setup(load);
    expect(await cache.get()).toBeNull();
    expect(await cache.get()).toBeNull();
    advance(10_000);
    expect(await cache.get()).toBeNull();
    expect(load).toHaveBeenCalledTimes(1);
    advance(6_000);
    await cache.get();
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe('createLabStatusProvider', () => {
  const okQuery = (promql: string): Promise<PromSample[]> => {
    const all = LAB_WORKLOADS.map((w) => sample(w.namespace, w.deployment, 1));
    if (promql === UPTIME_QUERY) return Promise.resolve(LAB_WORKLOADS.map((w) => sample(w.namespace, w.deployment, 0.999)));
    if (promql === COVERAGE_QUERY) return Promise.resolve(LAB_WORKLOADS.map((w) => sample(w.namespace, w.deployment, EXPECTED_SAMPLES)));
    return Promise.resolve(all);
  };
  const base = { now: () => Date.UTC(2026, 10, 3, 12, 0, 42), metricsEnabled: () => true, showUptime: true, log: vi.fn() };

  it('returns only the allowlisted shape', async () => {
    const p = createLabStatusProvider({ ...base, query: vi.fn(okQuery) });
    const res = await p.get();
    expect(res.windowDays).toBe(14);
    expect(res.checkedAt).toBe('2026-11-03T12:00:00.000Z');
    expect(res.services.map((s) => s.id)).toEqual([...LAB_SERVICE_IDS]);
    for (const s of res.services) {
      expect(Object.keys(s).sort()).toEqual(['id', 'status', 'uptime']);
      expect(s.status).toBe('up');
      expect(s.uptime).toBe(99.9);
    }
    const json = JSON.stringify(res);
    // Workload names never leave the server (the public id "monitoring" is not a namespace leak).
    for (const w of LAB_WORKLOADS) expect(json).not.toContain(w.deployment);
    expect(json).not.toMatch(/namespace|deployment|kube|apps/);
  });

  it('answers all unknown, without any query, when metrics are disabled', async () => {
    const query = vi.fn(okQuery);
    const res = await createLabStatusProvider({ ...base, metricsEnabled: () => false, query }).get();
    expect(query).not.toHaveBeenCalled();
    expect(res.services.every((s) => s.status === 'unknown' && s.uptime === null)).toBe(true);
  });

  it('answers unknown, never an error, when Prometheus fails or returns nothing', async () => {
    const log = vi.fn();
    const failing = createLabStatusProvider({ ...base, log, query: () => Promise.reject(new Error('fetch failed http://prometheus.internal:9090/x')) });
    const res = await failing.get();
    expect(res.services.every((s) => s.status === 'unknown' && s.uptime === null)).toBe(true);
    const logged = log.mock.calls.map((c) => String(c[0])).join(' ');
    expect(logged).not.toMatch(/https?:\/\//);
    expect(logged).not.toContain('prometheus.internal');
    const empty = createLabStatusProvider({ ...base, query: () => Promise.resolve([]) });
    expect((await empty.get()).services.every((s) => s.status === 'unknown')).toBe(true);
  });

  it('keeps the status when only the uptime query fails (partial result)', async () => {
    const query = vi.fn((q: string) => (q === UPTIME_QUERY || q === COVERAGE_QUERY ? Promise.reject(new Error('timeout')) : okQuery(q)));
    const res = await createLabStatusProvider({ ...base, query }).get();
    expect(res.services.every((s) => s.status === 'up' && s.uptime === null)).toBe(true);
  });

  it('neither queries nor returns uptime when it is switched off', async () => {
    const query = vi.fn(okQuery);
    const res = await createLabStatusProvider({ ...base, showUptime: false, query }).get();
    expect(query.mock.calls.map((c) => c[0])).not.toContain(UPTIME_QUERY);
    for (const s of res.services) expect(Object.keys(s).sort()).toEqual(['id', 'status']);
  });
});
