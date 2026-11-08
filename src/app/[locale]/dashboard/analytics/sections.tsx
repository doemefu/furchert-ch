// Sections of /dashboard/analytics (spec 100 §9.2; WA-4a #155). Synchronous
// render functions over already-fetched results, a translator and
// formatters, so they render in node tests. Every API value is rendered as
// text (C16): no dangerouslySetInnerHTML, no href built from an API value;
// drilldown links exist only for registry paths and use the registry
// constant (review M1).
import { StatusDot, type DotStatus } from '@/components/ui/StatusDot';
import { TRACKED_PATHS, isTracked } from '@/lib/analytics/registry';
import type {
  AnalyticsResult,
  ClicksResponse,
  CollectorStatus,
  Filters,
  OverviewResponse,
  PageDetailResponse,
  PagesResponse,
  Range,
  SourcesResponse,
  StatusResponse,
} from '@/lib/analytics/read';
import {
  HISTOGRAM_BUCKETS,
  bounce,
  bucketSeries,
  countDelta,
  ctr,
  exitRate,
  foldRows,
  medianBucket,
  rate,
  rateDelta,
  scrollReach,
  winner,
} from '@/lib/analytics/stats';
import { EmphasisColumns, RankedBars, TableView } from './charts';
import { CLICK_KINDS, PRESETS, hrefFor, type Controls } from './searchParams';
import {
  Failure,
  Note,
  Section,
  StatTile,
  TableWrap,
  cardStyle,
  chipActive,
  chipBase,
  linkStyle,
  monoLabel,
  noteStyle,
  numTd,
  rateText,
  tdStyle,
  thStyle,
  type Formatters,
  type Translate,
} from './ui';

interface Ctx {
  t: Translate;
  fmt: Formatters;
  c: Controls;
  locale: string;
}

const linkTo = (ctx: Ctx, change: Partial<Controls>, hash?: string) => `/${ctx.locale}${hrefFor(ctx.c, change, hash)}`;
const grid = (min: number) => ({ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: '.75rem' }) as const;

/** Empty-state text for a section's echoed range, or null when there is data (L2). */
export function emptyText(range: Range, t: Translate, fmt: Formatters): string | null {
  if (range.lastCompleteDay === null) return t('noFinalDay');
  if (range.days === 0) return t('noDataInRange', { day: fmt.day(range.lastCompleteDay) });
  return null;
}

function Ignored({ filters, t }: { filters: Filters; t: Translate }) {
  if (filters.ignored.length === 0) return null;
  return <span style={noteStyle}>{t('ignored', { filters: filters.ignored.join(', ') })}</span>;
}

// ── Header and controls ────────────────────────────────────────────────────

export function HeaderLine({ overview, statusDefaulted, ctx }: { overview: AnalyticsResult<OverviewResponse>; statusDefaulted: boolean; ctx: Ctx }) {
  const { t, fmt, c } = ctx;
  // "Data through" comes from the sections' echoed range (single source); never the provisional day (L3).
  const lcd = overview.ok ? overview.data.range.lastCompleteDay : null;
  return (
    <div style={{ display: 'grid', gap: '.35rem', marginTop: '.75rem' }}>
      <p style={noteStyle}>{lcd ? t('dataThrough', { day: fmt.day(lcd) }) : overview.ok ? t('noFinalDay') : t('unavailable')}</p>
      {statusDefaulted && <Note>{t('statusDefaulted')}</Note>}
      {c.invalidCustom && <Note>{t('invalidCustom')}</Note>}
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: string }) {
  return (
    <a href={href} aria-current={active ? 'true' : undefined} style={active ? chipActive : chipBase}>
      {children}
    </a>
  );
}

export function ControlsBar({ ctx }: { ctx: Ctx }) {
  const { t, c } = ctx;
  const row = { display: 'flex', flexWrap: 'wrap', gap: '.4rem', alignItems: 'center' } as const;
  const label = { ...monoLabel, fontSize: '.62rem', marginRight: '.25rem' };
  return (
    <div style={{ display: 'grid', gap: '.6rem', padding: '1rem 0', borderBottom: '1px solid rgba(162,167,176,.22)' }}>
      <div style={row}>
        <span style={label}>{t('controls.range')}</span>
        {PRESETS.map((p) => (
          <Chip key={p} href={linkTo(ctx, { preset: p, from: undefined, to: undefined })} active={c.preset === p}>
            {t(`controls.p${p}`)}
          </Chip>
        ))}
        <form method="get" action={`/${ctx.locale}/dashboard/analytics`} style={{ ...row, marginLeft: '.5rem' }}>
          <input type="hidden" name="range" value="custom" />
          {!c.compare && <input type="hidden" name="compare" value="none" />}
          {c.entry && <input type="hidden" name="entry" value={c.entry} />}
          {c.device && <input type="hidden" name="device" value={c.device} />}
          <label style={noteStyle}>
            {t('controls.from')} <input type="date" name="from" defaultValue={c.preset === 'custom' ? c.from : undefined} required />
          </label>
          <label style={noteStyle}>
            {t('controls.to')} <input type="date" name="to" defaultValue={c.preset === 'custom' ? c.to : undefined} required />
          </label>
          <button type="submit" style={chipBase}>
            {t('controls.apply')}
          </button>
        </form>
      </div>
      <div style={row}>
        <span style={label}>{t('controls.compare')}</span>
        <Chip href={linkTo(ctx, { compare: true })} active={c.compare}>{t('controls.compareOn')}</Chip>
        <Chip href={linkTo(ctx, { compare: false })} active={!c.compare}>{t('controls.compareOff')}</Chip>
        <span style={{ ...label, marginLeft: '1rem' }}>{t('controls.entry')}</span>
        <Chip href={linkTo(ctx, { entry: undefined })} active={!c.entry}>{t('controls.all')}</Chip>
        <Chip href={linkTo(ctx, { entry: 'de' })} active={c.entry === 'de'}>{t('controls.de')}</Chip>
        <Chip href={linkTo(ctx, { entry: 'en' })} active={c.entry === 'en'}>{t('controls.en')}</Chip>
        <span style={{ ...label, marginLeft: '1rem' }}>{t('controls.device')}</span>
        <Chip href={linkTo(ctx, { device: undefined })} active={!c.device}>{t('controls.all')}</Chip>
        {(['desktop', 'mobile', 'tablet'] as const).map((d) => (
          <Chip key={d} href={linkTo(ctx, { device: d })} active={c.device === d}>
            {t(`controls.${d}`)}
          </Chip>
        ))}
      </div>
    </div>
  );
}

// ── 0 Status strip ─────────────────────────────────────────────────────────

function collectorDot(col: CollectorStatus): { status: DotStatus; key: 'disabled' | 'stale' | 'failing' | 'ok' } {
  if (!col.enabled) return { status: 'unknown', key: 'disabled' };
  if (col.stale) return { status: 'offline', key: 'stale' };
  if (col.consecutiveFailures > 0) return { status: 'wip', key: 'failing' };
  return { status: 'online', key: 'ok' };
}

export function StatusStrip({ result, ctx }: { result: AnalyticsResult<StatusResponse>; ctx: Ctx }) {
  const { t, fmt } = ctx;
  return (
    <Section id="wa-status" title={t('status.title')}>
      {!result.ok ? (
        <Failure result={result} t={t} />
      ) : (
        <div style={grid(220)}>
          {result.data.collectors.map((col) => {
            const dot = collectorDot(col);
            return (
              <div key={col.name} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.4rem' }}>
                  <StatusDot status={dot.status} label={t(`status.${dot.key}`)} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '.75rem', fontWeight: 500, color: 'var(--n-100)' }}>{t('status.rollup')}</span>
                  <span style={{ ...noteStyle, marginLeft: 'auto' }}>{t(`status.${dot.key}`)}</span>
                </div>
                <p style={noteStyle}>
                  {t('status.lastSuccess')}: {col.lastSuccessAt ? fmt.time(col.lastSuccessAt) : t('status.never')}
                </p>
              </div>
            );
          })}
          <div style={cardStyle}>
            <p style={noteStyle}>
              {t('status.lastComplete')}: {result.data.lastCompleteDay ? fmt.day(result.data.lastCompleteDay) : t('none')}
            </p>
            {result.data.provisionalDay && <p style={{ ...noteStyle, marginTop: '.3rem' }}>{t('status.provisional', { day: fmt.day(result.data.provisionalDay) })}</p>}
          </div>
          <div style={cardStyle}>
            <p style={noteStyle}>
              {t('status.eventsToday')}: {fmt.num(result.data.ingest.eventsToday)}
            </p>
            <p style={{ ...noteStyle, marginTop: '.3rem' }}>
              {t('status.lastEvent')}: {result.data.ingest.lastEventAt ? fmt.time(result.data.ingest.lastEventAt) : t('status.never')}
            </p>
          </div>
        </div>
      )}
    </Section>
  );
}

// ── 1 Offer at a glance ────────────────────────────────────────────────────

function deltaText(current: number, previous: number | undefined, ctx: Ctx): string | null {
  if (previous === undefined) return null;
  const d = countDelta(current, previous);
  const { t, fmt } = ctx;
  const prev = t('glance.previous', { value: fmt.num(previous) });
  if (d.kind === 'small') return `${prev} · ${t('glance.small')}`;
  if (d.kind === 'flat') return `${prev} · ${t('glance.flat')}`;
  return `${prev} · ${t('glance.change', { diff: `${d.diff > 0 ? '+' : ''}${fmt.num(d.diff)}` })}`;
}

export function OfferGlance({ result, ctx }: { result: AnalyticsResult<OverviewResponse>; ctx: Ctx }) {
  const { t, fmt } = ctx;
  if (!result.ok) {
    return (
      <Section id="wa-glance" title={t('glance.title')}>
        <Failure result={result} t={t} />
      </Section>
    );
  }
  const d = result.data;
  const empty = emptyText(d.range, t, fmt);
  const cur = d.current;
  const prev = d.previous ?? undefined;
  const filtered = Object.keys(d.filters.applied).length > 0;
  const engaged = rate(cur.engagedOfferVisits, cur.offerVisits);
  const engagedDelta = prev ? rateDelta(cur.engagedOfferVisits, cur.offerVisits, prev.engagedOfferVisits, prev.offerVisits) : null;
  // Submits are two counts, never a ratio or interval (M4): consented goals vs all enquiries.
  const consented = Math.min(cur.conversions, cur.enquiriesTotal);
  const series = bucketSeries(d.daily, ['visits', 'offerVisits']);
  const unitKey = series.unit === 'day' ? 'glance.unitDay' : series.unit === 'week' ? 'glance.unitWeek' : 'glance.unitMonth';
  const visitors = d.visitors?.current;
  return (
    <Section id="wa-glance" title={t('glance.title')} aside={<Ignored filters={d.filters} t={t} />}>
      {empty ? (
        <Note>{empty}</Note>
      ) : (
        <div style={{ display: 'grid', gap: '.75rem' }}>
          <div style={grid(170)}>
            <StatTile label={t('glance.visits')} value={fmt.num(cur.visits)} sub={deltaText(cur.visits, prev?.visits, ctx)} />
            <StatTile label={t('glance.offerVisits')} value={fmt.num(cur.offerVisits)} sub={deltaText(cur.offerVisits, prev?.offerVisits, ctx)} />
            <StatTile
              label={t('glance.engagedOffer')}
              value={engaged.kind === 'interval' ? fmt.pct(engaged.p) : rateText(engaged, t, fmt)}
              sub={[
                engaged.kind === 'interval' ? t('glance.interval95', { lo: fmt.pct(engaged.lo), hi: fmt.pct(engaged.hi) }) : null,
                engagedDelta === null
                  ? null
                  : engagedDelta.kind === 'change'
                    ? t('glance.ppChange', { pp: `${engagedDelta.pp > 0 ? '+' : ''}${engagedDelta.pp}` })
                    : t('glance.previous', { value: rateText(rate(prev!.engagedOfferVisits, prev!.offerVisits), t, fmt) }),
              ]
                .filter(Boolean)
                .join(' · ')}
            />
            <StatTile label={t('glance.contactIntents')} value={fmt.num(cur.contactIntentVisits)} sub={deltaText(cur.contactIntentVisits, prev?.contactIntentVisits, ctx)} />
            <StatTile
              label={t('glance.submits')}
              value={t('fraction', { x: fmt.num(consented), n: fmt.num(cur.enquiriesTotal) })}
              sub={[t('glance.submitsValue', { x: fmt.num(consented), n: fmt.num(cur.enquiriesTotal) }), filtered ? t('glance.unfiltered') : null].filter(Boolean).join(' · ')}
            />
            <StatTile
              label={t('glance.visitors')}
              value={visitors && visitors.value !== null ? fmt.num(visitors.value) : t('none')}
              sub={
                visitors && visitors.value !== null
                  ? t(`glance.basis${visitors.basis === 'month' ? 'Month' : visitors.basis}`)
                  : t('glance.visitorsNone')
              }
            />
          </div>
          <EmphasisColumns
            title={t('glance.chart', { unit: t(unitKey) })}
            buckets={series.buckets}
            context="visits"
            subject="offerVisits"
            labels={{ context: t('glance.legendVisits'), subject: t('glance.legendOffer'), start: t('glance.start'), partial: t('glance.partial') }}
            t={t}
            fmt={fmt}
          />
        </div>
      )}
    </Section>
  );
}

// ── 3 Pages + drilldown ────────────────────────────────────────────────────

function medianText(hist: number[], samples: number, t: Translate): string {
  const m = medianBucket(hist, samples);
  return m.kind === 'few' ? t('pages.medianFew', { n: m.n }) : HISTOGRAM_BUCKETS[m.index];
}

export function PagesSection({ result, ctx }: { result: AnalyticsResult<PagesResponse>; ctx: Ctx }) {
  const { t, fmt } = ctx;
  if (!result.ok) {
    return (
      <Section id="wa-pages" title={t('pages.title')}>
        <Failure result={result} t={t} />
      </Section>
    );
  }
  const d = result.data;
  const empty = emptyText(d.range, t, fmt);
  const folded = foldRows(d.items, (p) => p.pageviews, (p) => p.path === '(other)');
  return (
    <Section id="wa-pages" title={t('pages.title')} aside={<Ignored filters={d.filters} t={t} />}>
      {empty ? (
        <Note>{empty}</Note>
      ) : d.items.length === 0 ? (
        <Note>{t('pages.noRows')}</Note>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              {['path', 'pageviews', 'entries', 'exitRate', 'bounce', 'medianTime', 'scroll50', 'scroll90'].map((k, i) => (
                <th key={k} scope="col" style={{ ...thStyle, textAlign: i === 0 ? 'left' : 'right' }}>
                  {t(`pages.${k}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {folded.kept.map((p) => {
              // M1: a link only for registry paths, built from the registry constant.
              const known = isTracked(p.path) ? TRACKED_PATHS.find((x) => x === p.path) : undefined;
              return (
                <tr key={p.path}>
                  <td style={tdStyle}>
                    {known ? (
                      <a href={linkTo(ctx, { page: known }, 'wa-detail')} style={linkStyle}>
                        {known}
                      </a>
                    ) : (
                      p.path
                    )}
                  </td>
                  <td style={numTd}>
                    {fmt.num(p.pageviews)}
                    <div style={noteStyle}>{t('pages.byLocale', { de: fmt.num(p.pageviewsByLocale.de), en: fmt.num(p.pageviewsByLocale.en) })}</div>
                  </td>
                  <td style={numTd}>{fmt.num(p.entries)}</td>
                  <td style={numTd}>{rateText(exitRate(p.exits, p.visitsViewed), t, fmt)}</td>
                  <td style={numTd}>{rateText(bounce(p.entries, p.landingEngagedVisits), t, fmt)}</td>
                  <td style={numTd}>{medianText(p.engagedHistogram, p.engagementSamples, t)}</td>
                  <td style={numTd}>{rateText(scrollReach(p.scrollReached.p50, p.scrollSamples), t, fmt)}</td>
                  <td style={numTd}>{rateText(scrollReach(p.scrollReached.p90, p.scrollSamples), t, fmt)}</td>
                </tr>
              );
            })}
            {folded.other !== null && (
              <tr>
                <td style={tdStyle} colSpan={8}>
                  {t('other', { n: fmt.num(folded.other) })}
                </td>
              </tr>
            )}
          </tbody>
        </TableWrap>
      )}
    </Section>
  );
}

export function PageDrilldown({ result, path, ctx }: { result: AnalyticsResult<PageDetailResponse>; path: string; ctx: Ctx }) {
  const { t, fmt } = ctx;
  const title = t('pages.detail', { path });
  if (!result.ok) {
    return (
      <Section id="wa-detail" title={title}>
        <Failure result={result} t={t} />
      </Section>
    );
  }
  const d = result.data;
  const empty = emptyText(d.range, t, fmt);
  const clicks = foldRows(d.clicks, (x) => x.clicks, (x) => x.target === '(other)');
  const faq = d.faqOpens ? foldRows(d.faqOpens, (x) => x.opens, (x) => x.faq === '(other)') : null;
  const pv = d.summary?.pageviews ?? 0;
  return (
    <Section id="wa-detail" title={title} aside={<Ignored filters={d.filters} t={t} />}>
      {empty ? (
        <Note>{empty}</Note>
      ) : (
        <div style={{ display: 'grid', gap: '.75rem' }}>
          <TableView
            summary={t('pages.daily')}
            caption={t('pages.daily')}
            head={[t('glance.start'), t('pages.pageviews')]}
            rows={d.daily.map((x) => [fmt.day(x.day), fmt.num(x.pageviews)])}
          />
          <RankedBars
            title={t('pages.clicks')}
            rows={[
              ...clicks.kept.map((x) => ({ key: `${x.kind}|${x.target}|${x.area}`, label: `${t(`clicks.${x.kind}`)} · ${x.target ?? '—'}`, value: x.clicks })),
              ...(clicks.other !== null ? [{ key: '(other)', label: t('other', { n: fmt.num(clicks.other) }), value: clicks.other }] : []),
            ]}
            fmt={fmt}
            emptyText={t('clicks.noRows')}
          />
          {d.sections && (
            <RankedBars
              title={t('pages.sections')}
              rows={d.sections.reached.map((s) => ({ key: s.section, label: s.section, value: s.pageviews, note: rateText(rate(s.pageviews, pv), t, fmt) }))}
              fmt={fmt}
              emptyText={t('sources.noRows')}
            />
          )}
          {faq && (
            <RankedBars
              title={t('pages.faqOpens')}
              rows={[
                ...faq.kept.map((x) => ({ key: x.faq, label: x.faq, value: x.opens })),
                ...(faq.other !== null ? [{ key: '(other)', label: t('other', { n: fmt.num(faq.other) }), value: faq.other }] : []),
              ]}
              fmt={fmt}
              emptyText={t('sources.noRows')}
            />
          )}
          <Note>{t('pages.prevNext')}</Note>
        </div>
      )}
    </Section>
  );
}

// ── 4 Clicks ───────────────────────────────────────────────────────────────

export function ClicksSection({ result, ctx }: { result: AnalyticsResult<ClicksResponse>; ctx: Ctx }) {
  const { t, fmt, c } = ctx;
  const filter = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
      <Chip href={linkTo(ctx, { kind: undefined }, 'wa-clicks')} active={!c.kind}>{t('clicks.all')}</Chip>
      {CLICK_KINDS.map((k) => (
        <Chip key={k} href={linkTo(ctx, { kind: k }, 'wa-clicks')} active={c.kind === k}>
          {t(`clicks.${k}`)}
        </Chip>
      ))}
    </div>
  );
  if (!result.ok) {
    return (
      <Section id="wa-clicks" title={t('clicks.title')}>
        {filter}
        <Failure result={result} t={t} />
      </Section>
    );
  }
  const d = result.data;
  const empty = emptyText(d.range, t, fmt);
  const folded = foldRows(d.items, (x) => x.clicks, (x) => x.target === '(other)' || x.path === '(other)');
  return (
    <Section id="wa-clicks" title={t('clicks.title')} aside={<Ignored filters={d.filters} t={t} />}>
      <div style={{ display: 'grid', gap: '.75rem' }}>
        {filter}
        {empty ? (
          <Note>{empty}</Note>
        ) : d.items.length === 0 ? (
          <Note>{t('clicks.noRows')}</Note>
        ) : (
          <TableWrap>
            <thead>
              <tr>
                {['kind', 'target', 'path', 'area', 'count', 'ctr', 'converting'].map((k, i) => (
                  <th key={k} scope="col" style={{ ...thStyle, textAlign: i < 4 ? 'left' : 'right' }}>
                    {t(`clicks.${k}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {folded.kept.map((x) => (
                <tr key={`${x.kind}|${x.target}|${x.path}|${x.area}`}>
                  <td style={tdStyle}>{t(`clicks.${x.kind}`)}</td>
                  <td style={tdStyle}>{x.target ?? '—'}</td>
                  <td style={tdStyle}>{x.path}</td>
                  <td style={tdStyle}>{x.area}</td>
                  <td style={numTd}>{fmt.num(x.clicks)}</td>
                  <td style={numTd}>{rateText(ctr(x.visits, x.pageVisits), t, fmt)}</td>
                  <td style={numTd}>{fmt.num(x.convertingVisits)}</td>
                </tr>
              ))}
              {folded.other !== null && (
                <tr>
                  <td style={tdStyle} colSpan={7}>
                    {t('other', { n: fmt.num(folded.other) })}
                  </td>
                </tr>
              )}
            </tbody>
          </TableWrap>
        )}
      </div>
    </Section>
  );
}

// ── 5 Sources ──────────────────────────────────────────────────────────────

const CHANNELS = ['campaign', 'ai', 'search', 'social', 'referral', 'direct', 'internal'];
const channelLabel = (ch: string | null, t: Translate) =>
  ch === null ? t('sources.unknown') : ch === 'campaign' ? t('sources.campaign_ch') : CHANNELS.includes(ch) ? t(`sources.${ch}`) : ch;

export function SourcesSection({ result, ctx }: { result: AnalyticsResult<SourcesResponse>; ctx: Ctx }) {
  const { t, fmt } = ctx;
  if (!result.ok) {
    return (
      <Section id="wa-sources" title={t('sources.title')}>
        <Failure result={result} t={t} />
      </Section>
    );
  }
  const d = result.data;
  const empty = emptyText(d.range, t, fmt);
  // Channels stay unfolded (M3); every other list folds rows below 3.
  const channels = [...d.channels].sort((a, b) => b.visits - a.visits);
  const referrers = foldRows(d.referrers, (x) => x.visits, (x) => x.domain === '(other)');
  const campaigns = foldRows(d.campaigns, (x) => x.visits, (x) => x.source === '(other)');
  const entry = foldRows(d.converters.byEntryPath, (x) => x.convertingVisits, (x) => x.path === '(other)');
  const otherRow = (n: number | null) => (n === null ? [] : [{ key: '(other)', label: t('other', { n: fmt.num(n) }), value: n }]);
  return (
    <Section id="wa-sources" title={t('sources.title')} aside={<Ignored filters={d.filters} t={t} />}>
      {empty ? (
        <Note>{empty}</Note>
      ) : (
        <div style={{ display: 'grid', gap: '.75rem' }}>
          <div style={grid(260)}>
            <RankedBars
              title={t('sources.channels')}
              rows={channels.map((x) => ({ key: x.channel, label: channelLabel(x.channel, t), value: x.visits }))}
              badge={{ index: winner(channels.map((x) => x.visits)), text: t('sources.winner') }}
              fmt={fmt}
              emptyText={t('sources.noRows')}
            />
            <RankedBars
              title={t('sources.referrers')}
              rows={[...referrers.kept.map((x) => ({ key: x.domain, label: x.domain, value: x.visits })), ...otherRow(referrers.other)]}
              fmt={fmt}
              emptyText={t('sources.noRows')}
            />
          </div>
          <TableWrap caption={t('sources.campaigns')}>
            <thead>
              <tr>
                {['source', 'medium', 'campaign', 'visits', 'converting'].map((k, i) => (
                  <th key={k} scope="col" style={{ ...thStyle, textAlign: i < 3 ? 'left' : 'right' }}>
                    {t(`sources.${k}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.kept.length === 0 && campaigns.other === null && (
                <tr>
                  <td style={tdStyle} colSpan={5}>
                    {t('sources.noRows')}
                  </td>
                </tr>
              )}
              {campaigns.kept.map((x) => (
                <tr key={`${x.source}|${x.medium}|${x.campaign}`}>
                  <td style={tdStyle}>{x.source ?? '—'}</td>
                  <td style={tdStyle}>{x.medium ?? '—'}</td>
                  <td style={tdStyle}>{x.campaign ?? '—'}</td>
                  <td style={numTd}>{fmt.num(x.visits)}</td>
                  <td style={numTd}>{fmt.num(x.convertingVisits)}</td>
                </tr>
              ))}
              {campaigns.other !== null && (
                <tr>
                  <td style={tdStyle} colSpan={5}>
                    {t('other', { n: fmt.num(campaigns.other) })}
                  </td>
                </tr>
              )}
            </tbody>
          </TableWrap>
          <div style={grid(220)}>
            <RankedBars
              title={t('sources.convertersLanding')}
              rows={d.converters.byLandingChannel.map((x) => ({ key: `l-${x.channel}`, label: channelLabel(x.channel, t), value: x.convertingVisits }))}
              fmt={fmt}
              emptyText={t('sources.noRows')}
            />
            <RankedBars
              title={t('sources.convertersFirst')}
              rows={d.converters.byFirstChannel.map((x) => ({ key: `f-${x.channel}`, label: channelLabel(x.channel, t), value: x.convertingVisits }))}
              fmt={fmt}
              emptyText={t('sources.noRows')}
            />
            <RankedBars
              title={t('sources.convertersEntry')}
              rows={[...entry.kept.map((x) => ({ key: x.path, label: x.path, value: x.convertingVisits })), ...otherRow(entry.other)]}
              fmt={fmt}
              emptyText={t('sources.noRows')}
            />
          </div>
        </div>
      )}
    </Section>
  );
}

// ── 2, 6, 7, 8 placeholders (WA-4b) ────────────────────────────────────────

export function LaterSection({ id, ctx }: { id: 'funnels' | 'paths' | 'audience' | 'coverage'; ctx: Ctx }) {
  return (
    <Section id={`wa-${id}`} title={ctx.t(`later.${id}`)}>
      <Note>{ctx.t('notYetAvailable')}</Note>
    </Section>
  );
}

export type { Ctx };
