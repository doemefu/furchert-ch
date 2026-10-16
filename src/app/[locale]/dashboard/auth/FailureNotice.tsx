// Honest failure state for a section whose auth-service call failed
// (never mock data in its place).
import { getTranslations } from 'next-intl/server';
import type { AuthAdminFailureKind } from '@/lib/authadmin/client';
import { Pill, cardStyle } from './ui';

export async function FailureNotice({ kind }: { kind: AuthAdminFailureKind }) {
  const t = await getTranslations('dashboard.authAdmin.states');
  const tone = kind === 'not_found' || kind === 'disabled' ? 'mute' : 'err';
  return (
    <div role="status" style={{ ...cardStyle, padding: '1.25rem', display: 'flex', gap: '.75rem', alignItems: 'baseline' }}>
      <Pill tone={tone}>{kind.replaceAll('_', ' ')}</Pill>
      <p style={{ fontFamily: 'var(--mono)', fontSize: '.75rem', color: 'var(--n-70)', lineHeight: 1.5 }}>{t(kind)}</p>
    </div>
  );
}
