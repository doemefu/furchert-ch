// Dev Area subnav — ported from prototype `projects-board.jsx:65-93`.
// Phase 5 only enables the "Overview" tab; Auth/Device tabs are visibly
// disabled until Phase 6 wires up the admin GUIs (TODO(phase6) below).
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

type DevSubnavActive = 'overview';

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
  color: 'var(--n-40)',
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
  color: 'var(--n-50)',
  borderBottom: '2px solid transparent',
};

const tabDisabled = {
  color: 'var(--n-40)',
  borderBottom: '2px solid transparent',
  cursor: 'not-allowed' as const,
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

        {/* TODO(phase6): swap these <button disabled>s for <Link href="/dashboard/auth">
            and <Link href="/dashboard/devices"> once the admin GUIs ship. */}
        <button type="button" disabled style={{ ...tabBase, ...tabDisabled }}>
          {t('authService')} <span style={{ color: 'var(--n-30)' }}>· {t('soon')}</span>
        </button>
        <button type="button" disabled style={{ ...tabBase, ...tabDisabled }}>
          {t('deviceService')} <span style={{ color: 'var(--n-30)' }}>· {t('soon')}</span>
        </button>
      </div>
    </div>
  );
}
