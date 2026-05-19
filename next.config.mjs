import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for the container image (Phase 7 / Dockerfile).
  output: 'standalone',
  reactStrictMode: true,
};

export default withNextIntl(nextConfig);
