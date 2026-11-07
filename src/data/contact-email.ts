// The owner's contact e-mail address, assembled only at runtime (#147).
// Neither this source, the server HTML, the RSC payload nor the client
// bundle carries the address as one string, so scrapers that read them find
// none. The segments are stored reversed and the `@` comes from its char
// code. Render the address through <ContactEmail> (src/components/ui), which
// calls these helpers only in the browser.

// Local part, domain, top-level domain; each reversed.
const SEGMENTS = ['cinimod', 'trehcruf', 'hc'] as const;

const unreverse = (s: string) => s.split('').reverse().join('');

const parts = () => SEGMENTS.map(unreverse);

/** The address itself. Call it in the browser (or in tests), never during SSR. */
export function contactEmailAddress(): string {
  const [local, domain, tld] = parts();
  return `${local}${String.fromCharCode(64)}${domain}.${tld}`;
}

/** Readable stand-in that is no address pattern, for SSR and visitors without JS. */
export function contactEmailPlaceholder(): string {
  const [local, domain, tld] = parts();
  return `${local} [at] ${domain}.${tld}`;
}

/** `mailto:` href with an optional, encoded subject. */
export function contactMailtoHref(subject?: string): string {
  const href = `mailto:${contactEmailAddress()}`;
  return subject ? `${href}?subject=${encodeURIComponent(subject)}` : href;
}
