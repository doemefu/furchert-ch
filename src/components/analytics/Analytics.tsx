'use client';

// Mount point of first-party web analytics (spec 100 §3.10, §10.1; WA-2a
// #153). Rendered by the locale layout only while ANALYTICS_UI_ENABLED is
// true. Starts the consent controller, forwards `storage` (other tabs) and
// `pageshow` (bfcache) events to it, and shows the consent bar while the
// controller says so. The bar's code is loaded only then (next/dynamic).
// The footer link is a pure view: it gets the state through CONSENT_UI_EVENT
// and asks for a reopen through CONSENT_REOPEN_EVENT (ids.ts).
//
// The bar is portalled into a host that is the FIRST child of <body>: first
// in focus order, and outside <main className="page-enter">, whose entry
// animation leaves a transform that would pin a fixed element to <main>
// (PR #146). Visually it is fixed to the bottom (globals.css).
import dynamic from 'next/dynamic';
import { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from '@/i18n/navigation';
import {
  getConsentController,
  getConsentSnapshot,
  getServerConsentSnapshot,
  subscribeConsent,
} from '@/lib/analytics/controller';
import { CONSENT_REOPEN_EVENT, CONSENT_UI_EVENT, type ConsentUiState } from './ids';

const ConsentBar = dynamic(() => import('./ConsentBar').then((m) => m.ConsentBar), { ssr: false });

let host: HTMLElement | null = null;

// Idempotent: creates the host once and keeps it first in <body>.
function portalHost(): HTMLElement {
  host ??= document.createElement('div');
  if (document.body.firstChild !== host) document.body.prepend(host);
  return host;
}

export function Analytics() {
  const path = usePathname();
  const snapshot = useSyncExternalStore(subscribeConsent, getConsentSnapshot, getServerConsentSnapshot);

  useEffect(() => {
    void getConsentController().init(path);
  }, [path]);

  useEffect(() => {
    const controller = getConsentController();
    const onStorage = (e: StorageEvent) => controller.onStorage(e.key, e.newValue);
    const onPageShow = (e: PageTransitionEvent) => controller.onPageShow(e.persisted);
    const onReopen = () => controller.reopen();
    window.addEventListener('storage', onStorage);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener(CONSENT_REOPEN_EVENT, onReopen);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener(CONSENT_REOPEN_EVENT, onReopen);
    };
  }, []);

  // Tell the footer link (PrivacySettingsLink.tsx) the current state.
  const { ready, choice, barOpen } = snapshot;
  useEffect(() => {
    if (!ready) return;
    const detail: ConsentUiState = { choice, barOpen };
    window.dispatchEvent(new CustomEvent(CONSENT_UI_EVENT, { detail }));
  }, [ready, choice, barOpen]);

  // The server snapshot never opens the bar, so this only runs in the browser.
  if (!snapshot.barOpen) return null;
  return createPortal(<ConsentBar reopened={snapshot.reopened} choice={snapshot.choice} />, portalHost());
}
