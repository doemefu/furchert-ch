// Sections 2, 6, 7, 8 of /dashboard/analytics and the drilldown's page flow
// (spec 100 rev 3.5 §8.2, §8.3, §8.6, §9.2; WA-4b #156). Same pattern as
// sections.tsx: synchronous render functions over fetched results, every API
// value rendered as text (C16), no links built from API values.
//
// Small cells (§8.6, review H1): open lists fold rows below 3 together with
// the API's own "(other)" row into "other (n)"; fixed categories keep their
// row and show "< 3" without a bar length.
import type { ReactNode } from 'react';
import { TRACKED_PATHS, isTracked } from '@/lib/analytics/registry';
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
import { bucketSeries, coverageBand, foldRows, funnelSteps, isSmall, rate, rateDelta, spansMatch, type Rate, type StepView } from '@/lib/analytics/stats';
import { RankedBars, SideBySideColumns, TableView, type RankedRow } from './charts';
import { basisLabel, deviceLabel, flowLabel, funnelLabel, groupPathText, localeLabel, rawLabel, seenLabel, stepLabel, visitorTypeLabel } from './labels';
import { Ignored, emptyText, grid, type Ctx } from './sections';
import { Failure, Note, Section, StatTile, TableWrap, cardStyle, monoLabel, noteStyle, numTd, rateText, tdStyle, thStyle, type Formatters, type Translate } from './ui';

const OTHER = '(other)';

// ── Shared helpers ─────────────────────────────────────────────────────────

/**
 * Definition-2 start (§8.5) as one value for the whole page (review M2): taken
 * from /paths, else /funnels. `clamped` when the producer moved `from` to the
 * definition date (review M1: the section range starts on it and the
 * requested range, echoed by /overview, starts earlier).
 */
export type Definition =
  | { kind: 'unknown' }
  | { kind: 'none' }
  | { kind: 'after'; day: string }
  | { kind: 'clamped'; day: string }
  | { kind: 'full'; day: string };

export function resolveDefinition(
  paths: AnalyticsResult<PathsResponse>,
  funnels: AnalyticsResult<FunnelsResponse>,
  overview: AnalyticsResult<OverviewResponse>,
): Definition {
  const src = paths.ok ? paths.data : funnels.ok ? funnels.data : null;
  if (src === null) return { kind: 'unknown' };
  const day = src.definitionFrom;
  if (day === null) return { kind: 'none' };
  const requested = overview.ok ? overview.data.range : null;
  const to = requested?.to ?? src.range.to;
  if (to !== null && day > to) return { kind: 'after', day };
  if (src.range.from === day && (requested === null || (requested.from !== null && requested.from < day))) return { kind: 'clamped', day };
  return { kind: 'full', day };
}

/** Text replacing a definition-bound section when nothing is counted under the definition (M1). */
function blockingText(def: Definition, t: Translate, fmt: Formatters): string | null {
  if (def.kind === 'none') return t('definition.none');
  if (def.kind === 'after') return t('definition.after', { day: fmt.day(def.day) });
  return null;
}

function DefinitionNote({ def, ctx }: { def: Definition; ctx: Ctx }) {
  if (def.kind === 'clamped') return <Note>{ctx.t('definition.clamped', { day: ctx.fmt.day(def.day) })}</Note>;
  if (def.kind === 'unknown') return <Note>{ctx.t('definition.unknown')}</Note>;
  return null;
}

const smallTexts = (t: Translate) => ({ shown: t('lt3'), spoken: t('lt3Spoken') });

/** A count cell: "< 3" (announced as "fewer than 3") for 1–2 when `smallRule`, else the number. */
function Count({ n, ctx, smallRule }: { n: number; ctx: Ctx; smallRule: boolean }) {
  if (smallRule && n > 0 && isSmall(n)) return <span aria-label={ctx.t('lt3Spoken')}>{ctx.t('lt3')}</span>;
  return <>{ctx.fmt.num(n)}</>;
}

function OtherRow({ n, cols, ctx }: { n: number | null; cols: number; ctx: Ctx }) {
  if (n === null) return null;
  return (
    <tr>
      <td style={tdStyle} colSpan={cols}>
        {ctx.t('other', { n: ctx.fmt.num(n) })}
      </td>
    </tr>
  );
}

function Head({ keys, left, t }: { keys: string[]; left: number; t: Translate }) {
  return (
    <thead>
      <tr>
        {keys.map((k, i) => (
          <th key={k} scope="col" style={{ ...thStyle, textAlign: i < left ? 'left' : 'right' }}>
            {t(k)}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function SubTitle({ children }: { children: ReactNode }) {
  return <h3 style={{ ...monoLabel, fontWeight: 400, margin: '.25rem 0 .5rem' }}>{children}</h3>;
}

/** Fixed-category counts as ranked rows; values below 3 are flagged small (H1). */
const fixedRows = (items: ValueCount[], label: (v: string | null, t: Translate) => string, t: Translate, prefix: string): RankedRow[] =>
  [...items]
    .sort((a, b) => b.visits - a.visits)
    .map((x, i) => ({ key: `${prefix}-${i}`, label: label(x.value, t), value: x.visits, small: x.visits > 0 && isSmall(x.visits) }));

/** Open lists: fold rows below 3 with the API's "(other)" row (H1). */
function openRows(items: ValueCount[], label: (v: string | null, t: Translate) => string, ctx: Ctx, prefix: string): RankedRow[] {
  const f = foldRows(items, (x) => x.visits, (x) => x.value === OTHER);
  return [
    ...f.kept.map((x, i) => ({ key: `${prefix}-${i}`, label: label(x.value, ctx.t), value: x.visits })),
    ...(f.other !== null ? [{ key: `${prefix}-other`, label: ctx.t('other', { n: ctx.fmt.num(f.other) }), value: f.other }] : []),
  ];
}

function failed<T>(result: AnalyticsResult<T>, id: string, title: string, t: Translate) {
  if (result.ok) return null;
  return (
    <Section id={id} title={title}>
      <Failure result={result} t={t} />
    </Section>
  );
}

// ── 2 Funnels ──────────────────────────────────────────────────────────────

/** A step rate; "x of n" would repeat the step's count, so a fraction names only n. */
function stepRate(r: Rate, key: 'funnels.ofPrevious' | 'funnels.ofFirst', t: Translate, fmt: Formatters): string {
  return r.kind === 'fraction' ? t(`${key}N`, { n: fmt.num(r.n) }) : t(key, { rate: rateText(r, t, fmt) });
}

function StepBars({ steps, ctx }: { steps: StepView[]; ctx: Ctx }) {
  const { t, fmt } = ctx;
  const first = steps[0]?.small ? 0 : (steps[0]?.visits ?? 0);
  const last = steps.length - 1;
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '.6rem' }}>
      {steps.map((s, i) => {
        const pct = !s.small && first > 0 ? Math.min((s.visits / first) * 100, 100) : 0;
        return (
          <li key={s.index}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem', fontFamily: 'var(--mono)', fontSize: 'var(--fs-12)', marginBottom: '.25rem' }}>
              <span style={{ color: 'var(--n-90)' }}>{stepLabel(s.key, t)}</span>
              <span style={{ color: 'var(--n-60)', flexShrink: 0 }}>{s.small ? <span aria-label={t('lt3Spoken')}>{t('lt3')}</span> : fmt.num(s.visits)}</span>
            </div>
            <div aria-hidden="true" style={{ height: 6, background: 'var(--n-20)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: 'var(--blue-base)', borderRadius: '2px' }} />
            </div>
            {(s.ofPrevious || (i === last && s.ofFirst)) && (
              <p style={{ ...noteStyle, marginTop: '.25rem' }}>
                {[s.ofPrevious && stepRate(s.ofPrevious, 'funnels.ofPrevious', t, fmt), i === last && s.ofFirst && stepRate(s.ofFirst, 'funnels.ofFirst', t, fmt)].filter(Boolean).join(' · ')}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Rate deltas only (H3): both n ≥ 30 and a previous span of the same length. */
function deltaRows(steps: StepView[], previous: { index: number; visits: number }[], ctx: Ctx): (string | null)[] {
  const prev = [...previous].sort((a, b) => a.index - b.index);
  return steps.map((s, i) => {
    if (i === 0) return null;
    const p1 = prev[i]?.visits ?? 0;
    const p0 = prev[i - 1]?.visits ?? 0;
    // N2: no delta when a cell it rests on is below 3, current or previous (same rule as funnelSteps).
    if (s.small || steps[i - 1].small || isSmall(p1) || isSmall(p0)) return '';
    const d = rateDelta(s.visits, steps[i - 1].visits, p1, p0);
    return d.kind === 'change' ? ctx.t('glance.ppChange', { pp: `${d.pp > 0 ? '+' : ''}${d.pp}` }) : '';
  });
}

export function FunnelsSection({ result, def, ctx }: { result: AnalyticsResult<FunnelsResponse>; def: Definition; ctx: Ctx }) {
  const { t, fmt, c } = ctx;
  const title = t('funnels.title');
  const failure = failed(result, 'wa-funnels', title, t);
  if (failure || !result.ok) return failure;
  const d = result.data;
  const blocking = blockingText(def, t, fmt);
  const empty = blocking ?? emptyText(d.range, t, fmt);
  // H3: no count comparison; rate deltas only on a previous span of the same length.
  const comparable = c.compare && spansMatch(d.range) && d.funnels.every((f) => f.previous !== null);
  return (
    <Section id="wa-funnels" title={title} aside={<Ignored filters={d.filters} t={t} />}>
      {empty ? (
        <Note>{empty}</Note>
      ) : (
        <div style={{ display: 'grid', gap: '.75rem' }}>
          <DefinitionNote def={def} ctx={ctx} />
          {c.compare && !comparable && <Note>{t('funnels.comparePartial')}</Note>}
          <div style={grid(300)}>
            {d.funnels.map((f, fi) => {
              const steps = funnelSteps(f.steps);
              const deltas = comparable && f.previous ? deltaRows(steps, f.previous, ctx) : null;
              const name = funnelLabel(f.id, t);
              return (
                <figure key={`${f.id ?? 'unknown'}-${fi}`} style={cardStyle}>
                  <figcaption style={{ ...monoLabel, marginBottom: '.75rem' }}>{name}</figcaption>
                  <StepBars steps={steps} ctx={ctx} />
                  {deltas && (
                    <ul style={{ ...noteStyle, listStyle: 'none', padding: 0, margin: '.6rem 0 0', display: 'grid', gap: '.2rem' }}>
                      {steps.map((s, i) =>
                        !deltas[i] ? null : (
                          <li key={s.index}>
                            {stepLabel(s.key, t)}: {deltas[i]}
                          </li>
                        ),
                      )}
                      {deltas.some((x) => x === '') && <li>{t('funnels.deltaSmall')}</li>}
                    </ul>
                  )}
                  <TableView
                    summary={t('table')}
                    caption={name}
                    head={[t('funnels.step'), t('funnels.visits'), t('funnels.ofPreviousHead'), t('funnels.ofFirstHead')]}
                    rows={steps.map((s) => [
                      stepLabel(s.key, t),
                      s.small ? t('lt3') : fmt.num(s.visits),
                      s.ofPrevious ? rateText(s.ofPrevious, t, fmt) : t('none'),
                      s.ofFirst ? rateText(s.ofFirst, t, fmt) : t('none'),
                    ])}
                  />
                </figure>
              );
            })}
          </div>
        </div>
      )}
    </Section>
  );
}

// ── 6 Paths ────────────────────────────────────────────────────────────────

export function PathsSection({ result, def, ctx }: { result: AnalyticsResult<PathsResponse>; def: Definition; ctx: Ctx }) {
  const { t, fmt } = ctx;
  const title = t('paths.title');
  const failure = failed(result, 'wa-paths', title, t);
  if (failure || !result.ok) return failure;
  const d = result.data;
  const blocking = blockingText(def, t, fmt);
  const empty = blocking ?? emptyText(d.range, t, fmt);
  const groups = foldRows(d.groupPaths, (x) => x.visits, (x) => x.path === OTHER);
  const entryExit = foldRows(d.entryExit, (x) => x.visits, (x) => x.entry === OTHER);
  const transitions = foldRows(d.transitions, (x) => x.count, (x) => x.fromPath === OTHER);
  const intent = d.seenBeforeContacting.intentVisits;
  const seen: RankedRow[] = d.seenBeforeContacting.items.map((x, i) => {
    const small = x.visits > 0 && isSmall(x.visits);
    const r = rate(x.visits, intent);
    // The title states n; a "x of n" note would only repeat the count.
    return { key: `seen-${i}`, label: seenLabel(x.seen, t), value: x.visits, small, note: small || r.kind === 'fraction' ? undefined : rateText(r, t, fmt) };
  });
  const filtered = Object.keys(d.filters.applied).length > 0;
  return (
    <Section id="wa-paths" title={title} aside={<Ignored filters={d.filters} t={t} />}>
      {empty ? (
        <Note>{empty}</Note>
      ) : (
        <div style={{ display: 'grid', gap: '.9rem' }}>
          <DefinitionNote def={def} ctx={ctx} />
          {filtered && <Note>{t('paths.filtersScope')}</Note>}
          <div>
            <SubTitle>{t('paths.groupPaths')}</SubTitle>
            <TableWrap>
              <Head keys={['paths.path', 'paths.visits', 'paths.converting']} left={1} t={t} />
              <tbody>
                {groups.kept.length === 0 && groups.other === null && (
                  <tr>
                    <td style={tdStyle} colSpan={3}>
                      {t('paths.noRows')}
                    </td>
                  </tr>
                )}
                {groups.kept.map((x, i) => (
                  <tr key={`g-${i}`}>
                    <td style={tdStyle}>{groupPathText(x.path, t)}</td>
                    <td style={numTd}>{fmt.num(x.visits)}</td>
                    <td style={numTd}>
                      <Count n={x.convertingVisits} ctx={ctx} smallRule />
                    </td>
                  </tr>
                ))}
                <OtherRow n={groups.other} cols={3} ctx={ctx} />
              </tbody>
            </TableWrap>
          </div>
          <div style={grid(300)}>
            <div>
              <SubTitle>{t('paths.entryExit')}</SubTitle>
              <TableWrap>
                <Head keys={['paths.entry', 'paths.exit', 'paths.visits']} left={2} t={t} />
                <tbody>
                  {entryExit.kept.length === 0 && entryExit.other === null && (
                    <tr>
                      <td style={tdStyle} colSpan={3}>
                        {t('paths.noRows')}
                      </td>
                    </tr>
                  )}
                  {entryExit.kept.map((x, i) => (
                    <tr key={`e-${i}`}>
                      <td style={tdStyle}>{flowLabel(x.entry, t)}</td>
                      <td style={tdStyle}>{flowLabel(x.exit, t)}</td>
                      <td style={numTd}>{fmt.num(x.visits)}</td>
                    </tr>
                  ))}
                  <OtherRow n={entryExit.other} cols={3} ctx={ctx} />
                </tbody>
              </TableWrap>
            </div>
            <RankedBars
              title={t('paths.seenBefore', { n: fmt.num(intent) })}
              rows={seen}
              fmt={fmt}
              emptyText={t('paths.noRows')}
              small={smallTexts(t)}
            />
          </div>
          <div>
            <SubTitle>{t('paths.transitions')}</SubTitle>
            <TableWrap>
              <Head keys={['paths.from', 'paths.to', 'paths.count']} left={2} t={t} />
              <tbody>
                {transitions.kept.length === 0 && transitions.other === null && (
                  <tr>
                    <td style={tdStyle} colSpan={3}>
                      {t('paths.noRows')}
                    </td>
                  </tr>
                )}
                {transitions.kept.map((x, i) => (
                  <tr key={`t-${i}`}>
                    <td style={tdStyle}>{flowLabel(x.fromPath, t)}</td>
                    <td style={tdStyle}>{flowLabel(x.toPath, t)}</td>
                    <td style={numTd}>{fmt.num(x.count)}</td>
                  </tr>
                ))}
                <OtherRow n={transitions.other} cols={3} ctx={ctx} />
              </tbody>
            </TableWrap>
          </div>
        </div>
      )}
    </Section>
  );
}

// ── 7 Audience ─────────────────────────────────────────────────────────────

const isSmallCell = (n: number) => n > 0 && isSmall(n);
const smallTile = (n: number, ctx: Ctx) => (isSmallCell(n) ? ctx.t('lt3') : ctx.fmt.num(n));

function repeatSub(r: AudienceResponse['repeatOfferViewers'], def: Definition, t: Translate): string {
  if (r.value !== null) return basisLabel(r.basis, t);
  // M2: a clamped range has no 28-day or month basis; otherwise the range is not 28 days or a whole month.
  if (def.kind === 'clamped') return t('audience.repeatClamped');
  return r.basis === null ? t('audience.repeatBasis') : t('audience.repeatNoData');
}

export function AudienceSection({ result, def, ctx }: { result: AnalyticsResult<AudienceResponse>; def: Definition; ctx: Ctx }) {
  const { t, fmt } = ctx;
  const title = t('audience.title');
  const failure = failed(result, 'wa-audience', title, t);
  if (failure || !result.ok) return failure;
  const d = result.data;
  const blocking = blockingText(def, t, fmt);
  const empty = blocking ?? emptyText(d.range, t, fmt);
  const nv = d.newVsReturning;
  const total = nv.newVisits + nv.returningVisits;
  const small = smallTexts(t);
  const dims = d.dimensions;
  return (
    <Section id="wa-audience" title={title} aside={<Ignored filters={d.filters} t={t} />}>
      {empty ? (
        <Note>{empty}</Note>
      ) : (
        <div style={{ display: 'grid', gap: '.75rem' }}>
          <DefinitionNote def={def} ctx={ctx} />
          <div style={grid(170)}>
            {/* N3: 1–2 show "< 3" and no share, as in the visitor-type list (H1). */}
            <StatTile label={t('audience.new')} value={smallTile(nv.newVisits, ctx)} sub={isSmallCell(nv.newVisits) ? undefined : rateText(rate(nv.newVisits, total), t, fmt)} />
            <StatTile label={t('audience.returning')} value={smallTile(nv.returningVisits, ctx)} sub={isSmallCell(nv.returningVisits) ? undefined : rateText(rate(nv.returningVisits, total), t, fmt)} />
            <StatTile
              label={t('audience.repeatOffer')}
              value={d.repeatOfferViewers.value !== null ? fmt.num(d.repeatOfferViewers.value) : t('none')}
              sub={repeatSub(d.repeatOfferViewers, def, t)}
            />
          </div>
          <div style={grid(240)}>
            <RankedBars title={t('audience.deviceClass')} rows={fixedRows(d.deviceClass, deviceLabel, t, 'dev')} fmt={fmt} emptyText={t('audience.noRows')} small={small} />
            <RankedBars title={t('audience.entryLocale')} rows={fixedRows(d.entryLocale, localeLabel, t, 'loc')} fmt={fmt} emptyText={t('audience.noRows')} small={small} />
            <RankedBars title={t('audience.visitorType')} rows={fixedRows(dims.visitorType, visitorTypeLabel, t, 'vt')} fmt={fmt} emptyText={t('audience.noRows')} small={small} />
          </div>
          <div style={grid(240)}>
            <RankedBars title={t('audience.country')} rows={openRows(dims.country, rawLabel, ctx, 'cc')} fmt={fmt} emptyText={t('audience.noRows')} />
            <RankedBars title={t('audience.browser')} rows={openRows(dims.browserFamily, rawLabel, ctx, 'br')} fmt={fmt} emptyText={t('audience.noRows')} />
            <RankedBars title={t('audience.os')} rows={openRows(dims.osFamily, rawLabel, ctx, 'os')} fmt={fmt} emptyText={t('audience.noRows')} />
            <RankedBars title={t('audience.viewport')} rows={openRows(dims.viewport, rawLabel, ctx, 'vp')} fmt={fmt} emptyText={t('audience.noRows')} />
          </div>
        </div>
      )}
    </Section>
  );
}

// ── 8 Coverage and data quality ────────────────────────────────────────────

function bandText(daily: CoverageResponse['daily'], t: Translate): { text: string; excluded: number } {
  const b = coverageBand(daily);
  if (b.kind === 'small') return { text: t('coverage.bandSmall'), excluded: b.excludedDays };
  if (b.kind === 'atLeast100') return { text: t('coverage.bandFull'), excluded: b.excludedDays };
  return { text: t('coverage.band', { lo: b.lo, hi: b.hi }), excluded: b.excludedDays };
}

function DataQuality({ d, ctx }: { d: CoverageResponse; ctx: Ctx }) {
  const { t, fmt } = ctx;
  const q = d.dataQuality;
  const rows: [string, string, string][] = [
    ...Object.entries(q.edge).map(([reason, n]): [string, string, string] => [t('coverage.dqEdge'), reason, fmt.num(n)]),
    ...Object.entries(q.secondLine).map(([reason, n]): [string, string, string] => [t('coverage.dqSecondLine'), reason, fmt.num(n)]),
    [t('coverage.dqDuplicates'), '–', fmt.num(q.duplicates)],
    [t('coverage.dqCapped'), '–', q.cappedDays === null ? t('none') : fmt.num(q.cappedDays)],
  ];
  const caption = d.range.from && d.range.to ? t('coverage.dqTitleRange', { from: fmt.day(d.range.from), to: fmt.day(d.range.to) }) : t('coverage.dqTitle');
  return (
    <TableWrap caption={caption}>
      <Head keys={['coverage.dqStage', 'coverage.dqReason', 'coverage.dqEvents']} left={2} t={t} />
      <tbody>
        {rows.map(([stage, reason, n], i) => (
          <tr key={`dq-${i}`}>
            <td style={tdStyle}>{stage}</td>
            <td style={tdStyle}>{reason}</td>
            <td style={numTd}>{n}</td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

/** byPage: registry paths only (H2); others and rows with max(consented, Cloudflare) < 3 fold into "other (n)". */
function coveragePages(items: CoverageResponse['byPage']) {
  const kept: (CoverageResponse['byPage'][number] & { path: (typeof TRACKED_PATHS)[number] })[] = [];
  let other = 0;
  let folded = false;
  for (const p of items) {
    const known = p.path !== null && isTracked(p.path) ? TRACKED_PATHS.find((x) => x === p.path) : undefined;
    if (known && Math.max(p.consentedPageviews, p.cloudflareRequests) >= 3) kept.push({ ...p, path: known });
    else {
      other += Math.max(p.consentedPageviews, p.cloudflareRequests);
      folded = true;
    }
  }
  return { kept, other: folded ? other : null };
}

export function CoverageSection({ result, ctx }: { result: AnalyticsResult<CoverageResponse>; ctx: Ctx }) {
  const { t, fmt } = ctx;
  const title = t('coverage.title');
  const failure = failed(result, 'wa-coverage', title, t);
  if (failure || !result.ok) return failure;
  const d = result.data;
  const empty = emptyText(d.range, t, fmt);
  const base = d.baselineFrom;
  const r: Range = d.range;
  let state: ReactNode = null;
  if (empty) state = <Note>{empty}</Note>;
  else if (base === null) state = <Note>{t('coverage.preGoLive')}</Note>;
  else if (r.to !== null && base > r.to) state = <Note>{t('coverage.baselineAfter', { day: fmt.day(base) })}</Note>;
  const since = base !== null && r.from !== null ? (base > r.from ? base : r.from) : null;
  const band = state === null ? bandText(d.daily, t) : null;
  // N1: §8.6 buckets (daily ≤ 31 days, weekly, monthly); a bucket is sampled when any of its days is.
  const chart = bucketSeries(
    d.daily.map((x) => ({ ...x, sampledDays: x.sampled ? 1 : 0 })),
    ['consentedPageviews', 'cloudflareRequests', 'sampledDays'],
  );
  const pages = coveragePages(d.byPage);
  const x = Math.min(d.enquiries.consentedSubmits, d.enquiries.totalSubmits);
  return (
    <Section id="wa-coverage" title={title} aside={<Ignored filters={d.filters} t={t} />}>
      <div style={{ display: 'grid', gap: '.9rem' }}>
        {state ?? (
          <>
            {since && <Note>{t('coverage.since', { day: fmt.day(since) })}</Note>}
            <div style={grid(220)}>
              <StatTile label={t('coverage.bandLabel')} value={band!.text} sub={t('coverage.indicative')} />
              <StatTile
                label={t('coverage.enquiries')}
                value={t('fraction', { x: fmt.num(x), n: fmt.num(d.enquiries.totalSubmits) })}
                sub={t('coverage.enquiriesSub')}
              />
            </div>
            {band!.excluded > 0 && <Note>{t('coverage.excludedDays', { n: band!.excluded })}</Note>}
            <SideBySideColumns
              title={t('coverage.chart', { unit: t(chart.unit === 'day' ? 'glance.unitDay' : chart.unit === 'week' ? 'glance.unitWeek' : 'glance.unitMonth') })}
              days={chart.buckets.map((b) => ({
                day: b.start,
                subject: b.values.consentedPageviews,
                reference: b.values.cloudflareRequests,
                sampled: b.values.sampledDays > 0,
                partial: b.partial,
              }))}
              labels={{ subject: t('coverage.consented'), reference: t('coverage.cloudflare'), start: t('glance.start'), sampled: t('coverage.sampled'), partial: t('glance.partial') }}
              t={t}
              fmt={fmt}
            />
            <TableWrap caption={t('coverage.byPage')}>
              <Head keys={['coverage.page', 'coverage.locale', 'coverage.consented', 'coverage.cloudflare']} left={2} t={t} />
              <tbody>
                {pages.kept.length === 0 && pages.other === null && (
                  <tr>
                    <td style={tdStyle} colSpan={4}>
                      {t('pages.noRows')}
                    </td>
                  </tr>
                )}
                {pages.kept.map((p, i) => (
                  <tr key={`cp-${i}`}>
                    <td style={tdStyle}>{p.path}</td>
                    <td style={tdStyle}>{localeLabel(p.locale, t)}</td>
                    <td style={numTd}>{fmt.num(p.consentedPageviews)}</td>
                    <td style={numTd}>
                      {p.sampled ? `≈ ${fmt.num(p.cloudflareRequests)}` : fmt.num(p.cloudflareRequests)}
                    </td>
                  </tr>
                ))}
                <OtherRow n={pages.other} cols={4} ctx={ctx} />
              </tbody>
            </TableWrap>
            <Note>{t('coverage.sampledNote')}</Note>
          </>
        )}
        <DataQuality d={d} ctx={ctx} />
      </div>
    </Section>
  );
}

// ── Drilldown: previous / next pages ───────────────────────────────────────

export function PageFlow({ result, def, ctx }: { result: AnalyticsResult<PageDetailResponse>; def: Definition; ctx: Ctx }) {
  const { t, fmt } = ctx;
  if (!result.ok) return null;
  const blocking = blockingText(def, t, fmt);
  if (blocking) return <Note>{blocking}</Note>;
  const { previous, next } = result.data;
  if (previous === null || next === null) return <Note>{t('flow.unavailable')}</Note>;
  const list = (items: { path: string | null; count: number }[], prefix: string): RankedRow[] => {
    const f = foldRows(items, (x) => x.count, (x) => x.path === OTHER);
    return [
      ...f.kept.map((x, i) => ({ key: `${prefix}-${i}`, label: flowLabel(x.path, t), value: x.count })),
      ...(f.other !== null ? [{ key: `${prefix}-other`, label: t('other', { n: fmt.num(f.other) }), value: f.other }] : []),
    ];
  };
  return (
    <div style={{ display: 'grid', gap: '.5rem' }}>
      <DefinitionNote def={def} ctx={ctx} />
      <div style={grid(240)}>
        <RankedBars title={t('flow.previous')} rows={list(previous, 'prev')} fmt={fmt} emptyText={t('flow.noRows')} />
        <RankedBars title={t('flow.next')} rows={list(next, 'next')} fmt={fmt} emptyText={t('flow.noRows')} />
      </div>
    </div>
  );
}
