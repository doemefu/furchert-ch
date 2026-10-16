'use client';

// Shown when the session has no usable access token for auth-service's
// admin API (session predates #44, or the refresh failed). Card styling
// mirrors NoAccess; the button restarts the real OIDC sign-in.
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui/Icon';
import { btnPrimary, errorTextStyle } from './ui';

export function ReauthNotice({ locale }: { locale: string }) {
  const t = useTranslations('dashboard.authAdmin.reauth');
  const [error, setError] = useState(false);
  const onSignIn = async () => {
    setError(false);
    try {
      await signIn('furchert-ch', { redirectTo: `/${locale}/dashboard/auth` });
    } catch (err) {
      console.error('[ReauthNotice] sign-in failed', err);
      setError(true);
    }
  };
  return (
    <div style={{ minHeight: '50svh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        role="alert"
        style={{
          width: '100%',
          maxWidth: '420px',
          margin: '2rem',
          padding: '2.5rem 2rem 2rem',
          background: 'var(--white)',
          border: '1px solid rgba(162,167,176,.35)',
          borderRadius: '4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '1.5rem', color: 'var(--n-70)' }}>
          <Icon name="lock" size={13} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: '.72rem', fontWeight: 500, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--n-100)' }}>
            {t('kicker')}
          </span>
        </div>
        <h2 style={{ fontFamily: 'var(--sans)', fontSize: '1.25rem', fontWeight: 500, letterSpacing: '-.03em', color: 'var(--n-100)', marginBottom: '.5rem' }}>
          {t('title')}
        </h2>
        <p style={{ fontSize: '.9rem', color: 'var(--n-60)', lineHeight: 1.5, marginBottom: '1.5rem' }}>{t('body')}</p>
        <button type="button" onClick={onSignIn} style={btnPrimary}>
          {t('button')}
        </button>
        {error && <p style={errorTextStyle}>{t('error')}</p>}
      </div>
    </div>
  );
}
