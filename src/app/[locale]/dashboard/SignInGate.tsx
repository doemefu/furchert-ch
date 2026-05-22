'use client';

// Real OIDC sign-in gate. Reuses the prototype AuthGate's CARD STYLING only
// (dashboard.jsx) — the fake email/GitHub/Cloudflare flow is gone. A single
// button starts the real Authorization-Code+PKCE flow against auth.furchert.ch.
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui/Icon';

const DOTS =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18'%3E%3Ccircle cx='1' cy='1' r='1' fill='%23a2a7b0' opacity='.2'/%3E%3C/svg%3E\")";

export function SignInGate({ locale }: { locale: string }) {
  const t = useTranslations('dashboard');

  return (
    <div
      style={{
        minHeight: '100svh',
        paddingTop: 'var(--header-h)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--n-10)',
        backgroundImage: DOTS,
        backgroundRepeat: 'repeat',
        backgroundSize: '1.125rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          margin: '2rem',
          background: 'var(--white)',
          border: '1px solid rgba(162,167,176,.35)',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '2.5rem 2rem 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '1.5rem' }}>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                border: '1px solid rgba(162,167,176,.35)',
                color: 'var(--n-70)',
              }}
            >
              <Icon name="lock" size={11} />
            </span>
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '.72rem',
                fontWeight: 500,
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                color: 'var(--n-100)',
              }}
            >
              furchert.ch · Sign in
            </span>
          </div>

          <h2
            style={{
              fontFamily: 'var(--sans)',
              fontSize: '1.25rem',
              fontWeight: 500,
              letterSpacing: '-.03em',
              color: 'var(--n-100)',
              marginBottom: '.5rem',
            }}
          >
            {t('gate')}
          </h2>
          <p style={{ fontSize: '.9rem', color: 'var(--n-60)', lineHeight: 1.5, marginBottom: '1.75rem' }}>
            {t('gatesub')}
          </p>

          <button
            type="button"
            onClick={() => signIn('furchert-ch', { redirectTo: `/${locale}/dashboard` })}
            style={{
              width: '100%',
              padding: '.875rem',
              background: 'var(--n-100)',
              color: 'var(--white)',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
              fontFamily: 'var(--mono)',
              fontSize: '.8125rem',
              letterSpacing: '.04em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '.5rem',
              transition: 'background .15s',
            }}
          >
            <Icon name="lock" size={13} /> {t('signInOidc')}
          </button>

          <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <Icon name="lock" size={11} />
            <p
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '.65rem',
                letterSpacing: '.04em',
                textTransform: 'uppercase',
                color: 'var(--n-50)',
              }}
            >
              {t('protectedBy')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
