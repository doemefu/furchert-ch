// Federated (RP-initiated) logout. Runs server-side so the id_token never
// reaches the browser (worklog D-C / F6): read the JWT, build the IdP
// end-session URL with `id_token_hint`, then return a redirect that also
// expires the local Auth.js session cookie. The SignOutButton just navigates
// here.
import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const IDP_LOGOUT = 'https://auth.furchert.ch/connect/logout';

export async function GET(req: NextRequest) {
  const secret = process.env.AUTH_SECRET ?? '';
  const secureCookie = process.env.NODE_ENV === 'production';
  const cookieName = secureCookie
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token';

  const token = await getToken({
    req,
    secret,
    secureCookie,
    salt: cookieName,
    cookieName,
  });

  const logoutUrl = new URL(IDP_LOGOUT);
  if (token?.idToken) logoutUrl.searchParams.set('id_token_hint', token.idToken);
  logoutUrl.searchParams.set('post_logout_redirect_uri', req.nextUrl.origin);

  const res = NextResponse.redirect(logoutUrl);
  // Clear the local session cookie before leaving for the IdP. Also expire the
  // chunked variants (`.0`, `.1`, …) that Auth.js emits if the cookie ever
  // exceeds ~4 KB, so logout is robust even if the JWT later grows.
  const expired = { path: '/', expires: new Date(0) };
  res.cookies.set(cookieName, '', expired);
  for (let i = 0; i < 5; i++) res.cookies.set(`${cookieName}.${i}`, '', expired);
  return res;
}
