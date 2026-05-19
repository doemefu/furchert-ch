import { DM_Sans, DM_Mono } from 'next/font/google';

// Mirrors the prototype's Google Fonts import:
// DM Sans (opsz, weights 300/400/500) + DM Mono (400/500).
export const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--sans',
  display: 'swap',
});

export const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--mono',
  display: 'swap',
});
