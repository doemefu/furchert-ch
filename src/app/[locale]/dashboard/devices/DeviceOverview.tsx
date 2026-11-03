// Overview tab for /dashboard/devices, same layout as `../auth/AuthOverview.tsx`
// (service banner, stat tiles, two cards). Tiles show only what device-service
// reports. "Live" counts devices whose last message is recent, not the broker
// flag alone (a flag can stay "online" after a broker restart). When no device
// is reporting, a notice says so plainly and what that means for schedules.
import type { CSSProperties } from 'react';
import { getTranslations } from 'next-intl/server';
import { Icon } from '@/components/ui/Icon';
import { StatusDot } from '@/components/ui/StatusDot';
import { Link } from '@/i18n/navigation';
import type { DeviceAdminFailureKind } from '@/lib/deviceadmin/client';
import { MetaCard, MonoLabel, Pill, cardStyle } from '../auth/ui';
import { DEVICE_PUBLIC_URL } from './links';

/** Pre-computed on the server from GET /devices. */
export interface DeviceSummary {
  total: number;
  live: number;
  stale: number;
  offline: number;
  /** Most recent message across all devices. */
  latest: { device: string; abs: string; rel: string } | null;
}

/** Pre-computed on the server from GET /schedules. */
export interface ScheduleSummary {
  total: number;
  active: number;
  /** Active schedules with a nextRun, soonest first (at most 5). */
  upcoming: Array<{ id: number; label: string; abs: string; rel: string }>;
}

export type Section<T> = { ok: true; data: T } | { ok: false; kind: DeviceAdminFailureKind };

const bannerLink: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '.4rem',
  fontFamily: 'var(--mono)',
  fontSize: '.68rem',
  letterSpacing: '.04em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  border: '1px solid rgba(255,255,255,.25)',
  borderRadius: '2px',
  padding: '.5rem .8rem',
  color: 'var(--white)',
};

const actionStyle: CSSProperties = {
  textAlign: 'left',
  padding: '.7rem .85rem',
  background: 'var(--n-10)',
  border: '1px solid rgba(162,167,176,.3)',
  borderRadius: '2px',
  fontFamily: 'var(--mono)',
  fontSize: '.7rem',
  letterSpacing: '.04em',
  textTransform: 'uppercase',
  color: 'var(--n-80)',
  textDecoration: 'none',
};

const ENDPOINTS: Array<[string, string]> = [
  ['GET', '/devices'],
  ['POST', '/devices/‹id›/control'],
  ['ANY', '/schedules'],
  ['GET', '/actuator/health'],
];

export async function DeviceOverview({
  healthStatus,
  devices,
  schedules,
}: {
  healthStatus: string | null;
  devices: Section<DeviceSummary>;
  schedules: Section<ScheduleSummary>;
}) {
  const t = await getTranslations('dashboard.deviceAdmin');
  const up = healthStatus === 'UP';
  const next = schedules.ok ? schedules.data.upcoming[0] : undefined;
  const noLive = devices.ok && devices.data.total > 0 && devices.data.live === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Service banner */}
      <div
        style={{
          background: 'var(--n-100)',
          color: 'var(--white)',
          borderRadius: '2px',
          padding: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.4rem' }}>
            <StatusDot status={healthStatus === null ? 'unknown' : up ? 'online' : 'offline'} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: '.7rem', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--n-30)' }}>
              device-service · {healthStatus === null ? t('statusUnknown') : healthStatus}
            </span>
          </div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: '1.5rem', fontWeight: 500, letterSpacing: '-.02em' }}>{t('overview.service')}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '.72rem', color: 'var(--n-40)', marginTop: '.35rem' }}>{t('overview.sub')}</div>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <a href={`${DEVICE_PUBLIC_URL}/swagger-ui.html`} target="_blank" rel="noopener noreferrer" style={bannerLink}>
            {t('overview.swagger')} <Icon name="ext" size={10} />
          </a>
          <a href={`${DEVICE_PUBLIC_URL}/actuator/health`} target="_blank" rel="noopener noreferrer" style={bannerLink}>
            {t('health')} <Icon name="ext" size={10} />
          </a>
        </div>
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '.75rem' }}>
        {devices.ok ? (
          <MetaCard
            label={t('overview.devicesLive')}
            value={`${devices.data.live} / ${devices.data.total}`}
            sub={t('overview.devicesLiveSub', { offline: devices.data.offline, stale: devices.data.stale })}
            tone={devices.data.live > 0 ? 'ok' : 'warn'}
          />
        ) : (
          <MetaCard label={t('overview.devicesLive')} value={t('overview.na')} sub={t(`states.${devices.kind}`)} tone="unknown" />
        )}
        {devices.ok ? (
          <MetaCard
            label={t('overview.lastMessage')}
            value={devices.data.latest?.rel ?? '—'}
            sub={devices.data.latest ? t('overview.lastMessageSub', { device: devices.data.latest.device, when: devices.data.latest.abs }) : undefined}
          />
        ) : (
          <MetaCard label={t('overview.lastMessage')} value={t('overview.na')} sub={t(`states.${devices.kind}`)} tone="unknown" />
        )}
        {schedules.ok ? (
          <MetaCard
            label={t('overview.schedulesActive')}
            value={`${schedules.data.active} / ${schedules.data.total}`}
            sub={t('overview.schedulesActiveSub', { total: schedules.data.total })}
            tone="ok"
          />
        ) : (
          <MetaCard label={t('overview.schedulesActive')} value={t('overview.na')} sub={t(`states.${schedules.kind}`)} tone="unknown" />
        )}
        {schedules.ok ? (
          <MetaCard
            label={t('overview.nextRun')}
            value={next ? next.rel : t('overview.nextRunNone')}
            sub={next ? `${next.abs} · ${next.label}` : t('overview.nextRunNoneSub')}
          />
        ) : (
          <MetaCard label={t('overview.nextRun')} value={t('overview.na')} sub={t(`states.${schedules.kind}`)} tone="unknown" />
        )}
      </div>

      {noLive && devices.ok && (
        <div role="status" style={{ ...cardStyle, padding: '1.1rem 1.25rem', display: 'flex', gap: '.75rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
          <Pill tone="warn">{t('overview.noLiveTitle')}</Pill>
          <p style={{ flex: '1 1 320px', fontSize: '.85rem', color: 'var(--n-70)', lineHeight: 1.55 }}>
            {devices.data.latest
              ? t('overview.noLiveBody', { when: devices.data.latest.abs, device: devices.data.latest.device })
              : t('overview.noLiveBodyNever')}
          </p>
        </div>
      )}

      {/* Two-col: actions + upcoming runs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        <div style={{ ...cardStyle, padding: '1.25rem' }}>
          <MonoLabel mb=".75rem">{t('overview.quickActions')}</MonoLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
            <Link href="/dashboard/devices?tab=devices" style={actionStyle}>
              → {t('overview.controlDevices')}
            </Link>
            <Link href="/dashboard/devices?tab=schedules" style={actionStyle}>
              → {t('overview.newSchedule')}
            </Link>
          </div>

          <MonoLabel mt="1.5rem" mb=".5rem">
            {t('overview.endpoints')}
          </MonoLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem', fontFamily: 'var(--mono)', fontSize: '.72rem', color: 'var(--n-70)' }}>
            {ENDPOINTS.map(([m, p]) => (
              <div key={p} style={{ display: 'flex', gap: '.6rem', padding: '.3rem 0', borderBottom: '1px dashed rgba(162,167,176,.22)' }}>
                <span style={{ width: 46, color: m === 'POST' ? '#a16207' : m === 'GET' ? '#15803d' : 'var(--n-50)' }}>{m}</span>
                <span style={{ color: 'var(--n-90)' }}>{p}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...cardStyle, padding: '1.25rem' }}>
          <MonoLabel mb=".75rem">{t('overview.upcoming')}</MonoLabel>
          {!schedules.ok ? (
            <p style={{ fontSize: '.85rem', color: 'var(--n-60)', lineHeight: 1.55 }}>{t(`states.${schedules.kind}`)}</p>
          ) : schedules.data.upcoming.length === 0 ? (
            <p style={{ fontSize: '.85rem', color: 'var(--n-60)', lineHeight: 1.55 }}>{t('overview.upcomingNone')}</p>
          ) : (
            <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '.1rem' }}>
              {schedules.data.upcoming.map((u) => (
                <li
                  key={u.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2.5rem 1fr auto',
                    gap: '.6rem',
                    padding: '.45rem 0',
                    borderBottom: '1px dashed rgba(162,167,176,.22)',
                    fontFamily: 'var(--mono)',
                    fontSize: '.72rem',
                    color: 'var(--n-80)',
                  }}
                >
                  <span style={{ color: 'var(--n-50)' }}>#{u.id}</span>
                  <span>{u.label}</span>
                  <span style={{ textAlign: 'right' }}>
                    <span style={{ color: 'var(--n-100)' }}>{u.rel}</span>
                    <span style={{ display: 'block', fontSize: '.64rem', color: 'var(--n-50)' }}>{u.abs}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
          <Link
            href="/dashboard/devices?tab=schedules"
            style={{
              display: 'inline-block',
              marginTop: '1rem',
              fontFamily: 'var(--mono)',
              fontSize: '.65rem',
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              color: 'var(--blue-base)',
              textDecoration: 'none',
            }}
          >
            {t('overview.upcomingAll')}
          </Link>
        </div>
      </div>
    </div>
  );
}
