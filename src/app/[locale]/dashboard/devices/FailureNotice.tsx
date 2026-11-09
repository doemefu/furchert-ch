// Honest failure state for a section whose device-service call failed
// (never mock data in its place). Same card as `../auth/FailureNotice.tsx`.
import { getTranslations } from 'next-intl/server';
import type { DeviceAdminFailureKind } from '@/lib/deviceadmin/client';
import { Pill, cardStyle } from '../auth/ui';

export async function FailureNotice({ kind }: { kind: DeviceAdminFailureKind }) {
  const t = await getTranslations('dashboard.deviceAdmin.states');
  const tone = kind === 'not_found' || kind === 'disabled' ? 'mute' : 'err';
  return (
    <div role="status" style={{ ...cardStyle, padding: '1.25rem', display: 'flex', gap: '.75rem', alignItems: 'baseline' }}>
      <Pill tone={tone}>{kind.replaceAll('_', ' ')}</Pill>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 'var(--fs-12)', color: 'var(--n-70)', lineHeight: 1.5 }}>{t(kind)}</p>
    </div>
  );
}
