import type { Metadata } from 'next';
import type { Session } from 'next-auth';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { isLocale } from '@/i18n/routing';
import { auth } from '@/auth';
import { asRole } from '@/auth.config';
import { Icon } from '@/components/ui/Icon';
import { SignInGate } from './SignInGate';
import { SignOutButton } from './SignOutButton';

// Reads the session (cookies) → must be dynamic. This is intentional and
// isolated to /dashboard; public pages stay statically rendered (worklog D-B).
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return { robots: { index: false, follow: false } };
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  return {
    title: `${t('title')} — furchert.ch`,
    robots: { index: false, follow: false },
  };
}

const labelMono = {
  fontFamily: 'var(--mono)',
  fontSize: '.72rem',
  letterSpacing: '.06em',
  textTransform: 'uppercase' as const,
  color: 'var(--n-50)',
};

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('dashboard');

  // Authoritative gate (worklog D-A): no protected content is rendered
  // without a server-side session check. Phase-6 admin route handlers will
  // additionally enforce role === 'ADMIN'.
  //
  // `auth()` can throw if the session cookie is corrupted (e.g. AUTH_SECRET
  // was rotated). Treat any throw as "no valid session" so the user is shown
  // the gate with a clear path back to sign-in, rather than a generic 500.
  let session: Session | null = null;
  try {
    session = await auth();
  } catch (err) {
    console.warn('[dashboard] auth() threw; treating as unauthenticated', err);
  }
  if (!session) return <SignInGate locale={locale} />;

  const name = session.user?.name ?? session.user?.email ?? '—';
  // Normalise the role one more time at render so a corrupted JWT can never
  // surface an unrecognised string in the badge.
  const role = asRole(session.user?.role);

  return (
    <div className="container border-x" style={{ minHeight: '60vh', padding: '4rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '1.5rem' }}>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            border: '1px solid rgba(162,167,176,.35)',
            color: '#22c55e',
          }}
        >
          <Icon name="check" size={14} />
        </span>
        <span style={{ ...labelMono, color: 'var(--n-100)' }}>{t('authedTitle')}</span>
      </div>

      <dl
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          border: '1px solid rgba(162,167,176,.22)',
          borderRadius: '2px',
          overflow: 'hidden',
          maxWidth: '40rem',
        }}
      >
        <div style={{ padding: '1.5rem', borderRight: '1px solid rgba(162,167,176,.22)' }}>
          <dt style={{ ...labelMono, marginBottom: '.4rem' }}>{t('user')}</dt>
          <dd style={{ fontFamily: 'var(--sans)', fontSize: '1rem', color: 'var(--n-100)' }}>{name}</dd>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <dt style={{ ...labelMono, marginBottom: '.4rem' }}>{t('role')}</dt>
          <dd>
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '.7rem',
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                padding: '.2rem .6rem',
                border: `1px solid ${role === 'ADMIN' ? 'var(--blue-base)' : 'rgba(162,167,176,.35)'}`,
                borderRadius: '2px',
                color: role === 'ADMIN' ? 'var(--blue-base)' : 'var(--n-60)',
                background: role === 'ADMIN' ? 'var(--blue-wash)' : 'transparent',
              }}
            >
              {role}
            </span>
          </dd>
        </div>
      </dl>

      <p style={{ fontSize: '.9375rem', color: 'var(--n-60)', lineHeight: 1.55, maxWidth: '52ch', margin: '1.5rem 0 2rem' }}>
        {t('placeholder')}
      </p>

      <SignOutButton />
    </div>
  );
}
