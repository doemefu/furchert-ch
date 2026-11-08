'use client';

// Footer "Datenschutz-Einstellungen" / "Privacy settings" (spec 100 §10.1;
// WA-2a #153): reopens the consent bar and shows the current choice. Rendered
// by the Footer only while ANALYTICS_UI_ENABLED is true; never on
// /dashboard/**, where there is no bar. A button, not a link: it opens the
// bar in place and navigates nowhere.
//
// It holds no consent logic: Analytics.tsx owns the controller and announces
// `{ choice, barOpen }` with CONSENT_UI_EVENT; a click asks it to reopen the
// bar with CONSENT_REOPEN_EVENT. On subscribe it asks for the current state
// (CONSENT_UI_REQUEST_EVENT), so the load order of the two chunks does not
// matter. Until Analytics has answered, the label shows without a state.
import { useSyncExternalStore, type CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { isBarSuppressedPath } from '@/lib/analytics/paths';
import {
  CONSENT_BAR_ID,
  CONSENT_REOPEN_EVENT,
  CONSENT_UI_EVENT,
  CONSENT_UI_REQUEST_EVENT,
  PRIVACY_SETTINGS_ID,
  type ConsentUiState,
} from './ids';

let ui: ConsentUiState | null = null;

function subscribe(onChange: () => void) {
  const listener = (e: Event) => {
    ui = (e as CustomEvent<ConsentUiState>).detail;
    onChange();
  };
  window.addEventListener(CONSENT_UI_EVENT, listener);
  // Whichever loads first: if Analytics is already running it answers now,
  // otherwise its first announcement arrives once it is ready.
  window.dispatchEvent(new Event(CONSENT_UI_REQUEST_EVENT));
  return () => window.removeEventListener(CONSENT_UI_EVENT, listener);
}
const getSnapshot = () => ui;
const getServerSnapshot = () => null;

export function PrivacySettingsLink({ style }: { style: CSSProperties }) {
  const t = useTranslations();
  const path = usePathname();
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (isBarSuppressedPath(path)) return null;

  const label =
    state?.choice === 'granted'
      ? t('analytics.consent.currentGranted')
      : state?.choice === 'denied'
        ? t('analytics.consent.currentDenied')
        : null;

  return (
    <button
      type="button"
      id={PRIVACY_SETTINGS_ID}
      className="footer-settings"
      style={style}
      aria-controls={state?.barOpen ? CONSENT_BAR_ID : undefined}
      onClick={() => window.dispatchEvent(new Event(CONSENT_REOPEN_EVENT))}
    >
      {t('footer.privacySettings')}
      {label && ` (${label})`}
    </button>
  );
}
