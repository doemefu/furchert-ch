'use client';

// "Never track this browser" (spec 100 §9.3, D8; WA-4a #155) on
// /dashboard/analytics. Bound to the page's consent controller (one instance
// per page on globalThis, review H1). On: `fa_optout` is stored first, then
// tracking stops and in-flight requests are aborted, then the forget runs
// (controller.optOut, §4.4); `fa_consent` stays as chosen, so switching off
// restores the previous state. Per browser/device, not tied to signing in.
// While the analytics UI is dark the switch still works and says that
// tracking is not live yet (lead ruling Q1).
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { getConsentController, getConsentSnapshot, getServerConsentSnapshot, subscribeConsent } from '@/lib/analytics/controller';
import { cardStyle, chipActive, chipBase, noteStyle } from '@/app/[locale]/dashboard/analytics/ui';

export function NeverTrackSwitch({ uiEnabled }: { uiEnabled: boolean }) {
  const t = useTranslations('dashboard.analytics.browser');
  const path = usePathname();
  const snap = useSyncExternalStore(subscribeConsent, getConsentSnapshot, getServerConsentSnapshot);
  const [pending, setPending] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const controller = getConsentController();
    void controller.init(path);
    // While the analytics UI is dark no <Analytics /> forwards other tabs' changes.
    const onStorage = (e: StorageEvent) => controller.onStorage(e.key, e.newValue);
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [path]);

  const on = snap.optedOut;
  const toggle = async () => {
    setPending(true);
    const stored = await getConsentController().optOut(!on);
    setBlocked(!stored);
    setPending(false);
  };

  return (
    <div id="fa-never-track" style={{ ...cardStyle, display: 'grid', gap: '.6rem', maxWidth: '40rem' }}>
      <p style={{ fontSize: '.9rem', color: 'var(--n-90)' }}>{snap.ready ? (on ? t('on') : t('off')) : '…'}</p>
      <div>
        <button type="button" aria-pressed={on} disabled={!snap.ready || pending} onClick={() => void toggle()} style={on ? chipBase : chipActive}>
          {on ? t('turnOff') : t('turnOn')}
        </button>
      </div>
      <p style={noteStyle}>{t('perBrowser')}</p>
      {!uiEnabled && <p style={noteStyle}>{t('notLive')}</p>}
      {blocked && (
        <p role="status" style={noteStyle}>
          {t('storageBlocked')}
        </p>
      )}
    </div>
  );
}
