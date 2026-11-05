// /[locale]/dashboard/devices — ADMIN-only device-service admin GUI (#45,
// Epic #43), slice 1: device state + manual control, schedules CRUD.
// Same structure as /dashboard/auth (the device-admin prototype bundle is not
// available, so the auth admin GUI is the visual reference).
// Gate order: OIDC env assertion → session (else SignInGate) → ADMIN role
// (else NoAccess) → a usable access token (else ReauthNotice). Only then is
// device-service called, with the admin's own token, server-side. Mutations
// are Server Actions (`actions.ts`) that repeat every check. Every time,
// age and number is formatted here (Europe/Zurich), so the client panels
// render without clock- or locale-dependent work during hydration.
import type { Metadata } from 'next';
import type { Session } from 'next-auth';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { isLocale, type Locale } from '@/i18n/routing';
import { auth } from '@/auth';
import { asRole } from '@/auth.config';
import { assertAuthEnv } from '@/auth.env';
import { Icon } from '@/components/ui/Icon';
import { shouldAttemptDeviceAdmin } from '@/deviceadmin.env';
import { getAdminAccessToken } from '@/lib/authadmin/accessToken';
import {
  getHealth,
  listDevices,
  listSchedules,
  type DeviceAdminResult,
  type DeviceState,
  type Schedule,
} from '@/lib/deviceadmin/client';
import { describeCron } from '@/lib/deviceadmin/cron';
import { DEVICE_FIELDS, freshness, isDeviceField, parseServiceTime, switchState } from '@/lib/deviceadmin/fields';
import { SignInGate } from '../SignInGate';
import { DevSubnav } from '../Subnav';
import { NoAccess } from '../NoAccess';
import { LOCALE_TAG } from '../datetime';
import { ReauthNotice } from '../auth/ReauthNotice';
import { BORDER, Pill } from '../auth/ui';
import { DeviceOverview, type DeviceSummary, type ScheduleSummary, type Section } from './DeviceOverview';
import { DeviceTabs, parseTab, type DeviceTab } from './DeviceTabs';
import { DevicesPanel, type DeviceRow } from './DevicesPanel';
import { FailureNotice } from './FailureNotice';
import { SchedulesPanel, type ScheduleRow } from './SchedulesPanel';
import { makeFormatters, type Formatters } from './format';
import { DEVICE_PUBLIC_URL, DEVICE_REPO_URL } from './links';

// Reads the session (cookies) and live data → must be dynamic.
export const dynamic = 'force-dynamic';

const RETURN_PATH = '/dashboard/devices';
const REAUTH_NS = 'dashboard.deviceAdmin.reauth';
const UPCOMING = 5;

type SearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return { robots: { index: false, follow: false } };
  const t = await getTranslations({ locale, namespace: 'dashboard.deviceAdmin' });
  return { title: `${t('title')} — furchert.ch`, robots: { index: false, follow: false } };
}

async function Header({ healthStatus }: { healthStatus: string | null }) {
  const t = await getTranslations('dashboard.deviceAdmin');
  const linkStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '.4rem',
    fontFamily: 'var(--mono)',
    fontSize: '.7rem',
    letterSpacing: '.04em',
    textTransform: 'uppercase' as const,
    textDecoration: 'none',
    color: 'var(--n-60)',
    border: '1px solid rgba(162,167,176,.3)',
    borderRadius: '2px',
    padding: '.4rem .75rem',
  };
  return (
    <div style={{ borderBottom: BORDER, background: 'var(--white)' }}>
      <div
        className="container border-x"
        style={{ padding: '1.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: 'var(--sans)', fontSize: '1.6rem', fontWeight: 500, letterSpacing: '-.02em', color: 'var(--n-100)' }}>
              {t('title')}
            </h1>
            <Pill tone="info">ADMIN</Pill>
            {healthStatus === null ? (
              <Pill tone="mute">{t('statusUnknown')}</Pill>
            ) : (
              <Pill tone={healthStatus === 'UP' ? 'ok' : 'err'}>{healthStatus === 'UP' ? t('statusUp') : t('statusDown')}</Pill>
            )}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '.72rem', color: 'var(--n-50)', marginTop: '.35rem' }}>{t('meta')}</div>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <a href={DEVICE_REPO_URL} target="_blank" rel="noopener noreferrer" style={linkStyle}>
            <Icon name="github" size={12} /> {t('repo')}
          </a>
          <a href={`${DEVICE_PUBLIC_URL}/actuator/health`} target="_blank" rel="noopener noreferrer" style={linkStyle}>
            {t('health')} <Icon name="ext" size={10} />
          </a>
        </div>
      </div>
    </div>
  );
}

function Frame({ healthStatus, tab, children }: { healthStatus: string | null; tab: DeviceTab; children: ReactNode }) {
  return (
    <div style={{ minHeight: '100svh', background: 'var(--n-10)' }}>
      <DevSubnav active="devices" />
      <Header healthStatus={healthStatus} />
      <div className="container border-x">
        <DeviceTabs tab={tab} />
        <div style={{ padding: '1.75rem 0 3rem' }}>{children}</div>
      </div>
    </div>
  );
}

// One timestamp per request: every age and relative label on the page is
// computed against it, and the client panels receive it as `nowMs`. (A Server
// Component renders once per request, so reading the clock here is safe.)
function requestClock(locale: Locale): { nowMs: number; fmt: Formatters } {
  const nowMs = Date.now();
  return { nowMs, fmt: makeFormatters(locale, nowMs) };
}

const unreachable = { ok: false, kind: 'unavailable' } as const;
async function settle<T>(p: Promise<DeviceAdminResult<T>>): Promise<DeviceAdminResult<T>> {
  try {
    return await p;
  } catch {
    return unreachable;
  }
}

function toDeviceRows(devices: DeviceState[], locale: Locale, fmt: Formatters, nowMs: number): DeviceRow[] {
  const tag = LOCALE_TAG[locale];
  const one = new Intl.NumberFormat(tag, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return [...devices]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((d) => {
      const seen = parseServiceTime(d.lastSeen);
      return {
        id: d.id,
        name: d.name,
        freshness: freshness(d.mqttOnline, seen, nowMs),
        lastSeenAbs: seen === null ? null : fmt.abs(seen),
        // A clock slightly ahead of ours must not read "in 5 seconds".
        lastSeenRel: seen === null ? null : fmt.rel(Math.min(seen, nowMs)),
        temperatureLabel: d.temperature === null ? null : `${one.format(d.temperature)} °C`,
        humidityLabel: d.humidity === null ? null : `${one.format(d.humidity)} %`,
        switches: DEVICE_FIELDS.map((field) => ({ field, state: switchState(d[field]) })),
      };
    });
}

function summarizeDevices(rows: DeviceRow[], devices: DeviceState[], fmt: Formatters, nowMs: number): DeviceSummary {
  let latest: { device: string; ms: number } | null = null;
  for (const d of devices) {
    const ms = parseServiceTime(d.lastSeen);
    if (ms !== null && (!latest || ms > latest.ms)) latest = { device: d.name, ms };
  }
  return {
    total: rows.length,
    live: rows.filter((r) => r.freshness === 'live').length,
    stale: rows.filter((r) => r.freshness === 'stale').length,
    offline: rows.filter((r) => r.freshness === 'offline' || r.freshness === 'never').length,
    latest: latest ? { device: latest.device, abs: fmt.abs(latest.ms), rel: fmt.rel(Math.min(latest.ms, nowMs)) } : null,
  };
}

function toScheduleRows(schedules: Schedule[], fmt: Formatters, nowMs: number): ScheduleRow[] {
  return schedules.map((s) => {
    const next = parseServiceTime(s.nextRun);
    return {
      id: s.id,
      deviceName: s.deviceName,
      field: s.field,
      state: s.state,
      payload: s.payload,
      cronExpression: s.cronExpression,
      active: s.active,
      nextRunAbs: next === null ? null : fmt.abs(next),
      nextRunRel: next === null ? null : fmt.rel(next),
      describe: s.cronExpression === null ? null : describeCron(s.cronExpression, nowMs),
    };
  });
}

export default async function DeviceAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  // Same defence-in-depth as /dashboard (#10): fail loud on missing OIDC env.
  assertAuthEnv();

  let session: Session | null = null;
  try {
    session = await auth();
  } catch (err) {
    console.warn('[dashboard] auth() threw; treating as unauthenticated', err);
  }
  if (!session) return <SignInGate locale={locale} returnPath={RETURN_PATH} />;

  // ADMIN gate. `asRole` collapses anything but the literal 'ADMIN' to
  // 'USER', so a missing or forged role fails closed.
  if (asRole(session.user?.role) !== 'ADMIN') {
    return (
      <>
        <DevSubnav active="devices" />
        <NoAccess />
      </>
    );
  }

  const sp = await searchParams;
  const tab = parseTab(first(sp.tab));
  // Health is public and independent: fetch it alongside the token check.
  const healthPromise = settle(getHealth());

  // Local dev without DEVICE_SERVICE_URL: say so instead of failing per call.
  if (!shouldAttemptDeviceAdmin()) {
    const health = await healthPromise;
    return (
      <Frame healthStatus={health.ok ? health.data.status : null} tab={tab}>
        <FailureNotice kind="disabled" />
      </Frame>
    );
  }

  const [health, token] = await Promise.all([healthPromise, getAdminAccessToken()]);
  const healthStatus = health.ok ? health.data.status : null;
  if (!token.ok) {
    return (
      <Frame healthStatus={healthStatus} tab={tab}>
        <ReauthNotice locale={locale} returnPath={RETURN_PATH} namespace={REAUTH_NS} />
      </Frame>
    );
  }

  const t = await getTranslations('dashboard.deviceAdmin');
  const { nowMs, fmt } = requestClock(locale);
  let body: ReactNode;

  if (tab === 'overview') {
    const [devices, schedules] = await Promise.all([settle(listDevices(token.token)), settle(listSchedules(token.token))]);
    if ((!devices.ok && devices.kind === 'unauthorized') || (!schedules.ok && schedules.kind === 'unauthorized')) {
      body = <ReauthNotice locale={locale} returnPath={RETURN_PATH} namespace={REAUTH_NS} />;
    } else {
      const deviceSummary: Section<DeviceSummary> = devices.ok
        ? { ok: true, data: summarizeDevices(toDeviceRows(devices.data, locale, fmt, nowMs), devices.data, fmt, nowMs) }
        : { ok: false, kind: devices.kind };
      let scheduleSummary: Section<ScheduleSummary>;
      if (schedules.ok) {
        const upcoming = schedules.data
          .filter((s) => s.active)
          .map((s) => ({ s, ms: parseServiceTime(s.nextRun) }))
          .filter((x): x is { s: Schedule; ms: number } => x.ms !== null)
          .sort((a, b) => a.ms - b.ms)
          .slice(0, UPCOMING)
          .map(({ s, ms }) => ({
            id: s.id,
            label:
              s.state !== null && isDeviceField(s.field)
                ? `${t(`fields.${s.field}`)} → ${t(`switch.${s.state === 1 ? 'on' : 'off'}`)}`
                : `${s.field ?? '—'} · ${t('schedules.customPayload')}`,
            abs: fmt.abs(ms),
            rel: fmt.rel(ms),
          }));
        scheduleSummary = {
          ok: true,
          data: { total: schedules.data.length, active: schedules.data.filter((s) => s.active).length, upcoming },
        };
      } else {
        scheduleSummary = { ok: false, kind: schedules.kind };
      }
      body = <DeviceOverview healthStatus={healthStatus} devices={deviceSummary} schedules={scheduleSummary} />;
    }
  } else if (tab === 'devices') {
    const r = await settle(listDevices(token.token));
    body = r.ok ? (
      <DevicesPanel devices={toDeviceRows(r.data, locale, fmt, nowMs)} />
    ) : r.kind === 'unauthorized' ? (
      <ReauthNotice locale={locale} returnPath={RETURN_PATH} namespace={REAUTH_NS} />
    ) : (
      <FailureNotice kind={r.kind} />
    );
  } else {
    const [schedules, devices] = await Promise.all([settle(listSchedules(token.token)), settle(listDevices(token.token))]);
    body = schedules.ok ? (
      <SchedulesPanel
        schedules={toScheduleRows(schedules.data, fmt, nowMs)}
        deviceNames={devices.ok ? devices.data.map((d) => d.name).sort((a, b) => a.localeCompare(b)) : null}
        nowMs={nowMs}
      />
    ) : schedules.kind === 'unauthorized' ? (
      <ReauthNotice locale={locale} returnPath={RETURN_PATH} namespace={REAUTH_NS} />
    ) : (
      <FailureNotice kind={schedules.kind} />
    );
  }

  return (
    <Frame healthStatus={healthStatus} tab={tab}>
      {body}
    </Frame>
  );
}
