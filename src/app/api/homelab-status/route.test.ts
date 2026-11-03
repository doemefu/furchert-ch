import { beforeEach, describe, expect, it, vi } from 'vitest';

const getLabStatus = vi.fn();
vi.mock('@/lib/metrics/labStatus', async () => {
  const actual = await vi.importActual<typeof import('@/lib/metrics/labStatus')>('@/lib/metrics/labStatus');
  return { ...actual, getLabStatus: () => getLabStatus() };
});

import { GET, dynamic } from './route';
import { LAB_SERVICE_IDS } from '@/data/homelab-lab';

beforeEach(() => {
  getLabStatus.mockReset();
});

describe('GET /api/homelab-status', () => {
  it('is dynamic and answers with the provider result and an explicit cache header', async () => {
    const body = { checkedAt: '2026-11-03T12:00:00.000Z', windowDays: 14, services: [{ id: 'website', status: 'up', uptime: 100 }] };
    getLabStatus.mockResolvedValue(body);
    const res = await GET();
    expect(dynamic).toBe('force-dynamic');
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('public, max-age=30');
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
    expect(await res.json()).toEqual(body);
  });

  it('never throws and never shows an error: a failing provider reads as all unknown', async () => {
    getLabStatus.mockImplementation(() => Promise.reject(new Error('secret http://internal:9090')));
    const res = await GET();
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain('secret');
    expect(text).not.toContain('internal');
    const json = JSON.parse(text) as { services: Array<{ id: string; status: string }> };
    expect(json.services.map((s) => s.id)).toEqual([...LAB_SERVICE_IDS]);
    expect(json.services.every((s) => s.status === 'unknown')).toBe(true);
  });
});
