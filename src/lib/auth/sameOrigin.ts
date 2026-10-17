// CSRF guard for the federated-logout route handler. Modern
// browsers send `Sec-Fetch-Site` on every request — a forged cross-site POST
// is `cross-site`/`same-site` and is rejected. For clients without fetch
// metadata, fall back to matching the `Origin` header against the expected
// public origin; a request with neither header is not a browser-driven
// cross-site request and passes. That fail-open default is acceptable for
// logout only. Make it fail closed before reusing this for a mutation with
// real impact.
export function isSameOriginRequest(headers: Headers, expectedOrigin: string): boolean {
  const secFetchSite = headers.get('sec-fetch-site');
  const origin = headers.get('origin');
  return (
    secFetchSite === 'same-origin' ||
    secFetchSite === 'none' ||
    (secFetchSite === null && (origin === null || origin === expectedOrigin))
  );
}
