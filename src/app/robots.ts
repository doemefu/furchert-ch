import type { MetadataRoute } from 'next';

// The i18n middleware matcher excludes dotted paths, so /robots.txt is served
// un-prefixed. The real dashboard lives at /[locale]/dashboard, so the bare
// /dashboard rule does not cover it — disallow the locale-prefixed paths too
// (worklog F6).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/de/dashboard', '/en/dashboard', '/api'],
    },
    sitemap: 'https://furchert.ch/sitemap.xml',
  };
}
