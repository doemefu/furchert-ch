// Service utilization + availability shell (#47). Async Server Component,
// rendered only after page.tsx's ADMIN check: queries Prometheus via
// `getServiceHealth()` at request time and renders plain HTML. Header bar
// copied from NetworkShell, meters from the DashboardShell node cards. The
// only client JS is the today-bar toggle in ./StripToggle.tsx; all number and
// date formatting happens here (Intl with the locale tag, Europe/Zurich).
//
// Nothing is fabricated: a missing report shows the unavailable notice, a
// failed query group shows "—" / grey bars plus one partial notice.
import type { CSSProperties, ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { getServiceHealth } from '@/lib/metrics/services';
import {
  DAY_GRID,
  HOURS_SHOWN,
  SERVICE_HEALTH_TZ,
  formatAvailability,
  formatUsage,
  type BucketStatus,
  type DailyAvailability,
  type HourlyAvailability,
  type MetricGroup,
  type ResourceUsage,
  type ServiceHealth,
  type ServiceHealthReport,
} from '@/lib/metrics/serviceHealth';
import { LOCALE_TAG } from '../datetime';
import { BUCKET_ORDER, bucketStyle } from './buckets';
import { StripToggle } from './StripToggle';

type Translate = Awaited<ReturnType<typeof getTranslations>>;

const HOUR_MS = 3_600_000;
const GROUP_ORDER: MetricGroup[] = ['availability', 'restarts', 'cpu', 'mem'];

// ── Styles (DashboardShell / NetworkShell idioms) ──────────────────────────

const monoKicker: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 'var(--fs-13)',
  letterSpacing: '.04em',
  textTransform: 'uppercase',
  color: 'var(--n-60)',
};

const privatePillStyle: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 'var(--fs-12)',
  letterSpacing: '.05em',
  textTransform: 'uppercase',
  padding: '.15rem .5rem',
  background: 'var(--blue-wash)',
  border: '1px solid rgba(14,60,166,.2)',
  borderRadius: '2px',
  color: 'var(--blue-base)',
};

const noteStyle: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 'var(--fs-12)',
  letterSpacing: 0,
  color: 'var(--n-60)',
  marginBottom: '.75rem',
};

const microLabel: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 'var(--fs-12)',
  letterSpacing: '.05em',
  textTransform: 'uppercase',
  color: 'var(--n-60)',
  marginBottom: '.2rem',
};

const smallMono: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 'var(--fs-12)',
  letterSpacing: 0,
  color: 'var(--n-60)',
  overflowWrap: 'anywhere',
};

const pillStyle: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 'var(--fs-12)',
  letterSpacing: '.05em',
  textTransform: 'uppercase',
  padding: '.1rem .4rem',
  border: '1px solid rgba(162,167,176,.3)',
  borderRadius: '2px',
  color: 'var(--n-60)',
  whiteSpace: 'nowrap',
};

// ── Formatters ─────────────────────────────────────────────────────────────

interface Formatters {
  tag: string;
  day: (ms: number) => string;
  dayNum: (ms: number) => string;
  time: (ms: number) => string;
  int: (n: number) => string;
}

function makeFormatters(locale: Locale): Formatters {
  const tag = LOCALE_TAG[locale];
  const dayFmt = new Intl.DateTimeFormat(tag, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: SERVICE_HEALTH_TZ,
  });
  const dayNumFmt = new Intl.DateTimeFormat(tag, { day: '2-digit', timeZone: SERVICE_HEALTH_TZ });
  const timeFmt = new Intl.DateTimeFormat(tag, { hour: '2-digit', minute: '2-digit', timeZone: SERVICE_HEALTH_TZ });
  const intFmt = new Intl.NumberFormat(tag);
  return {
    tag,
    day: (ms) => dayFmt.format(ms),
    dayNum: (ms) => dayNumFmt.format(ms),
    time: (ms) => timeFmt.format(ms),
    int: (n) => intFmt.format(n),
  };
}

// ── Tooltips ───────────────────────────────────────────────────────────────

// The restarts part is omitted when there is no availability data.
function bucketParts(availability: number | null, restarts: number | null, fmt: Formatters, t: Translate): string[] {
  if (availability === null) return [t('noData')];
  return [
    formatAvailability(availability, fmt.tag),
    restarts === null ? t('restartsUnknown') : t('restartsCount', { count: restarts }),
  ];
}

function dayTitle(day: DailyAvailability, fmt: Formatters, t: Translate): string {
  const parts = [day.isToday ? `${fmt.day(day.startMs)} ${t('today')}` : fmt.day(day.startMs)];
  parts.push(...bucketParts(day.availability, day.restarts, fmt, t));
  if (day.hoursWithData > 0 && day.hoursWithData < day.hoursExpected) {
    parts.push(t('dayPartial', { hours: day.hoursWithData, expected: day.hoursExpected }));
  }
  return parts.join(' · ');
}

function hourTitle(hour: HourlyAvailability, fmt: Formatters, t: Translate): string {
  const span = `${fmt.time(hour.startMs)}–${fmt.time(hour.startMs + HOUR_MS)}`;
  const parts = [hour.ongoing ? `${span} ${t('ongoing')}` : span];
  parts.push(...bucketParts(hour.availability, hour.restarts, fmt, t));
  return parts.join(' · ');
}

// ── Building blocks ────────────────────────────────────────────────────────

// Fixed `width` for the hourly strip; without it the bar fills its grid column.
function Bar({ status, title, width, height }: { status: BucketStatus; title: string; width?: number; height?: number }) {
  return (
    <span
      role="img"
      aria-label={title}
      title={title}
      style={{
        display: 'block',
        flex: width ? `0 0 ${width}px` : undefined,
        // Day bars keep the original slim look (7×12) and sit centred in
        // their matrix column, so the columns still line up with the header.
        width: width ?? 7,
        height: height ?? 12,
        justifySelf: 'center',
        alignSelf: 'center',
        borderRadius: 1,
        ...bucketStyle(status),
      }}
    />
  );
}

// Copy of the DashboardShell node-card meter (label, 4px track, value).
function Meter({ label, usage, fmt, t }: { label: string; usage: ResourceUsage | null; fmt: Formatters; t: Translate }) {
  // Same guard as the node bars: no value → explicit '0%' fill and "—".
  const value = usage ? formatUsage(usage.ratio, fmt.tag) : null;
  const displayLabel = usage && value ? (usage.basis === 'request' ? `${value} ${t('requestMarker')}` : value) : '—';
  const fillWidth = usage ? `${Math.min(100, Math.max(0, usage.ratio * 100))}%` : '0%';
  const title = usage
    ? t('usageTitle', { container: usage.container, value: value ?? '', basis: t(`basis.${usage.basis}`) })
    : t('usageNone');
  return (
    <div title={title} style={{ minWidth: 0 }}>
      <div style={microLabel}>{label}</div>
      <div style={{ height: 4, background: 'var(--n-20)', borderRadius: '2px', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: fillWidth,
            background: 'var(--n-50)',
            borderRadius: '2px',
          }}
        />
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--fs-12)', color: 'var(--n-60)', marginTop: '.15rem' }}>
        {displayLabel}
      </div>
    </div>
  );
}

function HourlyStrip({
  svc,
  generatedAtMs,
  fmt,
  t,
}: {
  svc: ServiceHealth;
  generatedAtMs: number;
  fmt: Formatters;
  t: Translate;
}) {
  const first = svc.hourly[0];
  return (
    <div>
      <div style={microLabel}>{t('last24h')}</div>
      {/* inline-block, so the start/end times sit under the strip ends */}
      <div style={{ display: 'inline-block', maxWidth: '100%' }}>
        <div role="group" aria-label={t('hourlyAria', { name: svc.name })} style={{ display: 'flex', gap: 2 }}>
          {svc.hourly.map((h) => (
            <Bar key={h.startMs} status={h.status} title={hourTitle(h, fmt, t)} width={8} height={12} />
          ))}
        </div>
        {first && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: 'var(--mono)',
              fontSize: 'var(--fs-12)',
              color: 'var(--n-60)',
              marginTop: '.15rem',
            }}
          >
            <span>{fmt.time(first.startMs)}</span>
            {/* "now", not the end of the ongoing hour (which is in the future) */}
            <span>{fmt.time(generatedAtMs)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ServiceRow({
  svc,
  windowHours,
  generatedAtMs,
  fmt,
  t,
}: {
  svc: ServiceHealth;
  windowHours: number;
  generatedAtMs: number;
  fmt: Formatters;
  t: Translate;
}) {
  const past = svc.daily.slice(0, -1);
  const today = svc.daily[svc.daily.length - 1];
  const todayTitle = today ? dayTitle(today, fmt, t) : t('noData');
  const todayStatus: BucketStatus = today ? today.status : 'nodata';
  // Kind is part of the id: a Deployment and a StatefulSet may share a name.
  const panelId = `svc-${svc.namespace}-${svc.kind.toLowerCase()}-${svc.name}-24h`;

  const hoursWithData24h = svc.hourly.filter((h) => h.availability !== null).length;
  const pct = (a: number | null) => (a === null ? '—' : formatAvailability(a, fmt.tag));
  const num = (n: number | null) => (n === null ? '—' : fmt.int(n));
  // Coverage hints only accompany a value; "—" needs no "based on 0 h".
  const cov24 =
    svc.availability24h !== null && hoursWithData24h < HOURS_SHOWN
      ? t('coverage', { hours: hoursWithData24h })
      : undefined;
  const cov14 =
    svc.availability14d !== null && svc.hoursWithData14d < windowHours
      ? t('coverage', { hours: svc.hoursWithData14d })
      : undefined;

  const mlabel = (text: string) => <span className="svc-mlabel">{text}</span>;

  // The cells are direct children of the grid row (areas in globals.css).
  return (
    <li className="svc-row">
      {/* Identity */}
      <div style={{ gridArea: 'name', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap', marginBottom: '.25rem' }}>
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 'var(--fs-12)',
              fontWeight: 500,
              letterSpacing: 0,
              color: 'var(--n-100)',
              overflowWrap: 'anywhere',
            }}
          >
            {svc.name}
          </span>
          <span style={pillStyle}>{svc.kind}</span>
          {svc.desiredReplicas === 0 && <span style={pillStyle}>{t('scaledToZero')}</span>}
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--fs-12)', letterSpacing: 0, color: 'var(--n-60)' }}>
          {svc.namespace}
        </div>
      </div>

      {/* 13 past days + today (the toggle); the hourly panel spans the row. */}
      <StripToggle
        id={panelId}
        groupLabel={t('dailyAria', { name: svc.name })}
        label={`${t('toggleLabel', { name: svc.name })} · ${todayTitle}`}
        todayStyle={bucketStyle(todayStatus)}
        todayTitle={todayTitle}
        pastBars={past.map((d) => (
          <Bar key={d.date} status={d.status} title={dayTitle(d, fmt, t)} />
        ))}
        hourly={<HourlyStrip svc={svc} generatedAtMs={generatedAtMs} fmt={fmt} t={t} />}
      />

      {/* Numbers */}
      <div className="svc-num" style={{ ...smallMono, gridArea: 'a24' }}>
        {mlabel(`${t('availability')} ${t('span24h')}`)}
        <span title={cov24}>{pct(svc.availability24h)}</span>
      </div>
      <div className="svc-num" style={{ ...smallMono, gridArea: 'a14' }}>
        {mlabel(`${t('availability')} ${t('span14d')}`)}
        <span title={cov14}>{pct(svc.availability14d)}</span>
      </div>
      <div className="svc-num" style={{ ...smallMono, gridArea: 'rst' }}>
        {mlabel(`${t('restarts')} ${t('span24h')} · ${t('span14d')}`)}
        {num(svc.restarts24h)} · {num(svc.restarts14d)}
      </div>

      {/* Usage */}
      <div style={{ gridArea: 'use', minWidth: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
        <Meter label={t('cpu')} usage={svc.cpu} fmt={fmt} t={t} />
        <Meter label={t('mem')} usage={svc.mem} fmt={fmt} t={t} />
      </div>
    </li>
  );
}

// Column header of the matrix: the same `.svc-row` grid (and padding / border
// box) as the rows, so the columns line up; hidden below 64rem, where each
// cell carries its own label. The day labels come from the first workload.
function MatrixHeader({ days, fmt, t }: { days: DailyAvailability[]; fmt: Formatters; t: Translate }) {
  return (
    <div className="svc-row svc-head" aria-hidden="true">
      <div style={{ ...microLabel, gridArea: 'name', marginBottom: 0 }}>{t('workload')}</div>
      <div style={{ gridArea: 'days', display: 'grid', gridTemplateColumns: DAY_GRID, gap: 2 }}>
        {days.map((d) => (
          <span
            key={d.date}
            title={fmt.day(d.startMs)}
            style={{
              ...microLabel,
              marginBottom: 0,
              textAlign: 'center',
              letterSpacing: 0,
              color: d.isToday ? 'var(--blue-base)' : 'var(--n-60)',
            }}
          >
            {fmt.dayNum(d.startMs)}
          </span>
        ))}
      </div>
      <div style={{ ...microLabel, gridArea: 'a24', marginBottom: 0, textAlign: 'right' }} title={t('availability')}>
        {t('span24h')}
      </div>
      <div style={{ ...microLabel, gridArea: 'a14', marginBottom: 0, textAlign: 'right' }} title={t('availability')}>
        {t('span14d')}
      </div>
      <div style={{ ...microLabel, gridArea: 'rst', marginBottom: 0, textAlign: 'right' }}>{t('restarts')}</div>
      <div style={{ ...microLabel, gridArea: 'use', marginBottom: 0 }}>
        {t('cpu')} / {t('mem')}
      </div>
    </div>
  );
}

function Legend({ t }: { t: Translate }) {
  return (
    <div
      role="group"
      aria-label={t('legend.title')}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '.5rem 1.25rem',
        fontFamily: 'var(--mono)',
        fontSize: 'var(--fs-12)',
        letterSpacing: 0,
        color: 'var(--n-60)',
        marginBottom: '1rem',
      }}
    >
      {BUCKET_ORDER.map((s) => (
        <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem' }}>
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: 1,
              ...bucketStyle(s),
            }}
          />
          {t(`legend.${s}`)}
        </span>
      ))}
      <span>{t('legend.todayHint')}</span>
    </div>
  );
}

export async function ServicesShell({ locale }: { locale: Locale }) {
  const t = await getTranslations('dashboard.services');
  const fmt = makeFormatters(locale);
  const now = new Date();
  // getServiceHealth degrades to null itself; an unexpected throw is treated
  // the same way, so the page still renders the unavailable notice.
  let report: ServiceHealthReport | null = null;
  try {
    report = await getServiceHealth(now);
  } catch (err) {
    const name = err instanceof Error ? err.name : 'unknown';
    console.warn(`[metrics] Prometheus unavailable: service health failed (${name})`);
  }

  const failed = report ? GROUP_ORDER.filter((g) => !report.available[g]) : [];
  const time = fmt.time(report ? report.generatedAtMs : now.getTime());

  let body: ReactNode;
  if (!report) {
    body = <p style={noteStyle}>{t('unavailable')}</p>;
  } else {
    body = (
      <>
        {failed.length > 0 && (
          <p style={noteStyle}>{t('partial', { groups: failed.map((g) => t(`groups.${g}`)).join(', ') })}</p>
        )}
        {/* Also when only some rows lack restarts data: their colours then
            reflect availability only, which the legend alone would hide. */}
        {(!report.available.restarts || report.services.some((s) => s.restarts14d === null && s.hoursWithData14d > 0)) && (
          <p style={noteStyle}>{t('restartsUnknownColours')}</p>
        )}
        {report.services.length === 0 ? (
          <p style={noteStyle}>{t('empty')}</p>
        ) : (
          <>
            <Legend t={t} />
            <div style={{ paddingInline: '.75rem' }}>
            <MatrixHeader days={report.services[0].daily} fmt={fmt} t={t} />
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '.5rem', minWidth: 0 }}>
              {report.services.map((svc) => (
                <ServiceRow
                  key={`${svc.namespace}/${svc.kind}/${svc.name}`}
                  svc={svc}
                  windowHours={report.window.hours}
                  generatedAtMs={report.generatedAtMs}
                  fmt={fmt}
                  t={t}
                />
              ))}
            </ul>
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <div style={{ background: 'var(--n-10)' }}>
      {/* Header bar */}
      <div style={{ borderBottom: '1px solid rgba(162,167,176,.22)', background: 'var(--white)' }}>
        <div
          className="container border-x"
          style={{ padding: '1.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '.25rem' }}>
              <h1 style={{ ...monoKicker, fontWeight: 400 }}>{t('kicker')}</h1>
              <span style={privatePillStyle}>{t('adminOnly')}</span>
            </div>
            <p style={{ fontSize: 'var(--fs-14)', color: 'var(--n-60)', lineHeight: 1.5, maxWidth: '44rem' }}>{t('subtitle')}</p>
          </div>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 'var(--fs-12)', letterSpacing: 0, color: 'var(--n-60)' }}>
            {t('meta', { time })}
          </p>
        </div>
      </div>

      <div className="container border-x">
        <div style={{ padding: '1.5rem 0', minWidth: 0 }}>{body}</div>
      </div>
    </div>
  );
}
