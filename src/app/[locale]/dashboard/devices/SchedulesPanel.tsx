'use client';

// Schedules tab: list, create, edit, delete and (de)activate device-service
// schedules (GET/POST/PUT/DELETE /schedules). Layout follows the users table
// and drawer of `../auth/UsersPanel.tsx`. Every mutation is a Server Action
// (`actions.ts`) that re-checks ADMIN; device-service's own validation
// messages are shown under the field they name, and after a save the API's
// `nextRun` is shown as the confirmation of what the expression means.
// Labels from the server are pre-formatted; labels built here are built in
// event handlers, never during render.
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/routing';
import type { CronPreset } from '@/lib/deviceadmin/cron';
import { DEVICE_FIELDS, isDeviceField, parseServiceTime, type DeviceField } from '@/lib/deviceadmin/fields';
import { IDLE, type DeviceActionState } from '@/lib/deviceadmin/forms';
import { deleteScheduleAction, saveScheduleAction, setScheduleActiveAction } from './actions';
import { CronField } from './CronField';
import { FieldError, FormError, inputAria, useErrorText } from './FormFeedback';
import { useFocusTrap, useReturnFocus } from '../useDrawerFocus';
import { makeFormatters } from './format';
import { BORDER, MonoLabel, Pill, btnDanger, btnPrimary, btnSecondary, btnSmall, cardStyle, fieldStyle, hintStyle } from '../auth/ui';

/** A schedule as rendered — `nextRun` labels and the cron description come from the server. */
export interface ScheduleRow {
  id: number;
  deviceName: string | null;
  field: string | null;
  state: 0 | 1 | null;
  payload: string | null;
  cronExpression: string | null;
  active: boolean;
  nextRunAbs: string | null;
  nextRunRel: string | null;
  describe: CronPreset | null;
}

const GRID = '3rem .9rem 1fr 1.2fr 1.5fr 1.6fr 7.5rem 6rem';

/** A row the toggle may rewrite: standard payload and complete fields. */
const isStandard = (r: ScheduleRow) => r.state !== null && isDeviceField(r.field) && !!r.deviceName && !!r.cronExpression;

export function SchedulesPanel({
  schedules,
  deviceNames,
  nowMs,
}: {
  schedules: ScheduleRow[];
  /** null when the device list could not be loaded — the form then takes a typed name. */
  deviceNames: string[] | null;
  nowMs: number;
}) {
  const t = useTranslations('dashboard.deviceAdmin');
  const locale = useLocale() as Locale;
  const errorText = useErrorText();
  // null = closed, 'new' = create form, number = edit that schedule id.
  const [drawer, setDrawer] = useState<null | 'new' | number>(null);
  // Focus returns to the button that opened the drawer when it closes.
  const { remember, restore } = useReturnFocus();
  const newButton = useRef<HTMLButtonElement | null>(null);
  const openDrawer = (target: 'new' | number, el: HTMLElement) => {
    remember(el);
    setDrawer(target);
  };
  const closeDrawer = () => {
    setDrawer(null);
    restore();
  };
  const [banner, setBanner] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: number; text: string } | null>(null);
  const editing = typeof drawer === 'number' ? schedules.find((s) => s.id === drawer) : undefined;

  // Built when an action returns (event time), so Date.now() never runs during render.
  const savedText = (saved: { id: number; active: boolean; nextRun: string | null }) => {
    if (!saved.active) return t('schedules.savedInactive', { id: saved.id });
    const ms = parseServiceTime(saved.nextRun);
    if (ms === null) return t('schedules.savedNoRun', { id: saved.id });
    const fmt = makeFormatters(locale, Date.now());
    return t('schedules.savedActive', { id: saved.id, abs: fmt.abs(ms), rel: fmt.rel(ms) });
  };

  const onRowResult = (id: number, r: DeviceActionState) => {
    if (r.status === 'ok' && r.saved) {
      setRowError(null);
      setBanner(savedText(r.saved));
    } else if (r.status === 'error') {
      setRowError({ id, text: errorText(r) });
    }
  };

  const describe = (r: ScheduleRow): string => {
    const d = r.describe;
    if (!d) return '—';
    if (d.kind === 'daily') return t('cron.describeDaily', { time: `${String(d.hour).padStart(2, '0')}:${String(d.minute).padStart(2, '0')}` });
    if (d.kind === 'interval') return d.minutes === 60 ? t('cron.describeHourly') : t('cron.describeInterval', { minutes: d.minutes });
    return t('cron.describeCustom');
  };

  return (
    <div>
      {/* Header + toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '.75rem', flexWrap: 'wrap', marginBottom: '.75rem' }}>
        <div>
          <MonoLabel>{t('schedules.count', { count: schedules.length })}</MonoLabel>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '.65rem', color: 'var(--n-50)' }}>{t('schedules.source')}</span>
        </div>
        <button type="button" ref={newButton} onClick={(e) => openDrawer('new', e.currentTarget)} style={btnPrimary}>
          {t('schedules.new')}
        </button>
      </div>

      <div style={{ padding: '.8rem 1rem', marginBottom: '1rem', background: 'var(--blue-wash)', border: '1px solid rgba(14,60,166,.2)', borderRadius: '2px' }}>
        <p style={{ fontSize: '.8rem', color: 'var(--n-80)', lineHeight: 1.55 }}>{t('schedules.fanout')}</p>
        <p style={{ fontSize: '.8rem', color: 'var(--n-80)', lineHeight: 1.55, marginTop: '.35rem' }}>{t('schedules.twoSchedules')}</p>
      </div>

      {/* Result of the last save / delete / toggle */}
      <div role="status">
        {banner && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '.75rem',
              alignItems: 'center',
              padding: '.7rem 1rem',
              marginBottom: '1rem',
              background: 'rgba(34,197,94,.08)',
              border: '1px solid rgba(34,197,94,.3)',
              borderRadius: '2px',
              fontFamily: 'var(--mono)',
              fontSize: '.75rem',
              color: '#15803d',
            }}
          >
            <span>{banner}</span>
            <button type="button" onClick={() => setBanner(null)} aria-label={t('schedules.dismiss')} style={{ ...btnSmall, border: 'none' }}>
              ×
            </button>
          </div>
        )}
      </div>
      <div role="alert">
        {rowError && (
          <p style={{ fontFamily: 'var(--mono)', fontSize: '.72rem', color: '#b91c1c', marginBottom: '1rem', lineHeight: 1.5 }}>
            {t('schedules.rowError', { id: rowError.id, error: rowError.text })}
          </p>
        )}
      </div>

      {/* Table */}
      <div style={{ ...cardStyle, overflowX: 'auto' }}>
        <div style={{ minWidth: 900 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: GRID,
              alignItems: 'center',
              gap: '.5rem',
              padding: '.65rem 1rem',
              background: 'var(--n-10)',
              borderBottom: BORDER,
              fontFamily: 'var(--mono)',
              fontSize: '.62rem',
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              color: 'var(--n-50)',
            }}
          >
            <span>{t('schedules.colId')}</span>
            <span />
            <span>{t('schedules.colDevice')}</span>
            <span>{t('schedules.colAction')}</span>
            <span>{t('schedules.colSchedule')}</span>
            <span>{t('schedules.colNextRun')}</span>
            <span>{t('schedules.colActive')}</span>
            <span />
          </div>
          {schedules.length === 0 && (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '.75rem', color: 'var(--n-50)' }}>
              {t('schedules.none')}
            </div>
          )}
          {schedules.map((s, i) => (
            <div
              key={s.id}
              style={{
                display: 'grid',
                gridTemplateColumns: GRID,
                alignItems: 'center',
                gap: '.5rem',
                padding: '.7rem 1rem',
                borderBottom: i < schedules.length - 1 ? '1px solid rgba(162,167,176,.18)' : 'none',
                fontFamily: 'var(--mono)',
                fontSize: '.76rem',
                color: 'var(--n-90)',
                opacity: s.active ? 1 : 0.7,
              }}
            >
              <span style={{ color: 'var(--n-50)' }}>#{s.id}</span>
              <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: s.active ? 'var(--status-online)' : 'var(--status-unknown)' }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.deviceName ?? '—'}</span>
              <span>
                {s.state !== null && isDeviceField(s.field) ? (
                  <>
                    {t(`fields.${s.field}`)} → {t(`switch.${s.state === 1 ? 'on' : 'off'}`)}
                  </>
                ) : (
                  <span style={{ display: 'inline-flex', gap: '.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {s.field ?? '—'} <Pill tone="warn">{t('schedules.customPayload')}</Pill>
                  </span>
                )}
              </span>
              <span>
                <span style={{ color: 'var(--n-100)' }}>{describe(s)}</span>
                <span style={{ display: 'block', fontSize: '.66rem', color: 'var(--n-50)', marginTop: '.15rem' }}>{s.cronExpression ?? '—'} · UTC</span>
              </span>
              <span>
                {s.nextRunAbs ? (
                  <>
                    <span style={{ color: 'var(--n-100)' }}>{s.nextRunAbs}</span>
                    <span style={{ display: 'block', fontSize: '.66rem', color: 'var(--n-50)', marginTop: '.15rem' }}>{s.nextRunRel}</span>
                  </>
                ) : (
                  <span style={{ color: 'var(--n-50)' }}>{s.active ? t('schedules.noNextRunInvalid') : t('schedules.noNextRunInactive')}</span>
                )}
              </span>
              <span>
                <ActiveSwitch row={s} onResult={onRowResult} />
              </span>
              <span style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" onClick={(e) => openDrawer(s.id, e.currentTarget)} style={btnSmall}>
                  {t('schedules.edit')}
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>

      {drawer === 'new' && (
        <ScheduleDrawer
          key="new"
          deviceNames={deviceNames}
          nowMs={nowMs}
          onClose={closeDrawer}
          onSaved={(saved) => {
            setRowError(null);
            setBanner(savedText(saved));
          }}
        />
      )}
      {editing && (
        <ScheduleDrawer
          key={editing.id}
          row={editing}
          deviceNames={deviceNames}
          nowMs={nowMs}
          onClose={closeDrawer}
          onSaved={(saved) => {
            setRowError(null);
            setBanner(savedText(saved));
          }}
          onDeleted={(id) => {
            // The deleted row's edit button disappears with the refreshed list.
            if (newButton.current) remember(newButton.current);
            setRowError(null);
            setBanner(t('schedules.deleted', { id }));
          }}
        />
      )}
    </div>
  );
}

function ActiveSwitch({ row, onResult }: { row: ScheduleRow; onResult: (id: number, r: DeviceActionState) => void }) {
  const t = useTranslations('dashboard.deviceAdmin.schedules');
  const [, action, pending] = useActionState(async (prev: DeviceActionState, fd: FormData) => {
    const r = await setScheduleActiveAction(prev, fd);
    onResult(row.id, r);
    return r;
  }, IDLE);
  const locked = !isStandard(row);
  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '.2rem' }}>
      <input type="hidden" name="id" value={row.id} />
      <input type="hidden" name="active" value={String(!row.active)} />
      <button
        type="submit"
        role="switch"
        aria-checked={row.active}
        aria-label={t('switchLabel', { id: row.id })}
        disabled={locked || pending}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '.45rem',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: locked ? 'not-allowed' : 'pointer',
          opacity: locked ? 0.45 : pending ? 0.6 : 1,
          fontFamily: 'var(--mono)',
          fontSize: '.66rem',
          letterSpacing: '.04em',
          textTransform: 'uppercase',
          color: row.active ? '#15803d' : 'var(--n-60)',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: 'relative',
            width: 28,
            height: 16,
            borderRadius: 8,
            background: row.active ? 'var(--status-online)' : 'var(--n-30)',
            transition: 'background .15s',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 2,
              left: row.active ? 14 : 2,
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: 'var(--white)',
              transition: 'left .15s',
            }}
          />
        </span>
        {row.active ? t('activeOn') : t('activeOff')}
      </button>
      {locked && <span style={{ ...hintStyle, marginTop: 0 }}>{t('toggleLocked')}</span>}
    </form>
  );
}

function ScheduleDrawer({
  row,
  deviceNames,
  nowMs,
  onClose,
  onSaved,
  onDeleted,
}: {
  row?: ScheduleRow;
  deviceNames: string[] | null;
  nowMs: number;
  onClose: () => void;
  onSaved: (saved: { id: number; active: boolean; nextRun: string | null }) => void;
  onDeleted?: (id: number) => void;
}) {
  const t = useTranslations('dashboard.deviceAdmin');
  const trap = useFocusTrap<HTMLDivElement>();
  const isNew = !row;
  // Controlled fields, and the form is submitted through onSubmit instead of
  // the `action` prop: React resets a form after an `action` completes, and
  // that reset also snaps controlled selects and radios back to their first
  // option on screen — exactly when device-service has rejected the input.
  const [deviceName, setDeviceName] = useState(row?.deviceName ?? deviceNames?.[0] ?? '');
  const [field, setField] = useState<DeviceField | ''>(row ? (isDeviceField(row.field) ? row.field : '') : 'light');
  const [target, setTarget] = useState<'' | '0' | '1'>(row ? (row.state === null ? '' : row.state === 1 ? '1' : '0') : '1');
  const [active, setActive] = useState(row?.active ?? true);

  // Options: the known devices plus the stored name when it is no longer registered.
  const options = deviceNames ? [...deviceNames] : null;
  const missing = options !== null && row?.deviceName && !options.includes(row.deviceName) ? row.deviceName : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Wrapping the actions closes the drawer on success without an effect.
  const [saveState, saveAction, saving] = useActionState(async (prev: DeviceActionState, fd: FormData) => {
    const r = await saveScheduleAction(prev, fd);
    if (r.status === 'ok' && r.saved) {
      onSaved(r.saved);
      onClose();
    }
    return r;
  }, IDLE);
  const [deleteState, deleteAction, deleting] = useActionState(async (prev: DeviceActionState, fd: FormData) => {
    const r = await deleteScheduleAction(prev, fd);
    if (r.status === 'ok' && r.deleted) {
      onDeleted?.(r.deleted);
      onClose();
    }
    return r;
  }, IDLE);

  const submitSave = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => saveAction(fd));
  };

  const confirmDelete = (e: FormEvent<HTMLFormElement>) => {
    if (!row || !window.confirm(t('drawer.confirmDelete', { id: row.id }))) e.preventDefault();
  };

  const stateAria = inputAria(saveState, 'state');
  const radioLabel = { display: 'inline-flex', alignItems: 'center', gap: '.4rem', fontFamily: 'var(--mono)', fontSize: '.75rem', color: 'var(--n-80)' };

  // Portalled to <body>: the page's layout wrappers form a stacking context
  // below the fixed site header, which would otherwise cover the drawer top.
  return createPortal(
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(8,24,61,.35)', zIndex: 300, display: 'flex', justifyContent: 'flex-end' }}
    >
      <div
        {...trap}
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-drawer-title"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(480px, 94vw)', height: '100%', outline: 'none', background: 'var(--n-10)', borderLeft: '1px solid rgba(162,167,176,.35)', overflowY: 'auto' }}
      >
        <div style={{ padding: '1.5rem', borderBottom: BORDER, background: 'var(--white)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '.65rem', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--n-50)' }}>
              {isNew ? 'POST /schedules' : `PUT /schedules/${row.id}`}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('drawer.close')}
              style={{ fontFamily: 'var(--mono)', fontSize: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n-60)' }}
            >
              ×
            </button>
          </div>
          <div id="schedule-drawer-title" style={{ fontFamily: 'var(--sans)', fontSize: '1.25rem', fontWeight: 500, letterSpacing: '-.02em', color: 'var(--n-100)' }}>
            {isNew ? t('drawer.newTitle') : t('drawer.editTitle', { id: row.id })}
          </div>
        </div>

        <form onSubmit={submitSave} id="schedule-form" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {!isNew && <input type="hidden" name="id" value={row.id} />}

          <label>
            <MonoLabel mb=".3rem">{t('drawer.device')}</MonoLabel>
            {options ? (
              <select name="deviceName" required value={deviceName} onChange={(e) => setDeviceName(e.target.value)} autoFocus style={fieldStyle} {...inputAria(saveState, 'deviceName')}>
                {deviceName === '' && <option value="">—</option>}
                {missing && <option value={missing}>{t('drawer.deviceMissing', { name: missing })}</option>}
                {options.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name="deviceName"
                required
                pattern="[a-z0-9\-]{3,32}"
                maxLength={32}
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                autoComplete="off"
                autoFocus
                {...inputAria(saveState, 'deviceName')}
                style={fieldStyle}
              />
            )}
            <p style={hintStyle}>{options ? t('drawer.deviceHint') : t('drawer.deviceFallbackHint')}</p>
            <FieldError state={saveState} field="deviceName" />
          </label>

          <label>
            <MonoLabel mb=".3rem">{t('drawer.field')}</MonoLabel>
            <select name="field" required value={field} onChange={(e) => setField(e.target.value as DeviceField)} style={fieldStyle} {...inputAria(saveState, 'field')}>
              {field === '' && <option value="">—</option>}
              {DEVICE_FIELDS.map((f) => (
                <option key={f} value={f}>
                  {t(`fields.${f}`)}
                </option>
              ))}
            </select>
            <FieldError state={saveState} field="field" />
          </label>

          <fieldset style={{ border: 'none', padding: 0, margin: 0 }} role="radiogroup" aria-invalid={stateAria['aria-invalid']}>
            <legend style={{ padding: 0 }}>
              <MonoLabel mb=".4rem">{t('drawer.target')}</MonoLabel>
            </legend>
            <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
              <label style={radioLabel}>
                <input type="radio" name="state" value="1" required checked={target === '1'} onChange={() => setTarget('1')} aria-describedby={stateAria['aria-describedby']} />
                {t('drawer.targetOn')}
              </label>
              <label style={radioLabel}>
                <input type="radio" name="state" value="0" checked={target === '0'} onChange={() => setTarget('0')} aria-describedby={stateAria['aria-describedby']} />
                {t('drawer.targetOff')}
              </label>
            </div>
            <FieldError state={saveState} field="state" />
          </fieldset>

          {row && row.state === null && row.payload && (
            <p style={{ ...hintStyle, color: '#a16207', marginTop: 0, lineHeight: 1.5 }}>{t('drawer.legacyPayload', { payload: row.payload })}</p>
          )}

          <CronField initial={row?.cronExpression ?? null} nowMs={nowMs} state={saveState} />

          <label style={{ ...radioLabel, alignItems: 'flex-start' }}>
            <input type="checkbox" name="active" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span>{t('drawer.active')}</span>
          </label>

          <FormError state={saveState} />
        </form>

        <div style={{ padding: '1.25rem 1.5rem', borderTop: BORDER, background: 'var(--white)', display: 'flex', justifyContent: 'space-between', gap: '.5rem', flexWrap: 'wrap' }}>
          {!isNew && (
            <form action={deleteAction} onSubmit={confirmDelete}>
              <input type="hidden" name="id" value={row.id} />
              <button type="submit" disabled={deleting} style={btnDanger}>
                {t('drawer.delete')}
              </button>
            </form>
          )}
          <div style={{ display: 'flex', gap: '.5rem', marginLeft: 'auto' }}>
            <button type="button" onClick={onClose} style={btnSecondary}>
              {t('drawer.cancel')}
            </button>
            <button type="submit" form="schedule-form" disabled={saving} style={{ ...btnPrimary, padding: '.5rem 1rem' }}>
              {saving ? t('drawer.saving') : isNew ? t('drawer.create') : t('drawer.save')}
            </button>
          </div>
        </div>
        {deleteState.status === 'error' && (
          <div style={{ padding: '0 1.5rem 1.25rem', background: 'var(--white)' }}>
            <FormError state={deleteState} />
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
