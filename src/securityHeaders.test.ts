// Pins the security-header contract of `next.config.mjs` (#42). The exact
// strings are asserted on purpose: every CSP/HSTS change must be a
// deliberate edit of both the config and this test (and of DEPLOYMENT.md
// § "Security headers"), not something to fix by loosening an assertion.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config.mjs';

async function headerMap(): Promise<Map<string, string>> {
  const rules = await nextConfig.headers!();
  expect(rules).toHaveLength(1);
  expect(rules[0].source).toBe('/:path*');
  return new Map(rules[0].headers.map((h) => [h.key, h.value]));
}

const directives = (policy: string) => policy.split(';').map((d) => d.trim());

describe('security headers (next.config.mjs)', () => {
  it('keeps the basic hardening headers', async () => {
    const h = await headerMap();
    expect(h.get('X-Content-Type-Options')).toBe('nosniff');
    expect(h.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(h.get('X-Frame-Options')).toBe('DENY');
    expect(h.get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=()');
  });

  it('sends HSTS for one year including subdomains, without preload (#200)', async () => {
    const h = await headerMap();
    expect(h.get('Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains');
  });

  it('enforces only the directives that do not depend on inline scripts or styles', async () => {
    const h = await headerMap();
    expect(directives(h.get('Content-Security-Policy') ?? '')).toEqual([
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      // The IdP origin: SignOutButton POSTs to /api/federated-logout, which
      // redirects to auth.furchert.ch/connect/logout; browsers check
      // form-action on that redirect.
      "form-action 'self' https://auth.furchert.ch",
    ]);
  });

  // `headers()` is build-time, so the IdP origin is a literal there; this
  // keeps it from drifting away from the deployed OIDC_ISSUER.
  it('allows the IdP origin the deployment configures as OIDC_ISSUER', async () => {
    const manifest = readFileSync(new URL('../k8s/deployment.yaml', import.meta.url), 'utf8');
    const issuer = /- name: OIDC_ISSUER\s+value: "([^"]+)"/.exec(manifest)?.[1];
    expect(issuer).toBeDefined();
    const h = await headerMap();
    const formAction = directives(h.get('Content-Security-Policy') ?? '').find((d) =>
      d.startsWith('form-action '),
    );
    expect(formAction?.split(' ')).toContain(new URL(issuer!).origin);
  });

  it('keeps the script/style policy Report-Only, without the enforced directives', async () => {
    const h = await headerMap();
    expect(directives(h.get('Content-Security-Policy-Report-Only') ?? '')).toEqual([
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
    ]);
  });

  it('does not advertise the framework (no X-Powered-By)', () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
