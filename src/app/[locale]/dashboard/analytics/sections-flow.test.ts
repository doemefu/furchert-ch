// Render tests for the WA-4b sections (spec 100 rev 3.5 §8.2, §8.3, §8.6;
// review H1–H3, M1–M4, L3, L4, L6, L8, L9). Rendered with react-dom/server.
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type {
  AnalyticsResult,
  AudienceResponse,
  CoverageResponse,
  FunnelsResponse,
  OverviewResponse,
  PageDetailResponse,
  PathsResponse,
  Range,
  ValueCount,
} from '@/lib/analytics/read';
import { parseControls } from './searchParams';
import { AudienceSection, CoverageSection, FunnelsSection, PageFlow, PathsSection, resolveDefinition, type Definition } from './sections-flow';
import { makeFormatters, type Translate } from './ui';
import type { Ctx } from './sections';

const t: Translate = (key, values) => (values ? `${key}${JSON.stringify(values)}` : key);
const fmt = makeFormatters('en');
const ctx = (sp: Record<string, string> = {}): Ctx => ({ t, fmt, c: parseControls(sp), locale: 'en' });
const html = <P extends object>(C: ComponentType<P>, props: P) => renderToStaticMarkup(createElement(C, props));
const ok = <T,>(data: T): AnalyticsResult<T> => ({ ok: true, data });
const q = (s: string) => s.replaceAll('"', '&quot;');

const range: Range = { from: '2026-10-11', to: '2026-11-07', days: 28, lastCompleteDay: '2026-11-07', previous: { from: '2026-09-13', to: '2026-10-10' } };
const filters = { applied: {}, ignored: [] as string[] };
const XSS = '<img src=x onerror=alert(1)>';
const full: Definition = { kind: 'full', day: '2026-09-01' };
const noMarkup = (out: string) => {
  expect(out).not.toContain('<img');
  expect(out).not.toContain('<script');
  expect(out).not.toMatch(/href=/);
};

const funnelsData = (o: Partial<FunnelsResponse> = {}): FunnelsResponse => ({
  range,
  filters,
  definitionVersion: 2,
  definitionFrom: '2026-09-01',
  funnels: [
    {
      id: 'offer',
      steps: [
        { index: 1, key: 'visit', visits: 400 },
        { index: 2, key: 'offer_visit', visits: 120 },
        { index: 3, key: 'reached_prices', visits: 60 },
        { index: 4, key: 'contact_intent', visits: 12 },
        { index: 5, key: 'form_start', visits: 4 },
        { index: 6, key: 'contact_submit', visits: 2 },
      ],
      previous: [
        { index: 1, key: 'visit', visits: 380 },
        { index: 2, key: 'offer_visit', visits: 100 },
        { index: 3, key: 'reached_prices', visits: 40 },
        { index: 4, key: 'contact_intent', visits: 10 },
        { index: 5, key: 'form_start', visits: 3 },
        { index: 6, key: 'contact_submit', visits: 1 },
      ],
    },
    { id: 'contact_form', steps: [{ index: 1, key: 'contact_pageview', visits: 30 }, { index: 2, key: 'form_start', visits: 4 }, { index: 3, key: 'contact_submit', visits: 2 }], previous: null },
  ],
  ...o,
});

const pathsData = (o: Partial<PathsResponse> = {}): PathsResponse => ({
  range,
  filters,
  definitionFrom: '2026-09-01',
  groupPaths: [
    { path: 'home > offer > contact > (exit)', visits: 14, convertingVisits: 2 },
    { path: 'home > (exit)', visits: 40, convertingVisits: 0 },
    { path: XSS, visits: 5, convertingVisits: 4 },
    { path: 'proof > (exit)', visits: 2, convertingVisits: 0 },
    { path: '(other)', visits: 3, convertingVisits: 0 },
  ],
  entryExit: [
    { entry: '/automation', exit: '(exit)', visits: 9 },
    { entry: XSS, exit: '/contact', visits: 4 },
    { entry: '/it', exit: '/about', visits: 1 },
    { entry: '(other)', exit: '(other)', visits: 2 },
  ],
  seenBeforeContacting: { intentVisits: 20, items: [{ seen: 'about', visits: 8 }, { seen: 'projects', visits: 2 }, { seen: 'prices', visits: 11 }, { seen: XSS, visits: 3 }] },
  transitions: [
    { fromPath: '(entrance)', toPath: '/automation', count: 30 },
    { fromPath: '/automation', toPath: XSS, count: 6 },
    { fromPath: '/it', toPath: '/rowing', count: 2 },
    { fromPath: '(other)', toPath: '(other)', count: 5 },
  ],
  ...o,
});

const vc = (value: string | null, visits: number): ValueCount => ({ value, visits });
const audienceData = (o: Partial<AudienceResponse> = {}): AudienceResponse => ({
  range,
  filters: { applied: {}, ignored: ['locale', 'device'] },
  newVsReturning: { newVisits: 90, returningVisits: 70 },
  repeatOfferViewers: { value: 6, basis: '28d' },
  deviceClass: [vc('desktop', 100), vc('mobile', 58), vc('tablet', 2)],
  entryLocale: [vc('de', 120), vc('en', 40)],
  dimensions: {
    country: [vc('CH', 120), vc('DE', 20), vc(XSS, 5), vc('FR', 2), vc('(other)', 4), vc(null, 3)],
    browserFamily: [vc('Firefox', 80), vc('Chrome', 78), vc('Opera', 1)],
    osFamily: [vc('macOS', 90), vc('iOS', 70)],
    viewport: [vc('1440', 60), vc('375', 50)],
    visitorType: [vc('new', 90), vc('returning', 70), vc(XSS, 1)],
  },
  ...o,
});

const day = (i: number, consented: number, cf: number, sampled = false) => ({ day: `2026-10-${String(11 + i).padStart(2, '0')}`, consentedPageviews: consented, cloudflareRequests: cf, sampled });
const dq = { edge: { too_large: 2, [XSS]: 1 }, secondLine: { invalid_path: 3 }, duplicates: 4, cappedDays: null };
const coverageData = (o: Partial<CoverageResponse> = {}): CoverageResponse => ({
  range,
  filters: { applied: {}, ignored: ['device'] },
  baselineFrom: '2026-10-01',
  daily: [day(0, 20, 60), day(1, 30, 70, true), day(2, 0, 0), day(3, 25, 20)],
  byPage: [
    { path: '/automation', locale: 'de', consentedPageviews: 30, cloudflareRequests: 90, sampled: false },
    { path: '/automation', locale: XSS, consentedPageviews: 5, cloudflareRequests: 9, sampled: true },
    { path: '/about', locale: 'en', consentedPageviews: 1, cloudflareRequests: 2, sampled: false },
    { path: '/wp-login.php', locale: 'de', consentedPageviews: 0, cloudflareRequests: 40, sampled: false },
    { path: XSS, locale: 'en', consentedPageviews: 0, cloudflareRequests: 7, sampled: false },
  ],
  enquiries: { consentedSubmits: 3, totalSubmits: 5 },
  dataQuality: dq,
  ...o,
});

const overview = (from: string): AnalyticsResult<OverviewResponse> =>
  ok({ range: { ...range, from }, filters, current: {} as OverviewResponse['current'], previous: null, visitors: null, daily: [] });
const down: AnalyticsResult<never> = { ok: false, kind: 'unreachable' };

describe('resolveDefinition (M1, M2)', () => {
  it('detects a clamped range only when the requested range starts earlier', () => {
    const clamped = ok(pathsData({ range: { ...range, from: '2026-10-20' }, definitionFrom: '2026-10-20' }));
    expect(resolveDefinition(clamped, down, overview('2026-10-11'))).toEqual({ kind: 'clamped', day: '2026-10-20' });
    expect(resolveDefinition(clamped, down, overview('2026-10-20'))).toEqual({ kind: 'full', day: '2026-10-20' });
  });

  it('null and a date after the range are their own states; /funnels is the fallback; both failing is unknown', () => {
    expect(resolveDefinition(ok(pathsData({ definitionFrom: null })), down, overview('2026-10-11'))).toEqual({ kind: 'none' });
    const after = ok(funnelsData({ range: { ...range, from: null, to: null, days: 0 }, definitionFrom: '2026-11-20' }));
    expect(resolveDefinition(down, after, overview('2026-10-11'))).toEqual({ kind: 'after', day: '2026-11-20' });
    expect(resolveDefinition(down, down, overview('2026-10-11'))).toEqual({ kind: 'unknown' });
  });
});

describe('2 Funnels', () => {
  it('steps in order with "< 3", no bar length, rates touching a small step dropped (H1, L9)', () => {
    const out = html(FunnelsSection, { result: ok(funnelsData()), def: full, ctx: ctx({ compare: 'none' }) });
    expect(out).toContain('funnels.ids.offer');
    expect(out.indexOf('funnels.steps.visit')).toBeLessThan(out.indexOf('funnels.steps.offerVisit'));
    expect(out).toContain('aria-label="lt3Spoken">lt3</span>');
    expect(out).toContain(q('funnels.ofPrevious{"rate":"30%"}'));
    // A "x of n" step rate would repeat the count: only n is named.
    expect(out).toContain(q('funnels.ofPreviousN{"n":"12"}'));
    // contact_submit (2) is small: no rate of the previous step for it, no overall rate.
    expect(out).not.toContain('funnels.ofFirst{');
    expect(out).toMatch(/aria-hidden="true"[^>]*><div style="width:0%/);
    expect(out).toContain('<details');
    expect(out).not.toContain('glance.previous');
  });

  it('H3: rate deltas only with a same-length previous span, never counts; partial previous gets a note', () => {
    const one = funnelsData();
    one.funnels = [one.funnels[0]];
    const out = html(FunnelsSection, { result: ok(one), def: full, ctx: ctx() });
    expect(out).toContain('glance.ppChange');
    expect(out).toContain('funnels.deltaSmall');
    expect(out).not.toContain('glance.small');
    expect(out).not.toContain('380');
    const partial = html(FunnelsSection, { result: ok(funnelsData({ range: { ...range, previous: { from: '2026-10-01', to: '2026-10-10' } } })), def: full, ctx: ctx() });
    expect(partial).toContain('funnels.comparePartial');
    expect(partial).not.toContain('glance.ppChange');
    expect(html(FunnelsSection, { result: ok(funnelsData()), def: full, ctx: ctx() })).toContain('funnels.comparePartial');
  });

  it('M1: clamped note, and none/after texts replace the empty-range text', () => {
    expect(html(FunnelsSection, { result: ok(funnelsData()), def: { kind: 'clamped', day: '2026-10-20' }, ctx: ctx() })).toContain(q('definition.clamped{"day":"20 Oct 2026"}'));
    const none = html(FunnelsSection, { result: ok(funnelsData({ range: { ...range, days: 0 } })), def: { kind: 'none' }, ctx: ctx() });
    expect(none).toContain('definition.none');
    expect(none).not.toContain('noDataInRange');
    expect(html(FunnelsSection, { result: ok(funnelsData()), def: { kind: 'after', day: '2026-11-20' }, ctx: ctx() })).toContain(q('definition.after{"day":"20 Nov 2026"}'));
  });

  it('L8: funnel id and step key are text; failures show the failure', () => {
    const out = html(FunnelsSection, { result: ok(funnelsData({ funnels: [{ id: XSS, steps: [{ index: 1, key: XSS, visits: 9 }, { index: 2, key: null, visits: 4 }], previous: null }] })), def: full, ctx: ctx() });
    noMarkup(out);
    expect(out).toContain('&lt;img');
    expect(out).toContain('unknown');
    expect(html(FunnelsSection, { result: down, def: full, ctx: ctx() })).toContain('unavailable');
  });
});

describe('6 Paths', () => {
  const out = html(PathsSection, { result: ok(pathsData()), def: full, ctx: ctx() });
  it('group paths: translated tokens, < 3 folded with the API (other) row, converting 1–2 as "< 3" (H1, L4)', () => {
    expect(out).toContain('paths.groups.home › paths.groups.offer › paths.groups.contact › paths.groups.exit');
    expect(out).toContain(q('other{"n":"5"}')); // proof (2) + (other) (3)
    expect(out).toMatch(/<td style="[^"]*text-align:right[^"]*"><span aria-label="lt3Spoken">lt3<\/span><\/td>/);
  });

  it('entry × exit and transitions fold (other) and < 3; (entrance)/(exit) labelled', () => {
    expect(out).toContain(q('other{"n":"3"}')); // entry/exit: 1 + 2
    expect(out).toContain(q('other{"n":"7"}')); // transitions: 2 + 5
    expect(out).toContain('flow.entrance');
    expect(out).toContain('flow.exit');
  });

  it('seen before contacting: fixed categories with "< 3", n stated (H1)', () => {
    expect(out).toContain(q('paths.seenBefore{"n":"20"}'));
    expect(out).toContain('paths.seenValues.projects');
    // n = 20 < 30: rates would be "x of 20", which repeats the shown count, so no note.
    expect(out).not.toContain('fraction{');
    expect(out).toContain('aria-label="lt3Spoken">lt3</span>');
  });

  it('L8: every API value is text; filter scope note when filters apply', () => {
    noMarkup(out);
    const filtered = html(PathsSection, { result: ok(pathsData({ filters: { applied: { locale: 'de' }, ignored: [] } })), def: full, ctx: ctx({ entry: 'de' }) });
    expect(filtered).toContain('paths.filtersScope');
  });
});

describe('7 Audience', () => {
  it('fixed lists show "< 3"; open dimensions fold < 3 with (other); null reads unknown; ignored filters echoed', () => {
    const out = html(AudienceSection, { result: ok(audienceData()), def: full, ctx: ctx() });
    expect(out).toContain('controls.tablet');
    expect(out).toContain('aria-label="lt3Spoken">lt3</span>');
    expect(out).toContain(q('other{"n":"6"}')); // country: FR 2 + (other) 4
    expect(out).toContain(q('other{"n":"1"}')); // browser: Opera 1
    expect(out).toContain('unknown');
    expect(out).toContain(q('ignored{"filters":"locale, device"}'));
    expect(out).toContain('glance.basis28d');
    noMarkup(out);
  });

  it('M2: repeat offer viewers explain a clamped range apart from a range without a basis', () => {
    const none = audienceData({ repeatOfferViewers: { value: null, basis: null } });
    expect(html(AudienceSection, { result: ok(none), def: { kind: 'clamped', day: '2026-10-20' }, ctx: ctx() })).toContain('audience.repeatClamped');
    expect(html(AudienceSection, { result: ok(none), def: full, ctx: ctx() })).toContain('audience.repeatBasis');
    expect(html(AudienceSection, { result: ok(none), def: { kind: 'unknown' }, ctx: ctx() })).toContain('definition.unknown');
  });
});

describe('8 Coverage', () => {
  it('pre-go-live: one note, no chart, data quality still shown with the range (M3)', () => {
    const out = html(CoverageSection, { result: ok(coverageData({ baselineFrom: null, daily: [], byPage: [] })), ctx: ctx() });
    expect(out).toContain('coverage.preGoLive');
    expect(out).not.toContain('coverage.chart');
    expect(out).toContain(q('coverage.dqTitleRange{"from":"11 Oct 2026","to":"7 Nov 2026"}'));
  });

  it('baselineFrom after the range has its own text; after range.from the parts say "since baselineFrom" (M3)', () => {
    const after = html(CoverageSection, { result: ok(coverageData({ baselineFrom: '2026-11-20', daily: [], byPage: [] })), ctx: ctx() });
    expect(after).toContain(q('coverage.baselineAfter{"day":"20 Nov 2026"}'));
    expect(after).toContain('coverage.dqTitleRange');
    expect(html(CoverageSection, { result: ok(coverageData({ baselineFrom: '2026-10-14' })), ctx: ctx() })).toContain(q('coverage.since{"day":"14 Oct 2026"}'));
    expect(html(CoverageSection, { result: ok(coverageData()), ctx: ctx() })).toContain(q('coverage.since{"day":"11 Oct 2026"}'));
  });

  it('band only when both sums ≥ 50, indicative, gap days excluded with a note (M4)', () => {
    const out = html(CoverageSection, { result: ok(coverageData()), ctx: ctx() });
    // CF > 0 days: c = 75, f = 150 → 50–60 %.
    expect(out).toContain(q('coverage.band{"lo":50,"hi":60}'));
    expect(out).toContain('coverage.indicative');
    expect(out).toContain(q('coverage.excludedDays{"n":1}'));
    expect(html(CoverageSection, { result: ok(coverageData({ daily: [day(0, 20, 40)] })), ctx: ctx() })).toContain('coverage.bandSmall');
  });

  it('L3: side by side, consented > cloudflare drawn as is, sampled marked in title and table', () => {
    const out = html(CoverageSection, { result: ok(coverageData()), ctx: ctx() });
    expect(out).toContain('(coverage.sampled)');
    expect(out).toContain('≈ 70');
    expect(out).toContain('coverage.consented 25, coverage.cloudflare 20');
  });

  it('H2: byPage lists registry paths only; scanner paths and small rows fold into other (n)', () => {
    const many = Array.from({ length: 120 }, (_, i) => ({ path: `/scan-${i}`, locale: 'de', consentedPageviews: 0, cloudflareRequests: 1, sampled: false }));
    const out = html(CoverageSection, { result: ok(coverageData({ byPage: [...coverageData().byPage, ...many] })), ctx: ctx() });
    expect(out).toMatch(/<td style="[^"]*vertical-align:top">\/automation<\/td>/);
    expect(out).not.toContain('wp-login');
    expect(out).not.toContain('/scan-');
    expect(out).toContain(q('other{"n":"169"}')); // 2 + 40 + 7 + 120
    expect(out).toContain('≈ 9');
  });

  it('L6: enquiries as "x of n" by submission day, never a ratio', () => {
    const out = html(CoverageSection, { result: ok(coverageData({ enquiries: { consentedSubmits: 7, totalSubmits: 5 } })), ctx: ctx() });
    expect(out).toContain(q('fraction{"x":"5","n":"5"}'));
    expect(out).toContain('coverage.enquiriesSub');
  });

  it('L8: byPage locale and data-quality reason keys are text', () => {
    const out = html(CoverageSection, { result: ok(coverageData()), ctx: ctx() });
    noMarkup(out);
    expect(out).toContain('&lt;img');
  });
});

describe('Drilldown page flow', () => {
  const detail = (o: Partial<PageDetailResponse> = {}): PageDetailResponse => ({
    range,
    filters,
    summary: null,
    previous: [{ path: '(entrance)', count: 20 }, { path: '/it', count: 6 }, { path: XSS, count: 4 }, { path: '/rowing', count: 2 }, { path: '(other)', count: 3 }],
    next: [{ path: '(exit)', count: 18 }, { path: '/contact', count: 5 }],
    clicks: [],
    sections: null,
    faqOpens: null,
    daily: [],
    ...o,
  });

  it('labels entrance/exit, folds < 3 with (other), renders paths as text', () => {
    const out = html(PageFlow, { result: ok(detail()), def: full, ctx: ctx() });
    expect(out).toContain('flow.entrance');
    expect(out).toContain('flow.exit');
    expect(out).toContain(q('other{"n":"5"}'));
    noMarkup(out);
  });

  it('before the definition date and on version skew it explains instead of listing', () => {
    expect(html(PageFlow, { result: ok(detail()), def: { kind: 'none' }, ctx: ctx() })).toContain('definition.none');
    expect(html(PageFlow, { result: ok(detail({ previous: null, next: null })), def: full, ctx: ctx() })).toContain('flow.unavailable');
  });
});

describe('#170 review follow-ups (N1–N4)', () => {
  it('N1: the coverage chart buckets 90 days by week; a bucket is sampled when any day is, partial buckets are starred', () => {
    // 90 days from Mon 2026-08-10 → 13 ISO weeks, the last one partial (Mon 2026-11-02 … Sun 2026-11-08, data through 7 Nov).
    const daily = Array.from({ length: 90 }, (_, i) => ({
      day: new Date(Date.parse('2026-08-10T00:00:00Z') + i * 86_400_000).toISOString().slice(0, 10),
      consentedPageviews: 10,
      cloudflareRequests: 30,
      sampled: i === 15,
    }));
    const r: Range = { from: '2026-08-10', to: '2026-11-07', days: 90, lastCompleteDay: '2026-11-07', previous: null };
    const out = html(CoverageSection, { result: ok(coverageData({ range: r, baselineFrom: '2026-08-01', daily })), ctx: ctx() });
    expect(out).toContain(q('coverage.chart{"unit":"glance.unitWeek"}'));
    expect(out.match(/<g opacity=/g)).toHaveLength(13);
    expect(out).toMatch(/<td style="[^"]*text-align:right[^"]*">210<\/td>/);
    expect(out.match(/≈ 210/g)).toHaveLength(1); // only the week holding the sampled day (24 Aug)
    expect(out).toContain('2 Nov 2026 *');
    expect(out).toContain('glance.partial');
  });

  it('N2: no rate delta when a previous-period cell is below 3', () => {
    const f = funnelsData({
      funnels: [
        {
          id: 'offer',
          steps: [{ index: 1, key: 'visit', visits: 400 }, { index: 2, key: 'offer_visit', visits: 120 }, { index: 3, key: 'reached_prices', visits: 60 }],
          previous: [{ index: 1, key: 'visit', visits: 380 }, { index: 2, key: 'offer_visit', visits: 100 }, { index: 3, key: 'reached_prices', visits: 2 }],
        },
      ],
    });
    const out = html(FunnelsSection, { result: ok(f), def: full, ctx: ctx() });
    expect(out.match(/glance\.ppChange/g)).toHaveLength(1);
    expect(out).toContain('funnels.deltaSmall');
  });

  it('N3: new/returning tiles show "< 3" and no share at 1–2', () => {
    const out = html(AudienceSection, { result: ok(audienceData({ newVsReturning: { newVisits: 2, returningVisits: 70 } })), def: full, ctx: ctx() });
    expect(out).toMatch(/audience\.new<\/p><p[^>]*>lt3<\/p>/);
    expect(out).not.toContain(q('fraction{"x":"2"'));
  });

  it('N4: every known basis gets its label; anything else stays raw text', () => {
    expect(html(AudienceSection, { result: ok(audienceData({ repeatOfferViewers: { value: 4, basis: '7d' } })), def: full, ctx: ctx() })).toContain('glance.basis7d');
    const odd = html(AudienceSection, { result: ok(audienceData({ repeatOfferViewers: { value: 4, basis: '14d' } })), def: full, ctx: ctx() });
    expect(odd).toContain('>14d<');
    expect(odd).not.toContain('glance.basis14d');
  });
});
