import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Security response headers (#42). Applied via `next.config.js` `headers()`,
// not `src/middleware.ts`, because the intl middleware's matcher
// (`'/((?!api|_next|_vercel|.*\\..*).*)'`) deliberately excludes `/api/*` —
// exactly the routes that need this too (the OIDC callback, federated
// logout, health check). `next.config.js` headers apply at the framework
// level to every matched route, API routes included.
//
// `'unsafe-inline'` appears in both `script-src` (Next.js's own App Router
// hydration/streaming runtime injects inline `<script>` tags; there is no
// nonce wiring here) and `style-src` (this codebase uses React inline
// `style={{...}}` attributes extensively — grep-verified across 30+ files,
// not a guess) — omitting either would make the report-only policy
// permanently noisy for the app's own normal, by-design behavior instead of
// surfacing real anomalies.
//
// `Content-Security-Policy-Report-Only` (not enforcing `Content-Security-
// Policy`): there is no local Next.js runtime or live browser available to
// validate an enforcing policy against the real OIDC redirect flow and
// dashboard SSR before shipping, so start in observe-only mode. Graduation
// gate (see CHANGELOG.md / DEPLOYMENT.md): a one-time manual DevTools check
// across the public routes and a signed-in `/dashboard` load, confirming no
// unexpected violations, before dropping `-Report-Only`.
//
// `frame-ancestors 'none'` here is currently redundant with the real,
// enforced `X-Frame-Options: DENY` below — kept so it's already correct once
// the CSP eventually becomes enforcing and `X-Frame-Options` (which modern
// browsers are moving away from in favor of `frame-ancestors`) is retired.
//
// `Strict-Transport-Security` starts at a short `max-age` (1 day) rather
// than the standard long-lived value: this domain has never sent HSTS
// before (confirmed via `curl -sI https://furchert.ch` — neither this app
// nor Cloudflare's edge sets it today), and HSTS is a one-way, browser-
// cached commitment for every returning visitor for the full window. Raise
// it (e.g. to `max-age=31536000`) in a follow-up once a burn-in period
// confirms reliable HTTPS access. `includeSubDomains`/`preload` are
// deliberately omitted: several sibling homelab services share this apex
// (auth/device/club/n8n/grafana.furchert.ch, see the parent CLAUDE.md) and
// are separate repos this task has no mandate to verify are HSTS-safe —
// `includeSubDomains` would extend browser-enforced HTTPS-only to all of
// them from a single furchert-ch response header.
//
// `source: '/:path*'` intentionally also matches `/_next/static/*` immutable
// asset responses (unlike the intl middleware's matcher, which excludes them
// for an unrelated reason — locale detection doesn't apply to assets).
// Harmless here, and one single source of truth beats an exclusion with no
// security rationale of its own.
async function headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=86400' },
        {
          key: 'Content-Security-Policy-Report-Only',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data:",
            "font-src 'self'",
            "connect-src 'self'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "object-src 'none'",
          ].join('; '),
        },
      ],
    },
  ];
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for the container image (Phase 7 / Dockerfile).
  output: 'standalone',
  reactStrictMode: true,
  headers,
};

export default withNextIntl(nextConfig);
