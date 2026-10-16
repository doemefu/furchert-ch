// /[locale]/dashboard/auth — ADMIN-only auth-service admin GUI (#44, Epic
// #43). Ported from prototype `auth-admin.jsx` PageAuthAdmin.
// Gate order (same as /dashboard/network): OIDC env assertion → session
// (else SignInGate) → ADMIN role (else NoAccess) → a usable access token for
// auth-service (else ReauthNotice). Only then is auth-service called, with
// the admin's own token, server-side. Mutations are Server Actions
// (`actions.ts`) that repeat every check. Tabs without an auth-service API
// (sessions, audit) render labelled placeholders, never mock data.
import type { Metadata } from 'next';
import type { Session } from 'next-auth';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { isLocale, type Locale } from '@/i18n/routing';
import { auth } from '@/auth';
import { asRole } from '@/auth.config';
import { AUTH_ENV, assertAuthEnv } from '@/auth.env';
import { Icon } from '@/components/ui/Icon';
import { shouldAttemptAuthAdmin } from '@/authadmin.env';
import { getAdminAccessToken } from '@/lib/authadmin/accessToken';
import {
  getHealth,
  getJwks,
  listDeviceClients,
  listUsers,
  type AuthAdminResult,
} from '@/lib/authadmin/client';
import { SignInGate } from '../SignInGate';
import { DevSubnav } from '../Subnav';
import { NoAccess } from '../NoAccess';
import { LOCALE_TAG } from '../datetime';
import { AuthTabs, parseTab, type AuthTab } from './AuthTabs';
import { AuthOverview } from './AuthOverview';
import { ClientsPanel } from './ClientsPanel';
import { FailureNotice } from './FailureNotice';
import { JwksPanel } from './JwksPanel';
import { ReauthNotice } from './ReauthNotice';
import { UsersPanel } from './UsersPanel';
import { BORDER, Pill, UnavailableCard } from './ui';

// Reads the session (cookies) and live data → must be dynamic.
export const dynamic = 'force-dynamic';

const USERS_PAGE_SIZE = 50;
// The overview counts users from one larger page (auth-service caps size at 100).
const OVERVIEW_USERS_SIZE = 100;
const MAX_PAGE = 10_000;

type SearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function parsePage(v: string | undefined): number {
  if (!v || !/^\d{1,5}$/.test(v)) return 0;
  return Math.min(Number(v), MAX_PAGE);
}

function makeFormatters(locale: Locale) {
  const tag = LOCALE_TAG[locale];
  const abs = new Intl.DateTimeFormat(tag, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Zurich' });
  const rel = new Intl.RelativeTimeFormat(tag, { numeric: 'auto', style: 'short' });
  const now = Date.now();
  return {
    abs: (iso: string | null) => (iso && Number.isFinite(Date.parse(iso)) ? abs.format(new Date(iso)) : '—'),
    rel: (iso: string | null) => {
      const ms = iso ? Date.parse(iso) : NaN;
      if (!Number.isFinite(ms)) return '—';
      const s = Math.round((ms - now) / 1000);
      const a = Math.abs(s);
      if (a < 60) return rel.format(s, 'second');
      if (a < 3600) return rel.format(Math.round(s / 60), 'minute');
      if (a < 86400) return rel.format(Math.round(s / 3600), 'hour');
      return rel.format(Math.round(s / 86400), 'day');
    },
  };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return { robots: { index: false, follow: false } };
  const t = await getTranslations({ locale, namespace: 'dashboard.authAdmin' });
  return { title: `${t('title')} — furchert.ch`, robots: { index: false, follow: false } };
}

async function Header({ healthStatus }: { healthStatus: string | null }) {
  const t = await getTranslations('dashboard.authAdmin');
  const linkStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '.4rem',
    fontFamily: 'var(--mono)',
    fontSize: '.7rem',
    letterSpacing: '.04em',
    textTransform: 'uppercase' as const,
    textDecoration: 'none',
    color: 'var(--n-60)',
    border: '1px solid rgba(162,167,176,.3)',
    borderRadius: '2px',
    padding: '.4rem .75rem',
  };
  return (
    <div style={{ borderBottom: BORDER, background: 'var(--white)' }}>
      <div
        className="container border-x"
        style={{ padding: '1.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: 'var(--sans)', fontSize: '1.6rem', fontWeight: 500, letterSpacing: '-.02em', color: 'var(--n-100)' }}>
              {t('title')}
            </h1>
            <Pill tone="info">ADMIN</Pill>
            {healthStatus === null ? (
              <Pill tone="mute">{t('statusUnknown')}</Pill>
            ) : (
              <Pill tone={healthStatus === 'UP' ? 'ok' : 'err'}>{healthStatus === 'UP' ? t('statusUp') : t('statusDown')}</Pill>
            )}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '.72rem', color: 'var(--n-50)', marginTop: '.35rem' }}>{t('meta')}</div>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <a href="https://github.com/doemefu/homelab-auth-service" target="_blank" rel="noopener noreferrer" style={linkStyle}>
            <Icon name="github" size={12} /> {t('repo')}
          </a>
          <a href={`${AUTH_ENV.OIDC_ISSUER}/actuator/health`} target="_blank" rel="noopener noreferrer" style={linkStyle}>
            {t('health')} <Icon name="ext" size={10} />
          </a>
        </div>
      </div>
    </div>
  );
}

function Frame({ healthStatus, tab, children }: { healthStatus: string | null; tab: AuthTab; children: ReactNode }) {
  return (
    <div style={{ minHeight: '100svh', background: 'var(--n-10)' }}>
      <DevSubnav active="auth" />
      <Header healthStatus={healthStatus} />
      <div className="container border-x">
        <AuthTabs tab={tab} />
        <div style={{ padding: '1.75rem 0 3rem' }}>{children}</div>
      </div>
    </div>
  );
}

const unreachable = { ok: false, kind: 'unavailable' } as const;
async function settle<T>(p: Promise<AuthAdminResult<T>>): Promise<AuthAdminResult<T>> {
  try {
    return await p;
  } catch {
    return unreachable;
  }
}

export default async function AuthAdminPage({
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
  if (!session) return <SignInGate locale={locale} returnPath="/dashboard/auth" />;

  // ADMIN gate. `asRole` collapses anything but the literal 'ADMIN' to
  // 'USER', so a missing or forged role fails closed.
  if (asRole(session.user?.role) !== 'ADMIN') {
    return (
      <>
        <DevSubnav active="auth" />
        <NoAccess />
      </>
    );
  }

  const sp = await searchParams;
  const tab = parseTab(first(sp.tab));
  // Health is public and independent: fetch it alongside the token check.
  const healthPromise = settle(getHealth());

  // Local dev without AUTH_SERVICE_URL: say so, instead of letting an expired
  // token's refresh against the in-cluster FQDN end in "sign in again".
  if (!shouldAttemptAuthAdmin()) {
    const health = await healthPromise;
    const healthStatus = health.ok ? health.data.status : null;
    return (
      <Frame healthStatus={healthStatus} tab={tab}>
        <FailureNotice kind="disabled" />
      </Frame>
    );
  }

  const [health, token] = await Promise.all([healthPromise, getAdminAccessToken()]);
  const healthStatus = health.ok ? health.data.status : null;
  if (!token.ok) {
    return (
      <Frame healthStatus={healthStatus} tab={tab}>
        <ReauthNotice locale={locale} />
      </Frame>
    );
  }

  const t = await getTranslations('dashboard.authAdmin');
  const fmt = makeFormatters(locale);
  let body: ReactNode;

  if (tab === 'overview') {
    const [users, clients, jwks] = await Promise.all([
      settle(listUsers(token.token, 0, OVERVIEW_USERS_SIZE)),
      settle(listDeviceClients(token.token)),
      settle(getJwks()),
    ]);
    body = <AuthOverview issuer={AUTH_ENV.OIDC_ISSUER} healthStatus={healthStatus} users={users} clients={clients} jwks={jwks} />;
  } else if (tab === 'users') {
    const page = parsePage(first(sp.page));
    const r = await settle(listUsers(token.token, page, USERS_PAGE_SIZE));
    body = r.ok ? (
      <UsersPanel
        users={r.data.users.map((u) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          role: u.role,
          status: u.status,
          createdLabel: fmt.abs(u.createdAt),
          updatedLabel: fmt.rel(u.updatedAt),
        }))}
        page={r.data.page}
        size={r.data.size}
        total={r.data.totalElements}
        currentUsername={token.subject}
      />
    ) : r.kind === 'unauthorized' ? (
      <ReauthNotice locale={locale} />
    ) : (
      <FailureNotice kind={r.kind} />
    );
  } else if (tab === 'clients') {
    const r = await settle(listDeviceClients(token.token));
    body = r.ok ? (
      <ClientsPanel
        clients={r.data.map((c) => ({ clientId: c.clientId, description: c.description, scopes: c.scopes, createdLabel: fmt.abs(c.createdAt) }))}
      />
    ) : r.kind === 'unauthorized' ? (
      <ReauthNotice locale={locale} />
    ) : (
      <FailureNotice kind={r.kind} />
    );
  } else if (tab === 'jwks') {
    const r = await settle(getJwks());
    body = r.ok ? <JwksPanel keys={r.data} /> : <FailureNotice kind={r.kind} />;
  } else if (tab === 'sessions') {
    body = <UnavailableCard title={t('unavailable.sessionsTitle')} body={t('unavailable.sessionsBody')} />;
  } else {
    body = <UnavailableCard title={t('unavailable.auditTitle')} body={t('unavailable.auditBody')} />;
  }

  return (
    <Frame healthStatus={healthStatus} tab={tab}>
      {body}
    </Frame>
  );
}
