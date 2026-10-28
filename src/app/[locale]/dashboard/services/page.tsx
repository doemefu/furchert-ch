// /[locale]/dashboard/services — ADMIN-only service utilization and
// availability page (#47). Gate order as in /dashboard/network: OIDC env
// assertion → session (else SignInGate) → ADMIN role (else NoAccess). Only
// after all three does ServicesShell render and query Prometheus, so nothing
// is fetched for a non-admin.
import type { Metadata } from 'next';
import type { Session } from 'next-auth';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { isLocale } from '@/i18n/routing';
import { auth } from '@/auth';
import { asRole } from '@/auth.config';
import { assertAuthEnv } from '@/auth.env';
import { SignInGate } from '../SignInGate';
import { DevSubnav } from '../Subnav';
import { NoAccess } from '../NoAccess';
import { ServicesShell } from './ServicesShell';

// Reads the session (cookies) and live data → must be dynamic.
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return { robots: { index: false, follow: false } };
  const t = await getTranslations({ locale, namespace: 'dashboard.services' });
  return {
    title: `${t('title')} — furchert.ch`,
    robots: { index: false, follow: false },
  };
}

export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  // Same defence-in-depth as /dashboard (#10): fail loud on missing OIDC env.
  assertAuthEnv();

  let session: Session | null = null;
  try {
    session = await auth();
  } catch (err) {
    console.warn('[dashboard] auth() threw; treating as unauthenticated', err);
  }
  if (!session) return <SignInGate locale={locale} returnPath="/dashboard/services" />;

  // ADMIN gate. `asRole` collapses anything but the literal 'ADMIN' to
  // 'USER', so a missing or forged role fails closed.
  if (asRole(session.user?.role) !== 'ADMIN') {
    return (
      <>
        <DevSubnav active="services" />
        <NoAccess />
      </>
    );
  }

  return (
    <>
      <DevSubnav active="services" />
      <ServicesShell locale={locale} />
    </>
  );
}
