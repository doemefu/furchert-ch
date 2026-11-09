'use client';

// Mount point of first-party web analytics (spec 100 §3.10, §10.1; WA-2a
// #153). Rendered by the locale layout while ANALYTICS_UI_ENABLED is true
// (live since WA-6 #158). Starts the consent controller, forwards `storage` (other tabs) and
// `pageshow` (bfcache) events to it, and shows the consent bar while the
// controller says so. The bar's code is loaded only then (next/dynamic).
// The footer link is a pure view: it gets the state through CONSENT_UI_EVENT
// and asks for a reopen through CONSENT_REOPEN_EVENT (ids.ts). It also feeds
// the controller the locale-free path (soft navigations become pageviews)
// and the Auth.js session status.
//
// The bar is portalled into a host that is the FIRST child of <body>, outside
// <main className="page-enter">, whose entry animation leaves a transform that
// would pin a fixed element to <main> (PR #146). Visually it is fixed to the
// bottom (globals.css). Since WA-6 (#158) the bar first appears on the first
// interaction, so a keyboard user's first Tab already moved focus past the
// host: the bar is no longer first in focus order on that first pass (it is
// reached with Shift+Tab or on the next cycle; the footer link focuses it).
import dynamic from 'next/dynamic';
import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { usePathname } from '@/i18n/navigation';
import {
  getConsentController,
  getConsentSnapshot,
  getServerConsentSnapshot,
  subscribeConsent,
} from '@/lib/analytics/controller';
import { CONSENT_REOPEN_EVENT, CONSENT_UI_EVENT, CONSENT_UI_REQUEST_EVENT, type ConsentUiState } from './ids';

const ConsentBar = dynamic(() => import('./ConsentBar').then((m) => m.ConsentBar), { ssr: false });

// Tells the footer link (PrivacySettingsLink.tsx) the current state.
function announce() {
  const { ready, choice, barOpen } = getConsentController().getSnapshot();
  if (!ready) return;
  const detail: ConsentUiState = { choice, barOpen };
  window.dispatchEvent(new CustomEvent(CONSENT_UI_EVENT, { detail }));
}

export function Analytics() {
  const path = usePathname();
  const snapshot = useSyncExternalStore(subscribeConsent, getConsentSnapshot, getServerConsentSnapshot);
  // Detached until the bar opens. Analytics is client-only (`ssr: false` in
  // lazy.tsx), so `document` exists here.
  const [host] = useState(() => document.createElement('div'));

  useEffect(() => {
    void getConsentController().init(path);
  }, [path]);

  // Signed-in visitors are never tracked (§3.4, D8); `loading` holds the first pageview.
  const { status } = useSession();
  useEffect(() => {
    getConsentController().setSession(status);
  }, [status]);

  useEffect(() => {
    const controller = getConsentController();
    const onStorage = (e: StorageEvent) => controller.onStorage(e.key, e.newValue);
    const onPageShow = (e: PageTransitionEvent) => controller.onPageShow(e.persisted);
    const onReopen = () => controller.reopen();
    window.addEventListener('storage', onStorage);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener(CONSENT_REOPEN_EVENT, onReopen);
    window.addEventListener(CONSENT_UI_REQUEST_EVENT, announce);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener(CONSENT_REOPEN_EVENT, onReopen);
      window.removeEventListener(CONSENT_UI_REQUEST_EVENT, announce);
    };
  }, []);

  // Announce every change to the footer link.
  const { ready, choice, barOpen } = snapshot;
  useEffect(() => {
    if (ready) announce();
  }, [ready, choice, barOpen]);

  // While the bar is open the host is the first child of <body>; attached in
  // a layout effect, before paint and before the bar's own effects run.
  useLayoutEffect(() => {
    if (!barOpen) return;
    document.body.prepend(host);
    return () => host.remove();
  }, [barOpen, host]);

  if (!barOpen) return null;
  return createPortal(<ConsentBar reopened={snapshot.reopened} choice={choice} by={snapshot.by} />, host);
}
