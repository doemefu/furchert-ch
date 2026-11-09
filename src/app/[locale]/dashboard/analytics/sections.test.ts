// Render tests for the /dashboard/analytics sections (spec 100 §9, C16;
// reviews M1, M3, M4, L2, L3). Rendered with react-dom/server in node.
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { OverviewResponse, PagesResponse, Range, StatusResponse } from '@/lib/analytics/read';
import { parseControls } from './searchParams';
import { ClicksSection, HeaderLine, OfferGlance, PagesSection, SourcesSection, StatusStrip, emptyText, type Ctx } from './sections';
import { makeFormatters, type Translate } from './ui';

const t: Translate = (key, values) => (values ? `${key}${JSON.stringify(values)}` : key);
const fmt = makeFormatters('en');
const ctx = (sp: Record<string, string> = {}): Ctx => ({ t, fmt, c: parseControls(sp), locale: 'en' });
const html = <P extends object>(C: ComponentType<P>, props: P) => renderToStaticMarkup(createElement(C, props));
const hrefs = (s: string) => [...s.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);

const range: Range = { from: '2026-10-11', to: '2026-11-07', days: 28, lastCompleteDay: '2026-11-07', previous: { from: '2026-09-13', to: '2026-10-10' } };
const filters = { applied: {}, ignored: [] as string[] };
const XSS = '<img src=x onerror=alert(1)>';
const JS = 'javascript:alert(1)';
const counts = (o: Partial<OverviewResponse['current']> = {}) => ({
  visits: 160, newVisits: 90, returningVisits: 70, engagedVisits: 100, offerVisits: 80, engagedOfferVisits: 55, contactIntentVisits: 20,
  formStartVisits: 6, convertingVisits: 3, conversions: 3, pageviews: 402, excludedVisits: 0, enquiriesTotal: 5, ...o,
});
const pageItem = (path: string, pageviews = 10) => ({
  path, pageviews, pageviewsByLocale: { de: pageviews, en: 0 }, visitsViewed: pageviews, entries: 5, exits: 4, landingEngagedVisits: 3,
  landingConvertingVisits: 1, engagementSamples: 12, engagedMsSum: 1, engagedHistogram: [1, 1, 2, 2, 2, 2, 1, 1], scrollSamples: 12,
  scrollReached: { p25: 9, p50: 7, p75: 5, p90: 3, p100: 2 },
});

describe('C16: stored values render as text, never as markup or links', () => {
  it('pages: XSS paths are escaped; only registry paths get a link, built from the registry (M1)', () => {
    const data: PagesResponse = { range, filters, items: [pageItem('/automation'), pageItem(XSS), pageItem(JS), pageItem('/x-unknown'), pageItem('(other)', 4)] };
    const out = html(PagesSection, { result: { ok: true, data }, ctx: ctx() });
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;img src=x onerror=alert(1)&gt;');
    // Table and phone cards (WA-4b carry-over) render the same rows, so the one registry link appears twice.
    expect(hrefs(out)).toEqual(['/en/dashboard/analytics?page=%2Fautomation#wa-detail', '/en/dashboard/analytics?page=%2Fautomation#wa-detail']);
    expect(out).toContain('class="wa-pages-table"');
    expect(out).toContain('class="wa-pages-cards"');
    expect(out).toContain('other{&quot;n&quot;:&quot;4&quot;}');
  });

  it('clicks, sources: targets, referrers and campaigns are text; mailto/tel show "—"', () => {
    const clicks = html(ClicksSection, {
      result: { ok: true, data: { range, filters, items: [
        { kind: 'outbound', target: JS, path: XSS, area: 'main', clicks: 9, visits: 5, convertingVisits: 0, pageVisits: 20 },
        { kind: 'mailto', target: null, path: '/contact', area: 'footer', clicks: 4, visits: 4, convertingVisits: 1, pageVisits: null },
      ] } },
      ctx: ctx(),
    });
    expect(clicks).not.toContain('<img');
    expect(clicks).toContain('—');
    expect(hrefs(clicks).every((h) => h.startsWith('/en/dashboard/analytics'))).toBe(true);
    const sources = html(SourcesSection, {
      result: { ok: true, data: { range, filters,
        channels: [{ channel: 'search', visits: 12, newVisits: 1, engagedVisits: 1, offerVisits: 1, convertingVisits: 1 }],
        referrers: [{ domain: XSS, channel: 'referral', visits: 8, convertingVisits: 0 }],
        campaigns: [{ source: '<script>x</script>', medium: JS, campaign: null, visits: 5, convertingVisits: 0 }],
        converters: { byLandingChannel: [], byFirstChannel: [{ channel: null, convertingVisits: 1, conversions: 1 }], byEntryPath: [] } } },
      ctx: ctx(),
    });
    expect(sources).not.toMatch(/<img|<script/);
    expect(hrefs(sources)).toEqual([]);
    expect(sources).toContain('sources.unknown');
  });
});

describe('#168 review fixes', () => {
  const base = { area: 'main', clicks: 5, visits: 5, convertingVisits: 0, pageVisits: 20 };
  it('N2: a nav click to "(other)" keeps its row; both remainder shapes fold into "other (n)"', () => {
    const out = html(ClicksSection, {
      result: { ok: true, data: { range, filters, items: [
        { ...base, kind: 'nav', target: '(other)', path: '/', area: 'header' },
        { ...base, kind: 'cta', target: 'automation-hero', path: '/automation' },
        { kind: null, target: '(other)', path: null, area: null, clicks: 4, visits: 4, convertingVisits: 0, pageVisits: null },
        { kind: '(other)', target: null, path: '(other)', area: null, clicks: 3, visits: 3, convertingVisits: 0, pageVisits: null },
      ] } },
      ctx: ctx(),
    });
    expect(out).toContain('clicks.nav</td><td');
    expect(out).toContain('other{&quot;n&quot;:&quot;7&quot;}');
    expect(out).not.toContain('clicks.null');
  });
  it('N4: static notes and failures are no live regions', () => {
    const out = html(PagesSection, { result: { ok: false, kind: 'unreachable' }, ctx: ctx() });
    expect(out).not.toContain('role="status"');
  });
});

describe('offer at a glance (M4)', () => {
  const overview = (o: Partial<OverviewResponse> = {}): OverviewResponse => ({
    range, filters, current: counts(), previous: counts({ visits: 100 }), visitors: { current: { value: 120, basis: '28d' }, previous: { value: 98, basis: '28d' } },
    daily: [{ day: '2026-11-07', visits: 5, offerVisits: 3, engagedVisits: 3, contactIntentVisits: 1, convertingVisits: 0, pageviews: 14, enquiries: 0 }], ...o,
  });
  it('shows submits as two counts, never as a percentage', () => {
    const out = html(OfferGlance, { result: { ok: true, data: overview() }, ctx: ctx() });
    expect(out).toContain('glance.submitsValue{&quot;x&quot;:&quot;3&quot;,&quot;n&quot;:&quot;5&quot;}');
    expect(out).not.toMatch(/submitsValue[^<]*%/);
  });
  it('guards x > n and labels the total as unfiltered when filters are active', () => {
    const out = html(OfferGlance, { result: { ok: true, data: overview({ current: counts({ conversions: 9, enquiriesTotal: 5 }), filters: { applied: { locale: 'de' }, ignored: [] } }) }, ctx: ctx({ entry: 'de' }) });
    expect(out).toContain('glance.submitsValue{&quot;x&quot;:&quot;5&quot;,&quot;n&quot;:&quot;5&quot;}');
    expect(out).toContain('glance.unfiltered');
  });
  it('explains a missing visitors figure; the engaged rate follows §8.6', () => {
    const out = html(OfferGlance, { result: { ok: true, data: overview({ visitors: null, current: counts({ offerVisits: 20, engagedOfferVisits: 7 }) }) }, ctx: ctx() });
    expect(out).toContain('glance.visitorsNone');
    expect(out).toContain('fraction{&quot;x&quot;:&quot;7&quot;,&quot;n&quot;:&quot;20&quot;}');
    expect(out).toContain('role="img"');
  });
  it('shows a visits delta only when the §8.6 rule passes', () => {
    const out = html(OfferGlance, { result: { ok: true, data: overview() }, ctx: ctx() });
    expect(out).toContain('glance.change{&quot;diff&quot;:&quot;+60&quot;}');
  });
});

describe('states (L2, L3)', () => {
  it('two empty texts: no final day yet vs no data in this range', () => {
    expect(emptyText({ ...range, from: null, to: null, days: 0, lastCompleteDay: null, previous: null }, t, fmt)).toBe('noFinalDay');
    expect(emptyText({ ...range, from: null, to: null, days: 0, previous: null }, t, fmt)).toBe('noDataInRange{"day":"7 Nov 2026"}');
    expect(emptyText(range, t, fmt)).toBeNull();
  });
  it('"Data through" is the echoed lastCompleteDay; the provisional day appears only as a note in the strip', () => {
    // data-service decides final vs provisional (07:30 Zurich); the UI shows its echo only.
    const status: StatusResponse = {
      collectors: [{ name: 'webanalytics-rollup', enabled: false, lastSuccessAt: null, lastWindowEnd: null, consecutiveFailures: 0, lastErrorCode: null, stale: false }],
      lastCompleteDay: '2026-11-06', provisionalDay: '2026-11-07', rawRetentionStart: null, definitionVersion: 1,
      ingest: { lastEventAt: null, eventsToday: 3, dailyCap: null, capped: null },
    };
    const head = html(HeaderLine, { overview: { ok: true, data: { range: { ...range, lastCompleteDay: '2026-11-06', to: '2026-11-06' }, filters, current: counts(), previous: null, visitors: null, daily: [] } }, statusDefaulted: true, ctx: ctx() });
    expect(head).toContain('dataThrough{&quot;day&quot;:&quot;6 Nov 2026&quot;}');
    expect(head).not.toContain('7 Nov 2026');
    expect(head).toContain('statusDefaulted');
    const strip = html(StatusStrip, { result: { ok: true, data: status }, ctx: ctx() });
    expect(strip).toContain('status.disabled');
    expect(strip).toContain('status.provisional{&quot;day&quot;:&quot;7 Nov 2026&quot;}');
    expect(strip).toContain('status.eventsToday');
  });
  it('failures and ignored filters are shown', () => {
    expect(html(PagesSection, { result: { ok: false, kind: 'problem', status: 400, code: 'invalid_window' }, ctx: ctx() })).toContain('problem{&quot;status&quot;:400,&quot;code&quot;:&quot;invalid_window&quot;}');
    expect(html(PagesSection, { result: { ok: true, data: { range, filters: { applied: {}, ignored: ['device'] }, items: [pageItem('/automation')] } }, ctx: ctx() })).toContain('ignored{&quot;filters&quot;:&quot;device&quot;}');
  });
});
