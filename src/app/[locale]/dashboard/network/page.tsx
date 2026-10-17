// /[locale]/dashboard/network — ADMIN-only network monitoring page
// (NM-1, #61; contract: infrastructure/docs/060-network-monitoring.md §8).
// Gate order: OIDC env assertion → session (else SignInGate) → ADMIN role
// (else NoAccess). Only after all three does NetworkShell render and fetch
// anything from data-service, so no IP-level data is ever requested for a
// non-admin.
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
import { NetworkShell } from './NetworkShell';
import { first, parseCursor, parseIp, parseOutcome, parsePinnedWindow, parseRange, type SearchParams } from './searchParams';

// Reads the session (cookies) and live data → must be dynamic.
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return { robots: { index: false, follow: false } };
  const t = await getTranslations({ locale, namespace: 'dashboard.network' });
  return {
    title: `${t('title')} — furchert.ch`,
    robots: { index: false, follow: false },
  };
}

export default async function NetworkPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
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
  if (!session) return <SignInGate locale={locale} returnPath="/dashboard/network" />;

  // ADMIN gate (§8). `asRole` collapses anything but the literal 'ADMIN' to
  // 'USER', so a missing or forged role fails closed.
  if (asRole(session.user?.role) !== 'ADMIN') {
    return (
      <>
        <DevSubnav active="network" />
        <NoAccess />
      </>
    );
  }

  const sp = await searchParams;
  const range = parseRange(first(sp.window));
  const { ip, invalid: invalidIp } = parseIp(first(sp.ip));
  const fwCursor = parseCursor(first(sp.fwCursor));
  // A pinned window only makes sense together with a cursor.
  const fwWindow = fwCursor ? parsePinnedWindow(first(sp.fwFrom), first(sp.fwTo)) : undefined;
  // Login events (NM-4): outcome filter and paging, same rules as the firewall.
  const lgOutcome = parseOutcome(first(sp.lgOutcome));
  const lgCursor = parseCursor(first(sp.lgCursor));
  const lgWindow = lgCursor ? parsePinnedWindow(first(sp.lgFrom), first(sp.lgTo)) : undefined;

  return (
    <>
      <DevSubnav active="network" />
      <NetworkShell
        locale={locale}
        range={range}
        ip={ip}
        invalidIp={invalidIp}
        fwCursor={fwCursor}
        fwWindow={fwWindow}
        lgOutcome={lgOutcome}
        lgCursor={lgCursor}
        lgWindow={lgWindow}
      />
    </>
  );
}
