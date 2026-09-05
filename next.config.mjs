import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Security response headers (#42). Applied via `next.config.js` `headers()`,
// not `src/middleware.ts`, because the intl middleware's matcher
// (`'/((?!api|_next|_vercel|.*\\..*).*)'`) deliberately excludes `/api/*` —
// exactly the routes that need this too (the OIDC callback, federated
// logout, health check). `next.config.js` headers apply at the framework
// level to every matched route (`source: '/:path*'`, including `/api/*`
// and `/_next/static/*`) and, per Next.js's documented execution order
// (`headers` runs in step 1, before Proxy/middleware in step 3), even to
// middleware-issued redirects such as the bare `/` → `/de` locale redirect.
//
// Full rationale for each directive — why `'unsafe-inline'` appears twice,
// why the CSP ships Report-Only, the HSTS rollout plan, and the CSP
// graduation gate — lives in `CHANGELOG.md` and `DEPLOYMENT.md` § Security
// headers, not duplicated here, so there is one place to update when any
// of it changes (e.g. raising `max-age` or dropping `-Report-Only`).
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
