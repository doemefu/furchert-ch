'use client';

// The never-track switch's loader (WA-4a #155, review M8): its own module,
// imported only by /dashboard/analytics, so the switch and its copy of the
// consent controller live in a client-only async chunk that only that
// ADMIN page fetches. The controller itself is a globalThis singleton, so a
// second bundled copy never creates a second controller (H1).
import dynamic from 'next/dynamic';

export const LazyNeverTrackSwitch = dynamic(() => import('./NeverTrackSwitch').then((m) => m.NeverTrackSwitch), { ssr: false });
