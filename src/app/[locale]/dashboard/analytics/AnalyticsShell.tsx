// Server Component that fetches and renders /dashboard/analytics (spec 100
// §9; WA-4a #155). Rendered only after the ADMIN check in page.tsx.
// Fetch order (review M2, Q2): presets that end at lastCompleteDay (7d, 90d,
// 12m) wait for /status; the 28-day default and custom ranges fetch /status
// and every section in parallel. When /status fails, the sections use the
// API default (28 days) and the header says so.
// WA-4b #156: funnels, paths, audience and coverage are fetched in the same
// round; one definition date (from /paths, else /funnels) is resolved here and
// passed to every definition-bound block (review M2).
import type { CSSProperties } from 'react';
import { getTranslations } from 'next-intl/server';
import { LazyNeverTrackSwitch } from '@/components/analytics/lazySwitch';
import { ANALYTICS_UI_ENABLED } from '@/lib/analytics/flags';
import {
  getAudience,
  getClicks,
  getCoverage,
  getFunnels,
  getOverview,
  getPageDetail,
  getPages,
  getPaths,
  getSources,
  getStatus,
  type RangeQuery,
} from '@/lib/analytics/read';
import { needsStatus, rangeQuery, type Controls } from './searchParams';
import {
  ClicksSection,
  ControlsBar,
  HeaderLine,
  OfferGlance,
  PageDrilldown,
  PagesSection,
  SourcesSection,
  StatusStrip,
  type Ctx,
} from './sections';
import { AudienceSection, CoverageSection, FunnelsSection, PageFlow, PathsSection, resolveDefinition } from './sections-flow';
import { Section, makeFormatters, monoLabel, type Translate } from './ui';

const titleStyle: CSSProperties = { fontFamily: 'var(--sans)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 500, letterSpacing: '-.03em', color: 'var(--n-100)' };

export async function AnalyticsShell({ locale, controls }: { locale: string; controls: Controls }) {
  const tr = await getTranslations({ locale, namespace: 'dashboard.analytics' });
  const t: Translate = (key, values) => tr(key as never, values as never);
  const fmt = makeFormatters(locale);

  const statusPromise = getStatus();
  let statusDefaulted = false;
  let range: { from?: string; to?: string } = rangeQuery(controls, null);
  if (needsStatus(controls)) {
    const status = await statusPromise;
    if (status.ok) range = rangeQuery(controls, status.data.lastCompleteDay);
    else statusDefaulted = true;
  }
  const q: RangeQuery = { ...range, compare: controls.compare ? 'previous' : 'none', locale: controls.entry, device: controls.device };
  const [status, overview, pages, clicks, sources, detail, funnels, paths, audience, coverage] = await Promise.all([
    statusPromise,
    getOverview(q),
    getPages(q),
    getClicks(q, controls.kind),
    getSources(q),
    controls.page ? getPageDetail(q, controls.page) : Promise.resolve(null),
    getFunnels(q),
    getPaths(q),
    getAudience(q),
    getCoverage(q),
  ]);
  const def = resolveDefinition(paths, funnels, overview);

  const ctx: Ctx = { t, fmt, c: controls, locale };
  return (
    <div className="container border-x" style={{ paddingBottom: '3rem' }}>
      <header style={{ padding: '2rem 0 1rem' }}>
        <p style={{ ...monoLabel, marginBottom: '.5rem' }}>{t('kicker')}</p>
        <h1 style={titleStyle}>{t('title')}</h1>
        <p style={{ fontSize: 'var(--fs-15)', color: 'var(--n-70)', marginTop: '.5rem', maxWidth: '60ch' }}>{t('subtitle')}</p>
        <HeaderLine overview={overview} statusDefaulted={statusDefaulted} ctx={ctx} />
      </header>
      <ControlsBar ctx={ctx} />
      <StatusStrip result={status} ctx={ctx} />
      <OfferGlance result={overview} ctx={ctx} />
      <FunnelsSection result={funnels} def={def} ctx={ctx} />
      <PagesSection result={pages} ctx={ctx} />
      {controls.page && detail && <PageDrilldown result={detail} path={controls.page} flow={<PageFlow result={detail} def={def} ctx={ctx} />} ctx={ctx} />}
      <ClicksSection result={clicks} ctx={ctx} />
      <SourcesSection result={sources} ctx={ctx} />
      <PathsSection result={paths} def={def} ctx={ctx} />
      <AudienceSection result={audience} def={def} ctx={ctx} />
      <CoverageSection result={coverage} ctx={ctx} />
      <Section id="wa-browser" title={t('browser.title')}>
        <LazyNeverTrackSwitch uiEnabled={ANALYTICS_UI_ENABLED} />
      </Section>
    </div>
  );
}
