import type { MetadataRoute } from 'next';

// The i18n proxy matcher excludes dotted paths, so /robots.txt is served
// un-prefixed. The real dashboard lives at /[locale]/dashboard, so the bare
// /dashboard rule does not cover it — disallow the locale-prefixed paths too
// (worklog F6).
//
// Content Signals (contentsignals.org), owner decision: search and AI answers
// yes, AI training no. Cloudflare's managed robots.txt is prepended to this
// file and already says search=yes, ai-train=no and blocks known training
// crawlers, but it never sets ai-input; that one has to come from here. The
// two `User-agent: *` groups agree, and crawlers merge same-agent groups.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/de/dashboard', '/en/dashboard', '/api'],
      other: { 'Content-Signal': 'search=yes, ai-input=yes, ai-train=no' },
    },
    sitemap: 'https://furchert.ch/sitemap.xml',
  };
}
