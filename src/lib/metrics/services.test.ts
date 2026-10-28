import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shouldAttemptMetrics } from '@/metrics.env';
import { queryInstant, queryRange, type PromSample } from './prometheus';
import { POD_RE, getServiceHealth } from './services';

vi.mock('./prometheus');

const NOW = new Date('2026-10-28T08:45:00Z');
const inventorySample: PromSample = {
  metric: { namespace: 'apps', workload: 'auth-service', kind: 'Deployment' },
  value: 1,
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

describe('getServiceHealth', () => {
  it('G1: all five queries rejecting returns null with one warning', async () => {
    mockInstant([new Error('x'), new Error('x'), new Error('x')]);
    vi.mocked(queryRange).mockRejectedValue(new Error('x'));
    expect(await getServiceHealth(NOW)).toBeNull();
    expect(warn.mock.calls).toEqual([['[metrics] Prometheus unavailable: all service-health queries failed']]);
  });

  it('G2: a rejected cpu query yields a report with available.cpu false', async () => {
    mockInstant([[inventorySample], new Error('x'), []]);
    vi.mocked(queryRange).mockResolvedValue([]);
    const report = await getServiceHealth(NOW);
    expect(report?.available).toEqual({ availability: true, restarts: true, cpu: false, mem: true });
    expect(report?.services).toHaveLength(1);
    expect(warn.mock.calls).toEqual([['[metrics] Prometheus queries failed: cpu']]);
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
      ['[metrics] Prometheus queries failed: inventory'],
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
