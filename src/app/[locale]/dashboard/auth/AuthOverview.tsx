// Overview tab, ported from prototype `auth-admin.jsx` AuthOverview. Stat
// tiles show only what auth-service actually reports (user list, device
// clients, JWKS); "Token TTL" is the documented configuration
// (../auth-service/INTERFACES.md, Important Notes #2) and labelled as such.
// The prototype's audit feed has no API and is replaced by a pointer to the
// network page's login events.
import type { CSSProperties } from 'react';
import { getTranslations } from 'next-intl/server';
import { Icon } from '@/components/ui/Icon';
import { StatusDot } from '@/components/ui/StatusDot';
import { Link } from '@/i18n/navigation';
import type { AuthAdminResult, DeviceClient, JwksKey, UserPage } from '@/lib/authadmin/client';
import { MetaCard, MonoLabel, cardStyle } from './ui';

const bannerLink: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '.4rem',
  fontFamily: 'var(--mono)',
  fontSize: '.68rem',
  letterSpacing: '.04em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  border: '1px solid rgba(255,255,255,.25)',
  borderRadius: '2px',
  padding: '.5rem .8rem',
  color: 'var(--white)',
};

const actionStyle: CSSProperties = {
  textAlign: 'left',
  padding: '.7rem .85rem',
  background: 'var(--n-10)',
  border: '1px solid rgba(162,167,176,.3)',
  borderRadius: '2px',
  fontFamily: 'var(--mono)',
  fontSize: '.7rem',
  letterSpacing: '.04em',
  textTransform: 'uppercase',
  color: 'var(--n-80)',
  textDecoration: 'none',
};

const ENDPOINTS: Array<[string, string]> = [
  ['GET', '/.well-known/openid-configuration'],
  ['GET', '/oauth2/jwks'],
  ['POST', '/oauth2/token'],
  ['GET', '/userinfo'],
  ['POST', '/connect/logout'],
  ['ANY', '/api/v1/users'],
  ['ANY', '/api/v1/clients'],
];

export async function AuthOverview({
  issuer,
  healthStatus,
  users,
  clients,
  jwks,
}: {
  issuer: string;
  healthStatus: string | null;
  users: AuthAdminResult<UserPage>;
  clients: AuthAdminResult<DeviceClient[]>;
  jwks: AuthAdminResult<JwksKey[]>;
}) {
  const t = await getTranslations('dashboard.authAdmin');
  const up = healthStatus === 'UP';

  let usersTile = <MetaCard label={t('overview.usersActive')} value={t('overview.na')} sub={t(`states.${users.ok ? 'unexpected' : users.kind}`)} tone="unknown" />;
  if (users.ok) {
    const list = users.data.users;
    const active = list.filter((u) => u.status === 'ACTIVE').length;
    const admins = list.filter((u) => u.role === 'ADMIN').length;
    const partial = users.data.totalElements > list.length;
    usersTile = (
      <MetaCard
        label={t('overview.usersActive')}
        value={partial ? `${active}+ / ${users.data.totalElements}` : `${active} / ${users.data.totalElements}`}
        sub={partial ? t('overview.usersFirstPage', { admins, count: list.length }) : t('overview.usersActiveSub', { admins })}
        tone="ok"
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Service banner */}
      <div
        style={{
          background: 'var(--n-100)',
          color: 'var(--white)',
          borderRadius: '2px',
          padding: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.4rem' }}>
            <StatusDot status={healthStatus === null ? 'unknown' : up ? 'online' : 'offline'} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: '.7rem', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--n-30)' }}>
              auth-service · {healthStatus === null ? t('statusUnknown') : healthStatus}
            </span>
          </div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: '1.5rem', fontWeight: 500, letterSpacing: '-.02em' }}>
            {t('overview.service')}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '.72rem', color: 'var(--n-40)', marginTop: '.35rem' }}>
            {t('overview.issuer', { issuer })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <a href={`${issuer}/.well-known/openid-configuration`} target="_blank" rel="noopener noreferrer" style={bannerLink}>
            {t('overview.discovery')} <Icon name="ext" size={10} />
          </a>
          <a href={`${issuer}/swagger-ui.html`} target="_blank" rel="noopener noreferrer" style={bannerLink}>
            {t('overview.swagger')} <Icon name="ext" size={10} />
          </a>
        </div>
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '.75rem' }}>
        {usersTile}
        <MetaCard
          label={t('overview.deviceClients')}
          value={clients.ok ? clients.data.length : t('overview.na')}
          sub={clients.ok ? t('overview.deviceClientsSub') : t(`states.${clients.kind}`)}
          tone={clients.ok ? 'ok' : 'unknown'}
        />
        <MetaCard label={t('overview.tokenTtl')} value={t('overview.tokenTtlValue')} sub={t('overview.tokenTtlSub')} />
        <MetaCard
          label={t('overview.signingKeys')}
          value={jwks.ok ? (jwks.data[0]?.kid ?? jwks.data.length) : t('overview.na')}
          sub={jwks.ok ? t('overview.signingKeysSub') : t(`states.${jwks.kind}`)}
          tone={jwks.ok ? 'ok' : 'unknown'}
        />
      </div>

      {/* Two-col: actions + activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        <div style={{ ...cardStyle, padding: '1.25rem' }}>
          <MonoLabel mb=".75rem">{t('overview.quickActions')}</MonoLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
            <Link href="/dashboard/auth?tab=users" style={actionStyle}>→ {t('overview.createUser')}</Link>
            <Link href="/dashboard/auth?tab=users" style={actionStyle}>→ {t('overview.resetPassword')}</Link>
            <Link href="/dashboard/auth?tab=clients" style={actionStyle}>→ {t('overview.manageClients')}</Link>
            <Link href="/dashboard/auth?tab=jwks" style={actionStyle}>→ {t('overview.viewKeys')}</Link>
          </div>

          <MonoLabel mt="1.5rem" mb=".5rem">{t('overview.endpoints')}</MonoLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem', fontFamily: 'var(--mono)', fontSize: '.72rem', color: 'var(--n-70)' }}>
            {ENDPOINTS.map(([m, p]) => (
              <div key={p} style={{ display: 'flex', gap: '.6rem', padding: '.3rem 0', borderBottom: '1px dashed rgba(162,167,176,.22)' }}>
                <span style={{ width: 46, color: m === 'POST' ? '#a16207' : m === 'GET' ? '#15803d' : 'var(--n-50)' }}>{m}</span>
                <span style={{ color: 'var(--n-90)' }}>{p}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...cardStyle, padding: '1.25rem' }}>
          <MonoLabel mb=".75rem">{t('overview.recentActivity')}</MonoLabel>
          <p style={{ fontSize: '.85rem', color: 'var(--n-60)', lineHeight: 1.55, marginBottom: '1rem' }}>{t('overview.recentActivityBody')}</p>
          <Link
            href="/dashboard/network#netmon-logins"
            style={{ fontFamily: 'var(--mono)', fontSize: '.65rem', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--blue-base)', textDecoration: 'none' }}
          >
            {t('overview.toNetwork')}
          </Link>
        </div>
      </div>
    </div>
  );
}
