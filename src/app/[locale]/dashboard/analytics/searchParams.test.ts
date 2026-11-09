import { describe, expect, it } from 'vitest';
import { hrefFor, needsStatus, parseControls, rangeQuery } from './searchParams';

describe('parseControls', () => {
  it('defaults to 28 days with compare on and no filters', () => {
    expect(parseControls({})).toEqual({ preset: '28d', invalidCustom: false, compare: true });
  });

  it('accepts presets, valid custom ranges, filters, registry paths and click kinds only', () => {
    expect(parseControls({ range: '7d', compare: 'none', entry: 'en', device: 'mobile', page: '/automation', kind: 'cta' })).toEqual({
      preset: '7d', invalidCustom: false, compare: false, entry: 'en', device: 'mobile', page: '/automation', kind: 'cta',
    });
    expect(parseControls({ range: 'custom', from: '2026-01-01', to: '2026-03-31' })).toMatchObject({ preset: 'custom', from: '2026-01-01', to: '2026-03-31' });
  });

  it('drops anything malformed', () => {
    const c = parseControls({ range: '1y', entry: 'fr', device: 'tv', page: '/de/automation', kind: 'hover' });
    expect(c).toEqual({ preset: '28d', invalidCustom: false, compare: true });
    for (const page of ['/imprint', '/dashboard', '<script>', 'javascript:alert(1)', '/automation?x=1']) {
      expect(parseControls({ page }).page, page).toBeUndefined();
    }
  });

  it('rejects invalid custom ranges and says so', () => {
    for (const [from, to] of [['2026-02-30', '2026-03-01'], ['2026-03-01', '2026-02-01'], ['2025-01-01', '2026-01-03'], ['x', 'y']]) {
      expect(parseControls({ range: 'custom', from, to }), `${from}..${to}`).toMatchObject({ preset: '28d', invalidCustom: true });
    }
    expect(parseControls({ range: 'custom', from: '2025-01-01', to: '2026-01-01' }).preset).toBe('custom'); // 366 days
  });
});

describe('rangeQuery', () => {
  it('uses the API default for 28d, presets end at lastCompleteDay', () => {
    expect(rangeQuery(parseControls({}), '2026-11-07')).toEqual({});
    expect(rangeQuery(parseControls({ range: '7d' }), '2026-11-07')).toEqual({ from: '2026-11-01', to: '2026-11-07' });
    expect(rangeQuery(parseControls({ range: '90d' }), '2026-11-07')).toEqual({ from: '2026-08-10', to: '2026-11-07' });
    expect(rangeQuery(parseControls({ range: '12m' }), '2026-11-07')).toEqual({ from: '2025-11-08', to: '2026-11-07' });
    expect(rangeQuery(parseControls({ range: 'custom', from: '2026-10-01', to: '2026-10-31' }), null)).toEqual({ from: '2026-10-01', to: '2026-10-31' });
  });
  it('falls back to the API default without lastCompleteDay (status unavailable, M2)', () => {
    expect(rangeQuery(parseControls({ range: '7d' }), null)).toEqual({});
    expect(needsStatus(parseControls({ range: '7d' }))).toBe(true);
    expect(needsStatus(parseControls({}))).toBe(false);
    expect(needsStatus(parseControls({ range: 'custom', from: '2026-10-01', to: '2026-10-31' }))).toBe(false);
  });
});

describe('hrefFor', () => {
  it('builds links from validated state only', () => {
    const c = parseControls({ range: '7d', entry: 'de', page: '/contact' });
    expect(hrefFor(c)).toBe('/dashboard/analytics?range=7d&entry=de&page=%2Fcontact');
    expect(hrefFor(c, { page: undefined, kind: 'outbound' }, 'clicks')).toBe('/dashboard/analytics?range=7d&entry=de&kind=outbound#clicks');
    expect(hrefFor(c, { page: '/not-a-page' })).toBe('/dashboard/analytics?range=7d&entry=de');
  });
});
