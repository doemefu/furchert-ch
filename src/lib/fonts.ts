import { Archivo } from 'next/font/google';

// Archivo, variable (weight omitted = 100-900) with the width axis: body text
// renders at 100%, display headings will use --stretch-display / --stretch-heading (see globals.css).
// Self-hosted at build time; next/font adds a metric-matched "Archivo Fallback".
export const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
  adjustFontFallback: true,
  fallback: ['Helvetica Neue', 'Arial', 'system-ui', 'sans-serif'],
});
