'use client';

// Inline feedback for the auth-admin forms: the action-level error plus
// auth-service's own message (e.g. "Username already taken: …").
import { signIn } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import { hasFieldError, type ActionState } from '@/lib/authadmin/forms';
import { fieldAria, fieldErrorId } from '@/lib/a11y/drawer';
import { btnSmall, errorTextStyle } from './ui';

export function FieldError({ state, field }: { state: ActionState; field: string }) {
  const t = useTranslations('dashboard.authAdmin.errors.fields');
  if (!hasFieldError(state, field)) return null;
  return (
    <p id={fieldErrorId(field)} style={errorTextStyle}>
      {t(field)}
    </p>
  );
}

/** ARIA attributes for the input of `field`: invalid + described by its FieldError (#140). */
export function inputAria(state: ActionState, field: string) {
  return fieldAria(hasFieldError(state, field), field);
}

export function FormError({ state }: { state: ActionState }) {
  const t = useTranslations('dashboard.authAdmin.errors');
  const tr = useTranslations('dashboard.authAdmin.reauth');
  const locale = useLocale();
  if (state.status !== 'error') return null;
  return (
    <div role="alert" style={{ ...errorTextStyle, marginTop: 0 }}>
      {t(state.code)}
      {state.message ? <span style={{ color: 'var(--n-60)' }}> · {state.message}</span> : null}
      {/* An expired/missing token is not fixable in the form — offer the real sign-in. */}
      {state.code === 'session' && (
        <button
          type="button"
          onClick={() => void signIn('furchert-ch', { redirectTo: `/${locale}/dashboard/auth` })}
          style={{ ...btnSmall, marginLeft: '.5rem' }}
        >
          {tr('button')}
        </button>
      )}
    </div>
  );
}
