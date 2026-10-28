import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shouldAttemptMetrics } from '@/metrics.env';
import { queryInstant, queryRange, type PromSample, type PromSeries } from './prometheus';
import { POD_RE, getServiceHealth } from './services';

vi.mock('./prometheus');

const NOW = new Date('2026-10-28T08:45:00Z');
const inventorySample: PromSample = {
  metric: { namespace: 'apps', workload: 'auth-service', kind: 'Deployment' },
  value: 1,
};

const availabilitySeries: PromSeries = {
  metric: { namespace: 'apps', workload: 'auth-service', kind: 'Deployment' },
  points: [{ tMs: Date.parse('2026-10-28T08:00:00Z'), v: 1 }],
};
const restartsSeries: PromSeries = {
  metric: { namespace: 'apps', workload: 'auth-service' },
  points: [{ tMs: Date.parse('2026-10-28T08:00:00Z'), v: 0 }],
};
const usageSample: PromSample = {
  metric: { namespace: 'apps', workload: 'auth-service', container: 'app', basis: 'limit' },
  value: 0.5,
};

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.stubEnv('PROMETHEUS_URL', 'http://prom.test');
  vi.mocked(queryInstant).mockReset();
  vi.mocked(queryRange).mockReset();
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  warn.mockRestore();
});

// Instant calls arrive in the order inventory, cpu, mem.
function mockInstant(results: Array<PromSample[] | Error>) {
  const m = vi.mocked(queryInstant);
  for (const r of results) {
    if (r instanceof Error) m.mockRejectedValueOnce(r);
    else m.mockResolvedValueOnce(r);
  }
}

// Range calls arrive in the order availability, restarts.
function mockRange(results: Array<PromSeries[] | Error>) {
  const m = vi.mocked(queryRange);
  for (const r of results) {
    if (r instanceof Error) m.mockRejectedValueOnce(r);
    else m.mockResolvedValueOnce(r);
  }
}

describe('getServiceHealth', () => {
  it('G1: all five queries rejecting returns null with one warning', async () => {
    mockInstant([new Error('x'), new Error('x'), new Error('x')]);
    vi.mocked(queryRange).mockRejectedValue(new Error('x'));
    expect(await getServiceHealth(NOW)).toBeNull();
    expect(warn.mock.calls).toEqual([
      [
        '[metrics] Prometheus unavailable: all service-health queries failed: inventory (Error: x), ' +
          'availability (Error: x), restarts (Error: x), cpu (Error: x), mem (Error: x)',
      ],
    ]);
  });

  it('G2: a rejected cpu query yields a report with available.cpu false', async () => {
    const timeout = new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    mockInstant([[inventorySample], timeout, [usageSample]]);
    mockRange([[availabilitySeries], [restartsSeries]]);
    const report = await getServiceHealth(NOW);
    expect(report?.available).toEqual({ availability: true, restarts: true, cpu: false, mem: true });
    expect(report?.services).toHaveLength(1);
    expect(warn.mock.calls).toEqual([
      ['[metrics] Prometheus queries failed: cpu (TimeoutError: The operation was aborted due to timeout)'],
    ]);
  });

  it('G3: an empty inventory returns null with a warning', async () => {
    mockInstant([[], [], []]);
    vi.mocked(queryRange).mockResolvedValue([]);
    expect(await getServiceHealth(NOW)).toBeNull();
    expect(warn.mock.calls).toEqual([['[metrics] Prometheus unavailable: no workload series']]);
  });

  it('G3b: a rejected inventory returns null with both warnings', async () => {
    mockInstant([new Error('x'), [], []]);
    vi.mocked(queryRange).mockResolvedValue([]);
    expect(await getServiceHealth(NOW)).toBeNull();
    expect(warn.mock.calls).toEqual([
      ['[metrics] Prometheus queries failed: inventory (Error: x)'],
      ['[metrics] Prometheus unavailable: service inventory query failed'],
    ]);
  });

  it('G5: without PROMETHEUS_URL nothing is queried or logged', async () => {
    vi.stubEnv('PROMETHEUS_URL', '');
    expect(shouldAttemptMetrics()).toBe(false);
    expect(await getServiceHealth(NOW)).toBeNull();
    expect(queryInstant).not.toHaveBeenCalled();
    expect(queryRange).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('G6: both range queries receive the grid range; warnings carry no URL', async () => {
    mockInstant([[inventorySample], new Error('x'), []]);
    vi.mocked(queryRange).mockResolvedValue([]);
    await getServiceHealth(NOW);
    const ranges = vi.mocked(queryRange).mock.calls.map((c) => c[1]);
    expect(ranges).toHaveLength(2);
    const expected = {
      startSec: Date.parse('2026-10-14T23:00:00Z') / 1000,
      endSec: Date.parse('2026-10-28T09:00:00Z') / 1000,
      stepSec: 3600,
    };
    expect(ranges[0]).toEqual(expected);
    expect(ranges[1]).toEqual(expected);
    for (const [msg] of warn.mock.calls) expect(String(msg)).not.toContain('http');
  });

  it('G7: an empty restarts result counts as failed, never as 0 restarts', async () => {
    mockInstant([[inventorySample], [usageSample], [usageSample]]);
    mockRange([[availabilitySeries], []]);
    const report = await getServiceHealth(NOW);
    expect(report?.available).toEqual({ availability: true, restarts: false, cpu: true, mem: true });
    expect(report?.services[0].restarts14d).toBeNull();
    expect(warn.mock.calls).toEqual([['[metrics] Prometheus queries failed: restarts (empty result)']]);
  });

  it('G8: an empty cpu result counts as failed and is listed with rejections in order', async () => {
    mockInstant([[inventorySample], [], [usageSample]]);
    mockRange([new Error('boom'), [restartsSeries]]);
    const report = await getServiceHealth(NOW);
    expect(report?.available).toEqual({ availability: false, restarts: true, cpu: false, mem: true });
    expect(report?.services[0].cpu).toBeNull();
    expect(warn.mock.calls).toEqual([
      ['[metrics] Prometheus queries failed: availability (Error: boom), cpu (empty result)'],
    ]);
  });

  it('G9: rejection reasons carry name and message only, never a URL or cause', async () => {
    const err = new TypeError('Failed to parse URL from http://prom.test/api/v1/query', {
      cause: new Error('secret-cause'),
    });
    mockInstant([[inventorySample], err, [usageSample]]);
    mockRange([[availabilitySeries], [restartsSeries]]);
    await getServiceHealth(NOW);
    expect(warn.mock.calls).toEqual([['[metrics] Prometheus queries failed: cpu (TypeError: Failed to parse URL from <url>)']]);
    for (const [msg] of warn.mock.calls) {
      expect(String(msg)).not.toContain('http');
      expect(String(msg)).not.toContain('secret-cause');
    }
  });

  it('G10: each query reaching Prometheus contains its key tokens', async () => {
    mockInstant([[inventorySample], [usageSample], [usageSample]]);
    mockRange([[availabilitySeries], [restartsSeries]]);
    await getServiceHealth(NOW);
    const [inventory, cpu, mem] = vi.mocked(queryInstant).mock.calls.map((c) => c[0]);
    const [availability, restarts] = vi.mocked(queryRange).mock.calls.map((c) => c[0]);
    expect(inventory).toContain('kube_deployment_spec_replicas');
    expect(inventory).toContain('kube_statefulset_replicas');
    expect(availability).toContain('sum_over_time(kube_deployment_status_replicas_available');
    expect(restarts).toContain('increase(kube_pod_container_status_restarts_total');
    expect(cpu).toContain('topk by (namespace, workload)');
    expect(cpu).toContain('rate(container_cpu_usage_seconds_total');
    expect(cpu).toContain('unit="core"');
    expect(mem).toContain('topk by (namespace, workload)');
    expect(mem).toContain('container_memory_working_set_bytes');
    expect(mem).toContain('unit="byte"');
  });
});

describe('POD_RE', () => {
  const re = new RegExp('^(?:' + POD_RE + ')$');
  it.each([
    ['influxdb2-0', 'influxdb2'],
    ['home-assistant-0', 'home-assistant'],
    ['n8n-5795469b-abcde', 'n8n'],
    ['n8n-5795469b-12345', 'n8n'],
    ['auth-service-7d9f8b6c5-24567', 'auth-service'],
    ['club-mcp-7d9f8c6b5-x2x4z', 'club-mcp'],
    ['mosquitto-exporter-6fd98557dd-5l69q', 'mosquitto-exporter'],
  ])('G4: %s -> %s', (pod, workload) => {
    expect(re.exec(pod)?.[1]).toBe(workload);
  });
});
