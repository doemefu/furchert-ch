import { describe, expect, it } from 'vitest';
import { LAB_SERVICE_IDS } from '@/data/homelab-lab';
import { countLab, parseLabStatus, summarize } from './parseStatus';

const good = (status: string, uptime: unknown = 99.9) => ({
  services: LAB_SERVICE_IDS.map((id) => ({ id, status, uptime })),
});

describe('parseLabStatus', () => {
  it('reads a well-formed response', () => {
    const rows = parseLabStatus(good('up'));
    expect(rows.size).toBe(LAB_SERVICE_IDS.length);
    expect(rows.get('website')).toEqual({ status: 'up', uptime: 99.9 });
  });

  it('ignores unknown ids and non-objects', () => {
    const rows = parseLabStatus({ services: [{ id: 'secret', status: 'up' }, 7, null, { id: 'iot', status: 'down' }] });
    expect([...rows.keys()]).toEqual(['iot']);
    expect(rows.get('iot')).toEqual({ status: 'down', uptime: null });
  });

  it('turns bad statuses and out-of-range uptime into unknown / null', () => {
    const rows = parseLabStatus({ services: [{ id: 'iot', status: 'on fire', uptime: 150 }, { id: 'website', status: 'up', uptime: '99' }] });
    expect(rows.get('iot')).toEqual({ status: 'unknown', uptime: null });
    expect(rows.get('website')).toEqual({ status: 'up', uptime: null });
  });

  it('returns nothing for malformed input', () => {
    for (const bad of [null, undefined, 'x', 3, {}, { services: 'no' }]) {
      expect(parseLabStatus(bad).size).toBe(0);
    }
  });
});

describe('summarize', () => {
  it('reports all up only when every service is up', () => {
    expect(summarize(parseLabStatus(good('up')))).toBe('allUp');
  });
  it('reports a down service first', () => {
    const rows = parseLabStatus(good('up'));
    rows.set('iot', { status: 'down', uptime: null });
    expect(summarize(rows)).toBe('someDown');
  });
  it('is partial when some services are up and the rest are unknown', () => {
    const rows = parseLabStatus(good('up'));
    rows.set('assistant', { status: 'unknown', uptime: null });
    expect(summarize(rows)).toBe('partial');
  });
  it('is unknown without data or with unknown services', () => {
    expect(summarize(new Map())).toBe('unknown');
    expect(summarize(parseLabStatus(good('unknown')))).toBe('unknown');
  });
});

describe('countLab', () => {
  const total = LAB_SERVICE_IDS.length;

  it('counts all up', () => {
    expect(countLab(parseLabStatus(good('up')))).toEqual({ summary: 'allUp', up: total, down: 0, total });
  });

  it('counts one down', () => {
    const rows = parseLabStatus(good('up'));
    rows.set(LAB_SERVICE_IDS[0], { status: 'down', uptime: null });
    expect(countLab(rows)).toEqual({ summary: 'someDown', up: total - 1, down: 1, total });
  });

  it('counts up plus unknown as partial', () => {
    const rows = parseLabStatus({ services: [{ id: LAB_SERVICE_IDS[0], status: 'up' }] });
    expect(countLab(rows)).toEqual({ summary: 'partial', up: 1, down: 0, total });
  });

  it('treats an empty map as unknown with the full total', () => {
    expect(countLab(new Map())).toEqual({ summary: 'unknown', up: 0, down: 0, total: 6 });
  });
});
