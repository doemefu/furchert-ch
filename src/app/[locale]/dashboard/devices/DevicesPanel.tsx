'use client';

// Devices tab: one card per device with its last known state, how old that
// state is, and the manual controls device-service offers
// (POST /devices/{id}/control). Commands are published without the retain
// flag, so the controls are only enabled for devices that are reporting
// (`canControl`); for any other device the reason is shown next to them.
// A successful send means "published", not "done": the card says so and
// offers a reload, because the state only changes once the device reports it.
// All labels (times, ages, numbers) are formatted on the server.
import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui/Icon';
import { canControl, type DeviceField, type Freshness, type SwitchState } from '@/lib/deviceadmin/fields';
import { IDLE } from '@/lib/deviceadmin/forms';
import { controlDeviceAction } from './actions';
import { FormError } from './FormFeedback';
import { BORDER, MonoLabel, Pill, btnSmall, cardStyle, hintStyle, type PillTone } from '../auth/ui';

/** A device as rendered — every label pre-formatted on the server (no hydration drift). */
export interface DeviceRow {
  id: number;
  name: string;
  freshness: Freshness;
  lastSeenAbs: string | null;
  lastSeenRel: string | null;
  temperatureLabel: string | null;
  humidityLabel: string | null;
  switches: Array<{ field: DeviceField; state: SwitchState }>;
}

const FRESHNESS_TONE: Record<Freshness, PillTone> = { live: 'ok', stale: 'warn', offline: 'err', never: 'mute' };
const SWITCH_TONE: Record<SwitchState, PillTone> = { on: 'ok', off: 'mute', unknown: 'warn' };

export function DevicesPanel({ devices }: { devices: DeviceRow[] }) {
  const t = useTranslations('dashboard.deviceAdmin.devices');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
      <div>
        <MonoLabel>{t('count', { count: devices.length })}</MonoLabel>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 'var(--fs-12)', color: 'var(--n-60)' }}>{t('source')}</span>
        <p style={{ ...hintStyle, marginTop: '.4rem' }}>{t('later')}</p>
      </div>

      {devices.length === 0 ? (
        <div style={{ ...cardStyle, padding: '2rem 1rem', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 'var(--fs-12)', color: 'var(--n-60)' }}>
          {t('none')}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '.75rem' }}>
          {devices.map((d) => (
            <DeviceCard key={d.id} device={d} />
          ))}
        </div>
      )}
    </div>
  );
}

function DeviceCard({ device: d }: { device: DeviceRow }) {
  const t = useTranslations('dashboard.deviceAdmin');
  const router = useRouter();
  const [state, action, pending] = useActionState(controlDeviceAction, IDLE);
  const enabled = canControl(d.freshness);
  const lockId = `lock-${d.id}`;
  const headingId = `device-${d.id}`;
  const valueNote = d.freshness === 'live' ? t('devices.now') : t('devices.lastReported');

  let lock: string | null = null;
  if (d.freshness === 'offline') lock = t('devices.lockedOffline', { device: d.name });
  else if (d.freshness === 'stale') lock = t('devices.lockedStale', { device: d.name, rel: d.lastSeenRel ?? '—' });
  else if (d.freshness === 'never') lock = t('devices.lockedNever', { device: d.name });

  return (
    <section aria-labelledby={headingId} style={{ ...cardStyle, display: 'flex', flexDirection: 'column' }}>
      {/* Identity + freshness */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '.85rem', alignItems: 'center', padding: '.95rem 1rem' }}>
        <span
          style={{
            width: 32,
            height: 32,
            background: 'var(--n-10)',
            border: '1px solid rgba(162,167,176,.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--n-70)',
          }}
        >
          <Icon name="iot" size={14} />
        </span>
        <div style={{ minWidth: 0 }}>
          <h2 id={headingId} style={{ fontFamily: 'var(--mono)', fontSize: 'var(--fs-14)', fontWeight: 500, color: 'var(--n-100)' }}>
            {d.name}
          </h2>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--fs-12)', color: 'var(--n-60)', marginTop: '.15rem' }}>
            #{d.id} ·{' '}
            {d.lastSeenAbs ? t('devices.lastSeen', { abs: d.lastSeenAbs, rel: d.lastSeenRel ?? '—' }) : t('devices.neverSeen')}
          </div>
        </div>
        <Pill tone={FRESHNESS_TONE[d.freshness]}>{t(`freshness.${d.freshness}`)}</Pill>
      </div>

      {/* Sensor values */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: BORDER }}>
        {(
          [
            ['temperature', d.temperatureLabel],
            ['humidity', d.humidityLabel],
          ] as const
        ).map(([key, value], i) => (
          <div key={key} style={{ padding: '.85rem 1rem', borderLeft: i === 1 ? BORDER : 'none' }}>
            <MonoLabel mb=".35rem">{t(`devices.${key}`)}</MonoLabel>
            <div
              style={{
                fontFamily: 'var(--sans)',
                fontSize: 'var(--fs-24)',
                fontWeight: 500,
                letterSpacing: '-.01em',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
                color: d.freshness === 'live' ? 'var(--n-100)' : 'var(--n-60)',
              }}
            >
              {value ?? '—'}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--fs-12)', letterSpacing: 0, color: 'var(--n-60)', marginTop: '.35rem' }}>
              {value ? valueNote : ' '}
            </div>
          </div>
        ))}
      </div>

      {/* Actuators */}
      <div style={{ borderTop: BORDER, padding: '.35rem 1rem' }}>
        {d.switches.map(({ field, state: current }) => {
          const fieldLabel = t(`fields.${field}`);
          const targets: Array<0 | 1> = current === 'on' ? [0] : current === 'off' ? [1] : [1, 0];
          return (
            <div
              key={field}
              role="group"
              aria-label={`${fieldLabel} · ${d.name}`}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '.4rem .6rem',
                padding: '.45rem 0',
                borderBottom: '1px dashed rgba(162,167,176,.22)',
              }}
            >
              <span style={{ width: '6.5rem', fontFamily: 'var(--mono)', fontSize: 'var(--fs-12)', color: 'var(--n-80)' }}>{fieldLabel}</span>
              <span>
                <Pill tone={SWITCH_TONE[current]}>{t(`switch.${current}`)}</Pill>
              </span>
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem', marginLeft: 'auto', justifyContent: 'flex-end' }}>
                {targets.map((target) => {
                  const label = target === 1 ? t('devices.switchOn') : t('devices.switchOff');
                  return (
                    <form key={target} action={action}>
                      <input type="hidden" name="id" value={d.id} />
                      <input type="hidden" name="field" value={field} />
                      <input type="hidden" name="state" value={target} />
                      <button
                        type="submit"
                        disabled={!enabled || pending}
                        aria-label={t('devices.actionLabel', { field: fieldLabel, action: label.toLowerCase(), device: d.name })}
                        aria-describedby={lock ? lockId : undefined}
                        style={{ ...btnSmall, ...(!enabled ? { opacity: 0.45, cursor: 'not-allowed' } : {}) }}
                      >
                        {pending ? t('devices.sending') : label}
                      </button>
                    </form>
                  );
                })}
              </span>
            </div>
          );
        })}
      </div>

      {/* Why the controls are locked, or what the last send did */}
      <div style={{ padding: '.6rem 1rem .9rem', marginTop: 'auto' }}>
        {lock && (
          <p id={lockId} style={{ ...hintStyle, marginTop: 0, lineHeight: 1.5 }}>
            {lock}
          </p>
        )}
        <div role="status" style={{ ...hintStyle, marginTop: lock ? '.4rem' : 0, lineHeight: 1.5, color: 'var(--status-online-ink)' }}>
          {state.status === 'ok' && state.sent && (
            <>
              {t('devices.sent', {
                field: t(`fields.${state.sent.field}`),
                state: t(`switch.${state.sent.state === 1 ? 'on' : 'off'}`),
                device: d.name,
              })}{' '}
              <button type="button" onClick={() => router.refresh()} style={{ ...btnSmall, marginLeft: '.25rem' }}>
                {t('devices.reload')}
              </button>
            </>
          )}
        </div>
        <FormError state={state} />
      </div>
    </section>
  );
}
