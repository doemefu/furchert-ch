import { DM_Mono } from 'next/font/google';

// DM Mono for the dashboard only (ETHON look, redesign spec «Abgrenzung
// Dashboard»). Public pages never import this module, so they never download
// the file. Apply `dmMono.variable` (sets `--mono`) next to `.ethon`, also on
// portalled overlays that sit outside the dashboard layout wrapper.
export const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--mono',
  display: 'swap',
});
