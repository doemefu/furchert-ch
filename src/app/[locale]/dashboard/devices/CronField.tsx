'use client';

// "When" part of the schedule form: three presets — daily at a Zurich time,
// every n minutes, or a raw Spring cron expression — feeding one hidden
// `cronExpression` input. Every input is controlled, and the enclosing form
// submits via onSubmit (see ScheduleDrawer), so a rejected save keeps exactly
// what the admin entered. Until the admin changes the schedule fields, the
// stored expression is submitted unchanged (`cronFromForm`). Time math uses
// the server-provided `nowMs`, never the clock during render. See
// `lib/deviceadmin/cron.ts` for why a daily schedule moves by an hour at each
// daylight-saving switch.
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/routing';
import {
  INTERVAL_MINUTES,
  cronFromForm,
  describeCron,
  nextDailyShift,
  parseTime,
  type CronPreset,
  type IntervalMinutes,
} from '@/lib/deviceadmin/cron';
import type { DeviceActionState } from '@/lib/deviceadmin/forms';
import { FieldError, inputAria } from './FormFeedback';
import { makeFormatters } from './format';
import { MonoLabel, fieldStyle, hintStyle } from '../auth/ui';

type Mode = 'daily' | 'interval' | 'custom';

export function CronField({ initial, nowMs, state }: { initial: string | null; nowMs: number; state: DeviceActionState }) {
  const t = useTranslations('dashboard.deviceAdmin.cron');
  const locale = useLocale() as Locale;
  const fmt = makeFormatters(locale, nowMs);
  const [start] = useState<CronPreset>(() => (initial ? describeCron(initial, nowMs) : { kind: 'daily', hour: 8, minute: 0 }));
  const [mode, setMode] = useState<Mode>(start.kind);
  const [time, setTime] = useState(start.kind === 'daily' ? fmt.hm(start.hour, start.minute) : '08:00');
  const [minutes, setMinutes] = useState<IntervalMinutes>(start.kind === 'interval' ? start.minutes : 15);
  const [custom, setCustom] = useState(start.kind === 'custom' ? start.expr : (initial ?? ''));
  // "Changed" means different from what the form opened with, so changing a
  // value and changing it back keeps the stored expression too.
  const [opened] = useState(() => ({ mode, time, minutes, custom }));
  const touched = mode !== opened.mode || time !== opened.time || minutes !== opened.minutes || custom !== opened.custom;

  const daily = parseTime(time);
  const expr = cronFromForm({ mode, time, minutes, custom }, nowMs, initial, touched);

  let means: string | null = null;
  let shift: string | null = null;
  if (mode === 'daily' && daily && expr) {
    const [, m, h] = expr.split(' ');
    means = t('dailyMeans', { local: fmt.hm(daily.hour, daily.minute), utc: fmt.hm(Number(h), Number(m)) });
    const s = nextDailyShift(expr, nowMs);
    // Hidden when the switch lands on the intended time (a 02:xx run moved by the spring gap).
    if (s && (s.hour !== daily.hour || s.minute !== daily.minute)) shift = t('dailyShift', { date: fmt.date(s.atMs), shifted: fmt.hm(s.hour, s.minute), intended: fmt.hm(daily.hour, daily.minute) });
  } else if (mode === 'interval') {
    means = minutes === 60 ? t('hourly') : t('intervalMeans', { minutes });
  }

  const radio = (value: Mode, label: string) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: '.45rem', fontFamily: 'var(--mono)', fontSize: '.75rem', color: 'var(--n-80)', minWidth: '9.5rem' }}>
      <input type="radio" name="cronMode" value={value} checked={mode === value} onChange={() => setMode(value)} />
      {label}
    </label>
  );
  // The expression error belongs to whichever control is active (#140). The
  // custom input also keeps its hint in aria-describedby.
  const cronAria = inputAria(state, 'cronExpression');
  const row = { display: 'flex', alignItems: 'center', gap: '.6rem', flexWrap: 'wrap' as const };

  return (
    <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '.55rem' }}>
      <legend style={{ padding: 0 }}>
        <MonoLabel mb=".3rem">{t('legend')}</MonoLabel>
      </legend>

      <div style={row}>
        {radio('daily', t('daily'))}
        <input
          type="time"
          step={60}
          value={time}
          onChange={(e) => setTime(e.target.value)}
          disabled={mode !== 'daily'}
          required={mode === 'daily'}
          aria-label={t('dailyTime')}
          {...(mode === 'daily' ? cronAria : {})}
          style={{ ...fieldStyle, width: 'auto' }}
        />
      </div>

      <div style={row}>
        {radio('interval', t('interval'))}
        <select
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value) as IntervalMinutes)}
          disabled={mode !== 'interval'}
          aria-label={t('intervalLabel')}
          {...(mode === 'interval' ? cronAria : {})}
          style={{ ...fieldStyle, width: 'auto' }}
        >
          {INTERVAL_MINUTES.map((n) => (
            <option key={n} value={n}>
              {t('intervalMinutes', { minutes: n })}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
        {radio('custom', t('custom'))}
        {mode === 'custom' && (
          <>
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              required
              maxLength={100}
              spellCheck={false}
              autoComplete="off"
              aria-label={t('customLabel')}
              {...cronAria}
              aria-describedby={['cron-custom-hint', cronAria['aria-describedby']].filter(Boolean).join(' ')}
              placeholder="0 30 6 * * MON-FRI"
              style={fieldStyle}
            />
            <p id="cron-custom-hint" style={{ ...hintStyle, marginTop: 0, lineHeight: 1.5 }}>
              {t('customHint')}
            </p>
          </>
        )}
      </div>

      <input type="hidden" name="cronExpression" value={expr} />

      <div
        aria-live="polite"
        style={{ padding: '.6rem .75rem', background: 'var(--white)', border: '1px dashed rgba(162,167,176,.4)', borderRadius: '2px' }}
      >
        {expr && (
          <div style={{ fontFamily: 'var(--mono)', fontSize: '.72rem', color: 'var(--n-90)' }}>{t('stored', { expr })}</div>
        )}
        {means && <p style={{ ...hintStyle, color: 'var(--n-70)', lineHeight: 1.5 }}>{means}</p>}
        {shift && <p style={{ ...hintStyle, color: '#a16207', lineHeight: 1.5 }}>{shift}</p>}
      </div>
      <FieldError state={state} field="cronExpression" />
    </fieldset>
  );
}
