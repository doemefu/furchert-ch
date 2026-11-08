// Dev Area subnav — ported from prototype `projects-board.jsx:65-93`.
// "Overview", "Network" (NM-1, #61), "Services" (#47), "Auth Service" (#44)
// and "Device Service" (#45) are live. Network, Services, Auth Service and
// Device Service are shown to every signed-in user — each page decides
// access itself (ADMIN only).
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

type DevSubnavActive = 'overview' | 'network' | 'services' | 'auth' | 'devices';

const containerStyle = {
  borderBottom: '1px solid rgba(162,167,176,.22)',
  background: 'var(--white)',
} as const;

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0',
  overflowX: 'auto' as const,
};

const devAreaLabelStyle = {
  fontFamily: 'var(--mono)',
  fontSize: '.65rem',
  letterSpacing: '.08em',
  textTransform: 'uppercase' as const,
  color: 'var(--n-60)',
  paddingRight: '1rem',
  borderRight: '1px solid rgba(162,167,176,.2)',
  whiteSpace: 'nowrap' as const,
};

const tabBase = {
  fontFamily: 'var(--mono)',
  fontSize: '.72rem',
  letterSpacing: '.04em',
  textTransform: 'uppercase' as const,
  background: 'none',
  border: 'none',
  padding: '.85rem 1rem',
  whiteSpace: 'nowrap' as const,
  textDecoration: 'none',
  marginBottom: -1,
  display: 'inline-block',
} as const;

const tabActive = {
  color: 'var(--n-100)',
  borderBottom: '2px solid var(--blue-base)',
};

const tabInactive = {
  color: 'var(--n-60)',
  borderBottom: '2px solid transparent',
};

export async function DevSubnav({ active }: { active: DevSubnavActive }) {
  const t = await getTranslations('dashboard.subnav');

  return (
    <div style={containerStyle}>
      <div className="container border-x" style={rowStyle}>
        <span style={devAreaLabelStyle}>{t('devArea')}</span>

        <Link
          href="/dashboard"
          aria-current={active === 'overview' ? 'page' : undefined}
          style={{ ...tabBase, ...(active === 'overview' ? tabActive : tabInactive) }}
        >
          {t('overview')}
        </Link>

        <Link
          href="/dashboard/network"
          aria-current={active === 'network' ? 'page' : undefined}
          style={{ ...tabBase, ...(active === 'network' ? tabActive : tabInactive) }}
        >
          {t('network')}
        </Link>

        <Link
          href="/dashboard/services"
          aria-current={active === 'services' ? 'page' : undefined}
          style={{ ...tabBase, ...(active === 'services' ? tabActive : tabInactive) }}
        >
          {t('services')}
        </Link>

        <Link
          href="/dashboard/auth"
          aria-current={active === 'auth' ? 'page' : undefined}
          style={{ ...tabBase, ...(active === 'auth' ? tabActive : tabInactive) }}
        >
          {t('authService')}
        </Link>

        <Link
          href="/dashboard/devices"
          aria-current={active === 'devices' ? 'page' : undefined}
          style={{ ...tabBase, ...(active === 'devices' ? tabActive : tabInactive) }}
        >
          {t('deviceService')}
        </Link>
      </div>
    </div>
  );
}
