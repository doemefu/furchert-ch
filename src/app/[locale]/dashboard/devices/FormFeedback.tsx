'use client';

// Inline feedback for the /dashboard/devices forms. Unlike auth-service,
// device-service returns its validation messages as `details` ("field:
// message"); `FieldError` shows the local hint (translated) and the service's
// own message (verbatim) under the field it belongs to, `FormError` shows the
// action-level error plus any message that names no form field.
import { signIn } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import { hasFieldError, type DeviceActionState } from '@/lib/deviceadmin/forms';
import { fieldAria, fieldErrorId } from '@/lib/a11y/drawer';
import { btnSmall, errorTextStyle } from '../auth/ui';

/** Fields the schedule and control forms render; anything else is shown by FormError. */
export const FORM_FIELDS = new Set(['id', 'deviceName', 'field', 'state', 'cronExpression', 'active']);
const LOCAL_CODES = new Set([...FORM_FIELDS, 'cronFields', 'cronSeconds']);

export function FieldError({ state, field }: { state: DeviceActionState; field: string }) {
  const t = useTranslations('dashboard.deviceAdmin.errors.fields');
  if (state.status !== 'error') return null;
  const code = state.fieldErrors?.[field];
  const server = state.details?.[field];
  if (!code && !server) return null;
  return (
    <p id={fieldErrorId(field)} style={errorTextStyle}>
      {code && LOCAL_CODES.has(code) ? t(code) : null}
      {code && server ? ' ' : null}
      {server ? <span>device-service: {server}</span> : null}
    </p>
  );
}

/** ARIA attributes for the input of `field`: invalid + described by its FieldError (#140). */
export function inputAria(state: DeviceActionState, field: string) {
  return fieldAria(hasFieldError(state, field), field);
}

/** Text of an error state without the sign-in affordance (for compact row messages). */
export function useErrorText() {
  const t = useTranslations('dashboard.deviceAdmin.errors');
  return (state: DeviceActionState): string => {
    if (state.status !== 'error') return '';
    const extra = [state.message, ...Object.values(state.details ?? {})].filter(Boolean).join(' · ');
    return extra ? `${t(state.code)} ${extra}` : t(state.code);
  };
}

export function FormError({ state }: { state: DeviceActionState }) {
  const t = useTranslations('dashboard.deviceAdmin.errors');
  const tr = useTranslations('dashboard.deviceAdmin.reauth');
  const locale = useLocale();
  if (state.status !== 'error') return null;
  const loose = Object.entries(state.details ?? {}).filter(([k]) => !FORM_FIELDS.has(k));
  return (
    <div role="alert" style={{ ...errorTextStyle, marginTop: 0 }}>
      {t(state.code)}
      {state.message ? <span style={{ color: 'var(--n-60)' }}> · device-service: {state.message}</span> : null}
      {loose.map(([k, v]) => (
        <span key={k} style={{ display: 'block', color: 'var(--n-60)' }}>
          {k === '_' ? v : `${k}: ${v}`}
        </span>
      ))}
      {/* An expired/missing token is not fixable in the form — offer the real sign-in. */}
      {state.code === 'session' && (
        <button
          type="button"
          onClick={() => void signIn('furchert-ch', { redirectTo: `/${locale}/dashboard/devices` })}
          style={{ ...btnSmall, marginLeft: '.5rem' }}
        >
          {tr('button')}
        </button>
      )}
    </div>
  );
}
