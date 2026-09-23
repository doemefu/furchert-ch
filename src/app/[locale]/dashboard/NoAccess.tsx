// Shared "no access" state for ADMIN-only dashboard pages. Created by NM-1
// (#61, /dashboard/network) and meant to be reused by #44 (/dashboard/auth)
// and #45 (/dashboard/devices). Card styling mirrors SignInGate; it is a
// Server Component because it needs no interactivity. It renders no data.
import { getTranslations } from 'next-intl/server';
import { Icon } from '@/components/ui/Icon';
import { Link } from '@/i18n/navigation';

export async function NoAccess() {
  const t = await getTranslations('dashboard.noAccess');

  return (
    <div
      style={{
        minHeight: '60svh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--n-10)',
      }}
    >
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
            {t('kicker')}
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
          {t('title')}
        </h2>
        <p style={{ fontSize: '.9rem', color: 'var(--n-60)', lineHeight: 1.5, marginBottom: '1.5rem' }}>{t('body')}</p>
        <Link
          href="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '.4rem',
            fontFamily: 'var(--mono)',
            fontSize: '.72rem',
            letterSpacing: '.04em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            color: 'var(--n-60)',
            border: '1px solid rgba(162,167,176,.3)',
            borderRadius: '2px',
            padding: '.4rem .8rem',
          }}
        >
          {t('back')}
        </Link>
      </div>
    </div>
  );
}
