// Server-side helpers shared by every module that talks to auth-service or
// reads the Auth.js session cookie directly (netmon client-credentials token,
// authadmin token refresh, federated logout). Pure functions, no I/O.

// RFC 6749 §2.3.1: client_id and client_secret are encoded before Base64 in
// HTTP Basic auth. `encodeURIComponent` is close to, not exactly,
// form-urlencoding (space → `%20`, not `+`; `!'()*` stay literal); Spring
// Authorization Server URL-decodes either form to the same value.
export function basicAuth(clientId: string, clientSecret: string): string {
  const pair = `${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`;
  return `Basic ${Buffer.from(pair, 'utf8').toString('base64')}`;
}

// The Auth.js v5 session cookie name. Auth.js itself picks the `__Secure-`
// prefix from the AUTH_URL protocol (https); this keys it on NODE_ENV
// instead, which matches only while production ⇔ https AUTH_URL — true for
// the cluster deployment, not for `pnpm start` on http://localhost (there
// session reads find no cookie). In v5 the JWE salt is derived from the
// cookie name, so callers of `getToken` pass `cookieName` as `salt` too —
// passing both explicitly is defensive against future cookie-name changes
// that would otherwise silently break session reads.
export function sessionCookie(): { secureCookie: boolean; cookieName: string } {
  const secureCookie = process.env.NODE_ENV === 'production';
  const cookieName = secureCookie ? '__Secure-authjs.session-token' : 'authjs.session-token';
  return { secureCookie, cookieName };
}
