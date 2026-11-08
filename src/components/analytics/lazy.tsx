'use client';

// The only analytics imports the layout and the Footer may use. Turbopack
// puts every client component a layout imports into the layout's shared
// chunk, rendered or not; behind next/dynamic the consent code lives in
// async chunks that the browser fetches only when the component renders, so
// a dark build (ANALYTICS_UI_ENABLED = false) ships none of it.
import dynamic from 'next/dynamic';

export const LazyAnalytics = dynamic(() => import('./Analytics').then((m) => m.Analytics), { ssr: false });

export const LazyPrivacySettingsLink = dynamic(() =>
  import('./PrivacySettingsLink').then((m) => m.PrivacySettingsLink),
);
