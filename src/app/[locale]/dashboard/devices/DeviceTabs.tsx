// Tab strip for /dashboard/devices, same markup as `../auth/AuthTabs.tsx`:
// server-rendered links (`?tab=`), no client JS, every tab deep-linkable.
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { BORDER } from '../auth/ui';

export const DEVICE_TABS = ['overview', 'devices', 'schedules'] as const;
export type DeviceTab = (typeof DEVICE_TABS)[number];

export function parseTab(v: string | undefined): DeviceTab {
  return DEVICE_TABS.includes(v as DeviceTab) ? (v as DeviceTab) : 'overview';
}

export async function DeviceTabs({ tab }: { tab: DeviceTab }) {
  const t = await getTranslations('dashboard.deviceAdmin.tabs');
  return (
    <nav aria-label="Device Service" style={{ display: 'flex', gap: '.25rem', flexWrap: 'wrap', borderBottom: BORDER }}>
      {DEVICE_TABS.map((id) => {
        const active = tab === id;
        return (
          <Link
            key={id}
            href={id === 'overview' ? '/dashboard/devices' : `/dashboard/devices?tab=${id}`}
            aria-current={active ? 'page' : undefined}
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 'var(--fs-12)',
              letterSpacing: '.05em',
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
