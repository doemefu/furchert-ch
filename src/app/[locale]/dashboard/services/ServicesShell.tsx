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
} from '@/lib/metrics/serviceHealth';
import { LOCALE_TAG } from '../datetime';
import { StripToggle } from './StripToggle';

type Translate = Awaited<ReturnType<typeof getTranslations>>;

const HOUR_MS = 3_600_000;
const GROUP_ORDER: MetricGroup[] = ['availability', 'restarts', 'cpu', 'mem'];

// Bar colours (UI layer). Green is rendered at opacity .85; no data is a
// neutral grey, never a status colour.
const BUCKET_COLOR: Record<BucketStatus, string> = {
  green: 'var(--status-online)',
  amber: 'var(--status-wip)',
  red: 'var(--status-offline)',
  nodata: 'var(--n-20)',
};
const BUCKET_ORDER: BucketStatus[] = ['green', 'amber', 'red', 'nodata'];

function bucketOpacity(status: BucketStatus): number {
  return status === 'green' ? 0.85 : 1;
}

// ── Styles (DashboardShell / NetworkShell idioms) ──────────────────────────

const monoKicker: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '.8125rem',
  letterSpacing: '.06em',
  textTransform: 'uppercase',
  color: 'var(--n-50)',
};

const privatePillStyle: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '.68rem',
  letterSpacing: '.04em',
  textTransform: 'uppercase',
  padding: '.15rem .5rem',
  background: 'var(--blue-wash)',
  border: '1px solid rgba(14,60,166,.2)',
  borderRadius: '2px',
  color: 'var(--blue-base)',
};

const noteStyle: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '.68rem',
  letterSpacing: '.03em',
  color: 'var(--n-50)',
  marginBottom: '.75rem',
};

const microLabel: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '.6rem',
  letterSpacing: '.06em',
  textTransform: 'uppercase',
  color: 'var(--n-40)',
  marginBottom: '.2rem',
};

const smallMono: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '.65rem',
  letterSpacing: '.02em',
  color: 'var(--n-60)',
  overflowWrap: 'anywhere',
};

const pillStyle: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '.65rem',
  letterSpacing: '.04em',
  textTransform: 'uppercase',
  padding: '.1rem .4rem',
  border: '1px solid rgba(162,167,176,.3)',
  borderRadius: '2px',
  color: 'var(--n-50)',
  whiteSpace: 'nowrap',
};

const rowStyle: CSSProperties = {
  padding: '1rem',
  background: 'var(--white)',
  border: '1px solid rgba(162,167,176,.22)',
  borderRadius: '2px',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '1rem 1.5rem',
  alignItems: 'flex-start',
  minWidth: 0,
};

// ── Formatters ─────────────────────────────────────────────────────────────

interface Formatters {
  tag: string;
  day: (ms: number) => string;
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
  const timeFmt = new Intl.DateTimeFormat(tag, { hour: '2-digit', minute: '2-digit', timeZone: SERVICE_HEALTH_TZ });
  const intFmt = new Intl.NumberFormat(tag);
  return {
    tag,
    day: (ms) => dayFmt.format(ms),
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

function Bar({ status, title, width, height }: { status: BucketStatus; title: string; width: number; height: number }) {
  return (
    <span
      role="img"
      aria-label={title}
      title={title}
      style={{
        display: 'block',
        flex: `0 0 ${width}px`,
        width,
        height,
        borderRadius: 1,
        background: BUCKET_COLOR[status],
        opacity: bucketOpacity(status),
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
            background: 'var(--blue-base)',
            borderRadius: '2px',
            transition: 'width 1s ease',
          }}
        />
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: '.65rem', color: 'var(--n-60)', marginTop: '.15rem' }}>
        {displayLabel}
      </div>
    </div>
  );
}

function HourlyStrip({ svc, fmt, t }: { svc: ServiceHealth; fmt: Formatters; t: Translate }) {
  const first = svc.hourly[0];
  const last = svc.hourly[svc.hourly.length - 1];
  return (
    <div>
      <div style={microLabel}>{t('last24h')}</div>
      {/* inline-block, so the start/end times sit under the strip ends */}
      <div style={{ display: 'inline-block', maxWidth: '100%' }}>
        <div role="group" aria-label={t('hourlyAria', { name: svc.name })} style={{ display: 'flex', gap: 2 }}>
          {svc.hourly.map((h) => (
            <Bar key={h.startMs} status={h.status} title={hourTitle(h, fmt, t)} width={6} height={8} />
          ))}
        </div>
        {first && last && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: 'var(--mono)',
              fontSize: '.6rem',
              color: 'var(--n-40)',
              marginTop: '.15rem',
            }}
          >
            <span>{fmt.time(first.startMs)}</span>
            <span>{fmt.time(last.startMs + HOUR_MS)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ServiceRow({ svc, windowHours, fmt, t }: { svc: ServiceHealth; windowHours: number; fmt: Formatters; t: Translate }) {
  const past = svc.daily.slice(0, -1);
  const today = svc.daily[svc.daily.length - 1];
  const todayTitle = today ? dayTitle(today, fmt, t) : t('noData');
  const todayStatus: BucketStatus = today ? today.status : 'nodata';
  // Kind is part of the id: a Deployment and a StatefulSet may share a name.
  const panelId = `svc-${svc.namespace}-${svc.kind.toLowerCase()}-${svc.name}-24h`;

  const hoursWithData24h = svc.hourly.filter((h) => h.availability !== null).length;
  const pct = (a: number | null) => (a === null ? '—' : formatAvailability(a, fmt.tag));
  const num = (n: number | null) => (n === null ? '—' : fmt.int(n));
  const cov24 = hoursWithData24h < HOURS_SHOWN ? t('coverage', { hours: hoursWithData24h }) : undefined;
  const cov14 = svc.hoursWithData14d < windowHours ? t('coverage', { hours: svc.hoursWithData14d }) : undefined;

  return (
    <li style={rowStyle}>
      {/* Identity */}
      <div style={{ flex: '1 1 11rem', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap', marginBottom: '.25rem' }}>
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '.75rem',
              fontWeight: 500,
              letterSpacing: '.04em',
              color: 'var(--n-100)',
              overflowWrap: 'anywhere',
            }}
          >
            {svc.name}
          </span>
          <span style={pillStyle}>{svc.kind}</span>
          {svc.desiredReplicas === 0 && <span style={pillStyle}>{t('scaledToZero')}</span>}
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '.65rem', letterSpacing: '.03em', color: 'var(--n-50)' }}>
          {svc.namespace}
        </div>
      </div>

      {/* Usage */}
      <div style={{ flex: '1 1 12rem', minWidth: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
        <Meter label={t('cpu')} usage={svc.cpu} fmt={fmt} t={t} />
        <Meter label={t('mem')} usage={svc.mem} fmt={fmt} t={t} />
      </div>

      {/* Strips: 13 past days + today (the toggle), hourly panel below.
          Not squeezed below the hourly strip's 190px. */}
      <div style={{ flex: '0 1 auto', minWidth: '12.5rem' }}>
        <div style={microLabel}>{t('daily')}</div>
        <StripToggle
          id={panelId}
          label={`${t('toggleLabel', { name: svc.name })} · ${todayTitle}`}
          todayColor={BUCKET_COLOR[todayStatus]}
          todayOpacity={bucketOpacity(todayStatus)}
          todayTitle={todayTitle}
          pastBars={
            <div role="group" aria-label={t('dailyAria', { name: svc.name })} style={{ display: 'flex', gap: 3 }}>
              {past.map((d) => (
                <Bar key={d.date} status={d.status} title={dayTitle(d, fmt, t)} width={7} height={12} />
              ))}
            </div>
          }
          hourly={<HourlyStrip svc={svc} fmt={fmt} t={t} />}
        />
      </div>

      {/* Numbers */}
      <div style={{ flex: '1 1 10rem', minWidth: 0, display: 'grid', gap: '.4rem' }}>
        <div>
          <div style={microLabel}>{t('availability')}</div>
          <div style={smallMono}>
            <span title={cov24}>
              {t('span24h')} {pct(svc.availability24h)}
            </span>
            {' · '}
            <span title={cov14}>
              {t('span14d')} {pct(svc.availability14d)}
            </span>
          </div>
        </div>
        <div>
          <div style={microLabel}>{t('restarts')}</div>
          <div style={smallMono}>
            {t('span24h')} {num(svc.restarts24h)} · {t('span14d')} {num(svc.restarts14d)}
          </div>
        </div>
      </div>
    </li>
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
        fontSize: '.65rem',
        letterSpacing: '.03em',
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
              background: BUCKET_COLOR[s],
              opacity: bucketOpacity(s),
            }}
          />
          {t(`legend.${s}`)}
        </span>
      ))}
    </div>
  );
}

export async function ServicesShell({ locale }: { locale: Locale }) {
  const t = await getTranslations('dashboard.services');
  const fmt = makeFormatters(locale);
  const now = new Date();
  const report = await getServiceHealth(now);

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
        {!report.available.restarts && <p style={noteStyle}>{t('restartsUnknownColours')}</p>}
        {report.services.length === 0 ? (
          <p style={noteStyle}>{t('empty')}</p>
        ) : (
          <>
            <Legend t={t} />
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '.5rem', minWidth: 0 }}>
              {report.services.map((svc) => (
                <ServiceRow
                  key={`${svc.namespace}/${svc.kind}/${svc.name}`}
                  svc={svc}
                  windowHours={report.window.hours}
                  fmt={fmt}
                  t={t}
                />
              ))}
            </ul>
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
            <p style={{ fontSize: '.9rem', color: 'var(--n-60)', lineHeight: 1.5, maxWidth: '44rem' }}>{t('subtitle')}</p>
          </div>
          <p style={{ fontFamily: 'var(--mono)', fontSize: '.65rem', letterSpacing: '.03em', color: 'var(--n-50)' }}>
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
