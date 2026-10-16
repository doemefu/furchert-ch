// Tab strip ported from prototype `auth-admin.jsx` AuthTabs. Tabs are
// server-rendered links (`?tab=`), like the network page's window chips, so
// switching needs no client JS and every tab is deep-linkable.
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { BORDER } from './ui';

export const AUTH_TABS = ['overview', 'users', 'clients', 'sessions', 'jwks', 'audit'] as const;
export type AuthTab = (typeof AUTH_TABS)[number];

export function parseTab(v: string | undefined): AuthTab {
  return AUTH_TABS.includes(v as AuthTab) ? (v as AuthTab) : 'overview';
}

export async function AuthTabs({ tab }: { tab: AuthTab }) {
  const t = await getTranslations('dashboard.authAdmin.tabs');
  return (
    <nav aria-label="Auth Service" style={{ display: 'flex', gap: '.25rem', flexWrap: 'wrap', borderBottom: BORDER }}>
      {AUTH_TABS.map((id) => {
        const active = tab === id;
        return (
          <Link
            key={id}
            href={id === 'overview' ? '/dashboard/auth' : `/dashboard/auth?tab=${id}`}
            aria-current={active ? 'page' : undefined}
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '.7rem',
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              padding: '.7rem 1rem',
              textDecoration: 'none',
              color: active ? 'var(--n-100)' : 'var(--n-60)',
              borderBottom: active ? '2px solid var(--n-100)' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            {t(id)}
          </Link>
        );
      })}
    </nav>
  );
}
