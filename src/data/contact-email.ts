// The owner's contact e-mail address, assembled only at runtime (#147).
// Neither this source, the server HTML, the RSC payload nor the client
// bundle carries the address as one string, so scrapers that read them find
// none: the segments are stored reversed and joined only when called.
// Render the address through <ContactEmail> (src/components/ui), which calls
// these helpers only in the browser. Never call them in a server component:
// the address would land in the HTML and the RSC payload (CI greps the build
// output for it).

// Local part, domain, top-level domain; each reversed.
const SEGMENTS = ['cinimod', 'trehcruf', 'hc'] as const;

const unreverse = (s: string) => s.split('').reverse().join('');

/** The address itself. Call it in the browser (or in tests), never during SSR. */
export function contactEmailAddress(): string {
  const [local, domain, tld] = SEGMENTS.map(unreverse);
  return `${local}@${domain}.${tld}`;
}

/** `mailto:` href with an optional, encoded subject. */
export function contactMailtoHref(subject?: string): string {
  const href = `mailto:${contactEmailAddress()}`;
  return subject ? `${href}?subject=${encodeURIComponent(subject)}` : href;
}
