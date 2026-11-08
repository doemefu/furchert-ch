'use client';

// The only analytics imports the layout and the Footer may use. Turbopack
// puts every client component a layout imports into the layout's shared
// chunk, rendered or not; behind next/dynamic the consent code lives in
// async chunks that the browser fetches only when the component renders, so
// a dark build (ANALYTICS_UI_ENABLED = false) ships none of it.
import dynamic from 'next/dynamic';

export const LazyAnalytics = dynamic(() => import('./Analytics').then((m) => m.Analytics), { ssr: false });

// `ssr: false` for the footer button too: a server-rendered dynamic component
// gets its chunk preloaded by every prerendered page (F1, review of #159).
// It mounts after hydration at the end of the footer's legal row, below the
// fold, so it shifts nothing in view.
export const LazyPrivacySettingsLink = dynamic(
  () => import('./PrivacySettingsLink').then((m) => m.PrivacySettingsLink),
  { ssr: false },
);
