'use client';

// Inline feedback for the auth-admin forms: the action-level error plus
// auth-service's own message (e.g. "Username already taken: …").
import { signIn } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import type { ActionState } from '@/lib/authadmin/forms';
import { btnSmall, errorTextStyle } from './ui';

const KNOWN_FIELDS = new Set([
  'username',
  'email',
  'password',
  'newPassword',
  'role',
  'status',
  'id',
  'clientId',
  'description',
]);

export function FieldError({ state, field }: { state: ActionState; field: string }) {
  const t = useTranslations('dashboard.authAdmin.errors.fields');
  if (state.status !== 'error' || !state.fieldErrors?.[field] || !KNOWN_FIELDS.has(field)) return null;
  return (
    <p id={`err-${field}`} style={errorTextStyle}>
      {t(field)}
    </p>
  );
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
