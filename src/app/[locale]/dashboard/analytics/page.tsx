// /[locale]/dashboard/analytics — ADMIN-only web analytics (spec 100 §9;
// WA-4a #155). Gate order as /dashboard/network: OIDC env assertion →
// session (else SignInGate) → ADMIN role (else NoAccess). Only after all
// three does AnalyticsShell render and fetch anything from data-service (C16).
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
import { AnalyticsShell } from './AnalyticsShell';
import { parseControls, type SearchParams } from './searchParams';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return { robots: { index: false, follow: false } };
  const t = await getTranslations({ locale, namespace: 'dashboard.analytics' });
  return { title: `${t('title')} — furchert.ch`, robots: { index: false, follow: false } };
}

export default async function AnalyticsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  assertAuthEnv();

  let session: Session | null = null;
  try {
    session = await auth();
  } catch (err) {
    console.warn('[dashboard] auth() threw; treating as unauthenticated', err);
  }
  if (!session) return <SignInGate locale={locale} returnPath="/dashboard/analytics" />;
  if (asRole(session.user?.role) !== 'ADMIN') {
    return (
      <>
        <DevSubnav active="analytics" />
        <NoAccess />
      </>
    );
  }

  const controls = parseControls(await searchParams);
  return (
    <>
      <DevSubnav active="analytics" />
      <AnalyticsShell locale={locale} controls={controls} />
    </>
  );
}
