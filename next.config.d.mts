// Types for `next.config.mjs` so TypeScript code (the security-header unit
// test) can import it while `allowJs` stays off (#42).
import type { NextConfig } from 'next';

declare const config: NextConfig;
export default config;
