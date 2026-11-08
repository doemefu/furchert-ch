// Click classification (spec 100 §3.6). Pure: works on an element-like
// object, so it is tested without a DOM. Rules in order, first match wins:
// data-track (cta/link/faq, lang), mailto, tel, another origin (outbound),
// same-origin link in header/footer/nav (nav, raw pathname; the server
// canonicalises it, M2). Never returns a mailto/tel value, a query or a URL.

export interface ElementLike {
  closest(selector: string): ElementLike | null;
  getAttribute(name: string): string | null;
}

export type ClickKind = 'cta' | 'link' | 'faq' | 'lang' | 'nav' | 'outbound' | 'mailto' | 'tel';
export type ClickArea = 'header' | 'footer' | 'main';

export interface ClickInfo {
  kind: ClickKind;
  target: string | null;
  area: ClickArea;
  /** For faq: whether this click opens the item (aria-expanded="false" before the toggle). */
  opening?: boolean;
}

export function clickArea(el: ElementLike): ClickArea {
  if (el.closest('header')) return 'header';
  if (el.closest('footer')) return 'footer';
  return 'main';
}

export function classifyClick(start: ElementLike | null, origin: string): ClickInfo | null {
  const el = start?.closest('[data-track],a[href]');
  if (!el) return null;
  const area = clickArea(el);

  const track = el.getAttribute('data-track');
  if (track) {
    const i = track.indexOf(':');
    const kind = track.slice(0, i);
    const id = track.slice(i + 1);
    if (kind === 'cta' || kind === 'link') return { kind, target: id, area };
    if (kind === 'faq') return { kind, target: id, area, opening: el.getAttribute('aria-expanded') === 'false' };
    if (kind === 'lang' && (id === 'de' || id === 'en')) return { kind, target: id, area };
  }

  const href = el.getAttribute('href');
  if (!href) return null;
  if (/^mailto:/i.test(href)) return { kind: 'mailto', target: null, area };
  if (/^tel:/i.test(href)) return { kind: 'tel', target: null, area };
  let url: URL;
  try {
    url = new URL(href, origin);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (url.origin !== origin) return { kind: 'outbound', target: url.hostname.toLowerCase().replace(/^www\./, ''), area };
  if (el.closest('header,footer,nav')) return { kind: 'nav', target: url.pathname, area };
  return null;
}
