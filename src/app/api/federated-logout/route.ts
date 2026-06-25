// Federated (RP-initiated) logout. Runs server-side so the id_token never
// reaches the browser (worklog D-C / F6): read the JWT, build the IdP
// end-session URL with `id_token_hint`, then return a redirect that also
// expires the local Auth.js session cookie. The SignOutButton submits a POST
// form here.
import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { AUTH_ENV } from '@/auth.env';

// Always dynamic — reads cookies, calls AUTH_ENV (which throws when env is
// missing). The `force-dynamic` opts out of Next's static-generation probe
// during `pnpm build`, which would otherwise execute this route at build
// time and trip the env assertion (build still succeeds — the assertion is
// caught — but it produces noisy stack traces).
export const dynamic = 'force-dynamic';

// Logout mutates session state, so it is exposed as POST only (a GET could be
// triggered by `<img>`/prefetch — logout CSRF). The public origin is also the
// `post_logout_redirect_uri` the IdP validates against.
export async function POST(req: NextRequest) {
  const expectedOrigin = process.env.AUTH_URL
    ? new URL(process.env.AUTH_URL).origin
    : req.nextUrl.origin;

  // CSRF guard: modern browsers send `Sec-Fetch-Site` on every request — a
  // forged cross-site POST is `cross-site`/`same-site` and is rejected. For
  // clients without fetch metadata, fall back to matching the `Origin` header
  // against the expected public origin.
  const secFetchSite = req.headers.get('sec-fetch-site');
  const origin = req.headers.get('origin');
  const sameOrigin =
    secFetchSite === 'same-origin' ||
    secFetchSite === 'none' ||
    (secFetchSite === null && (origin === null || origin === expectedOrigin));
  if (!sameOrigin) {
    return NextResponse.json({ error: 'Cross-origin logout rejected' }, { status: 403 });
  }

  const secureCookie = process.env.NODE_ENV === 'production';
  const cookieName = secureCookie
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token';

  try {
    const token = await getToken({
      req,
      secret: AUTH_ENV.AUTH_SECRET,
      secureCookie,
      // In Auth.js v5 the JWE salt is derived from the cookie name, so both
      // must agree. Passing them explicitly is defensive against future
      // cookie-name changes that would otherwise silently break logout.
      salt: cookieName,
      cookieName,
    });

    if (!token) {
      // No active session (no cookie, expired, bad signature). Don't bounce
      // the user through the IdP — that produces a confusing IdP-side prompt.
      // Just send them home.
      return NextResponse.redirect(new URL('/', req.url));
    }
    if (!token.idToken) {
      // The JWT exists but no id_token was persisted (would happen on a
      // session migrated from a previous deploy). The end-session call will
      // still work, but the IdP may show its own confirm prompt because it
      // can't identify the session without the hint.
      console.warn('[federated-logout] no idToken on JWT; IdP may prompt');
    }

    const logoutUrl = new URL(`${AUTH_ENV.OIDC_ISSUER}/connect/logout`);
    if (token.idToken) logoutUrl.searchParams.set('id_token_hint', token.idToken);
    // The IdP validates `post_logout_redirect_uri` against the registered
    // value (e.g. https://furchert.ch). Behind Cloudflare Tunnel → Traefik,
    // `req.nextUrl.origin` can be an internal origin (cluster FQDN /
    // localhost), which the IdP rejects — breaking logout in prod while it
    // works locally. `expectedOrigin` derives from the configured public base
    // (AUTH_URL), falling back to the request origin only when unset (dev).
    logoutUrl.searchParams.set('post_logout_redirect_uri', expectedOrigin);

    const res = NextResponse.redirect(logoutUrl);
    // Clear the local session cookie before leaving for the IdP. Also expire
    // every chunked variant (`.0`, `.1`, …) Auth.js emits when the JWT
    // exceeds ~4 KB. We iterate the request cookies rather than guessing a
    // bound, so this stays correct if the JWT ever grows past a hardcoded
    // limit.
    const expired = { path: '/', expires: new Date(0) };
    res.cookies.set(cookieName, '', expired);
    const chunkPrefix = `${cookieName}.`;
    let chunkCount = 0;
    for (const c of req.cookies.getAll()) {
      if (c.name.startsWith(chunkPrefix)) {
        res.cookies.set(c.name, '', expired);
        chunkCount++;
      }
    }
    if (chunkCount > 1) {
      // More than one chunk means the JWT is creeping above ~4 KB. Worth
      // knowing because it's the warning sign before logout robustness starts
      // depending on cookie-clearing edge cases.
      console.warn(`[federated-logout] cleared ${chunkCount} session cookie chunks`);
    }
    return res;
  } catch (err) {
    console.error('[federated-logout] failed', err);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
