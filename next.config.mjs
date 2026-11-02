import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Security response headers (#42). Applied via `next.config.js` `headers()`,
// not `src/proxy.ts`, because the intl proxy's matcher
// (`'/((?!api|_next|_vercel|.*\\..*).*)'`) deliberately excludes `/api/*` —
// exactly the routes that need this too (the OIDC callback, federated
// logout, health check). `next.config.js` headers apply at the framework
// level to every matched route (`source: '/:path*'`, including `/api/*`
// and `/_next/static/*`) and, per Next.js's documented execution order
// (`headers` runs in step 1, before Proxy in step 3), even to
// proxy-issued redirects such as the bare `/` → `/de` locale redirect.
//
// Full rationale for each directive — why the CSP is split into an enforced
// part and a Report-Only part, why `'unsafe-inline'` appears twice, the HSTS
// rollout, and the CSP graduation gate — lives in `CHANGELOG.md` and
// `DEPLOYMENT.md` § Security headers, not duplicated here, so there is one
// place to update when any of it changes. `src/securityHeaders.test.ts`
// pins the exact values.
//
// `form-action` lists the IdP origin as a literal: SignOutButton POSTs to
// /api/federated-logout, which redirects to the IdP's end-session endpoint,
// and Auth.js's built-in /api/auth/signin page POSTs a form that redirects to
// the IdP's authorize endpoint; browsers apply `form-action` to redirects. `headers()` is evaluated
// at `next build` (baked into the routes manifest), so the runtime
// `OIDC_ISSUER` cannot be used here.
async function headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
        {
          key: 'Content-Security-Policy',
          value: [
            "frame-ancestors 'none'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self' https://auth.furchert.ch",
          ].join('; '),
        },
        {
          key: 'Content-Security-Policy-Report-Only',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data:",
            "font-src 'self'",
            "connect-src 'self'",
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
  // No `X-Powered-By: Next.js` on responses (#42).
  poweredByHeader: false,
  // nodemailer is the first real runtime dependency; it is not in Next's
  // built-in server-external-packages allowlist, so without this it would
  // be bundled into the server build instead of traced into
  // .next/standalone/node_modules (#46).
  serverExternalPackages: ['nodemailer'],
  headers,
};

export default withNextIntl(nextConfig);
