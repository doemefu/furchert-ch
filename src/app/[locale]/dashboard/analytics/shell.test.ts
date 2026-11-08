// AnalyticsShell fetch order (review L1, M2, Q2).
import { beforeEach, describe, expect, it, vi } from 'vitest';

const log: string[] = [];
const ok = (data: unknown) => ({ ok: true, data });
const range = { from: '2026-11-01', to: '2026-11-07', days: 7, lastCompleteDay: '2026-11-07', previous: null };
let statusResult: unknown = ok({ collectors: [], lastCompleteDay: '2026-11-07', provisionalDay: null, rawRetentionStart: null, definitionVersion: 1, ingest: { lastEventAt: null, eventsToday: 0, dailyCap: null, capped: null } });
const read = {
  getStatus: vi.fn(async () => {
    log.push('status');
    await Promise.resolve();
    log.push('status done');
    return statusResult;
  }),
  getOverview: vi.fn(async (q: unknown) => (log.push(`overview ${JSON.stringify(q)}`), { ok: false, kind: 'unreachable' })),
  getPages: vi.fn(async () => ({ ok: false, kind: 'unreachable' })),
  getClicks: vi.fn(async () => ({ ok: false, kind: 'unreachable' })),
  getSources: vi.fn(async () => ({ ok: false, kind: 'unreachable' })),
  getPageDetail: vi.fn(async () => ({ ok: true, data: { range, filters: { applied: {}, ignored: [] }, summary: null, previous: null, next: null, clicks: [], sections: null, faqOpens: null, daily: [] } })),
};
vi.mock('@/lib/analytics/read', () => read);
vi.mock('next-intl/server', () => ({ getTranslations: vi.fn(async () => (k: string) => k) }));
vi.mock('@/components/analytics/lazySwitch', () => ({ LazyNeverTrackSwitch: () => null }));

const { AnalyticsShell } = await import('./AnalyticsShell');
const { parseControls } = await import('./searchParams');

beforeEach(() => {
  log.length = 0;
  vi.clearAllMocks();
});

describe('AnalyticsShell', () => {
  it('7d waits for /status and asks for the 7 days ending at lastCompleteDay', async () => {
    await AnalyticsShell({ locale: 'en', controls: parseControls({ range: '7d', entry: 'de' }) });
    expect(log[0]).toBe('status');
    expect(log[1]).toBe('status done');
    expect(read.getOverview).toHaveBeenCalledWith({ from: '2026-11-01', to: '2026-11-07', compare: 'previous', locale: 'de', device: undefined });
    expect(read.getPageDetail).not.toHaveBeenCalled();
  });

  it('the 28-day default fetches /status and the sections in parallel on the API default', async () => {
    await AnalyticsShell({ locale: 'en', controls: parseControls({ compare: 'none', page: '/automation' }) });
    expect(log.indexOf('overview {"compare":"none"}')).toBeLessThan(log.indexOf('status done'));
    expect(read.getPageDetail).toHaveBeenCalledWith({ compare: 'none', locale: undefined, device: undefined }, '/automation');
  });

  it('falls back to the API default when /status fails (M2)', async () => {
    statusResult = { ok: false, kind: 'unreachable' };
    await AnalyticsShell({ locale: 'en', controls: parseControls({ range: '90d' }) });
    expect(read.getOverview).toHaveBeenCalledWith({ compare: 'previous', locale: undefined, device: undefined });
  });
});
