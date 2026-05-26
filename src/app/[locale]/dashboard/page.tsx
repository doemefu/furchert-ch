import type { Metadata } from 'next';
import type { Session } from 'next-auth';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { isLocale } from '@/i18n/routing';
import { auth } from '@/auth';
import { SignInGate } from './SignInGate';
import { DevSubnav } from './Subnav';
import { DashboardShell } from './DashboardShell';

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

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

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

  return (
    <>
      <DevSubnav active="overview" />
      <DashboardShell locale={locale} />
    </>
  );
}
