import { describe, expect, it } from 'vitest';
import { classifyClick, type ElementLike } from './clicks';

// A tiny element tree: each node knows its tag, attributes and parent.
type Node = { tag: string; attrs: Record<string, string>; parent: Node | null };
const node = (tag: string, attrs: Record<string, string> = {}, parent: Node | null = null): Node => ({ tag, attrs, parent });
function el(n: Node): ElementLike {
  const matches = (x: Node, sel: string) =>
    sel.split(',').some((s) => {
      s = s.trim();
      if (s === '[data-track]') return 'data-track' in x.attrs;
      if (s === 'a[href]') return x.tag === 'a' && 'href' in x.attrs;
      return x.tag === s;
    });
  return {
    closest(sel) {
      for (let x: Node | null = n; x; x = x.parent) if (matches(x, sel)) return el(x);
      return null;
    },
    getAttribute: (name) => n.attrs[name] ?? null,
  };
}
const ORIGIN = 'https://furchert.ch';
const main = node('main');
const header = node('header');
const footer = node('footer');

describe('classifyClick (§3.6)', () => {
  it('data-track wins: cta, link, faq (opening state), lang', () => {
    const span = node('span', {}, node('a', { href: '/de/contact?from=automation-hero', 'data-track': 'cta:automation-hero' }, main));
    expect(classifyClick(el(span), ORIGIN)).toEqual({ kind: 'cta', target: 'automation-hero', area: 'main' });
    expect(classifyClick(el(node('a', { href: '/de/about', 'data-track': 'link:home-hero-about' }, main)), ORIGIN)).toMatchObject({ kind: 'link', target: 'home-hero-about' });
    expect(classifyClick(el(node('button', { 'data-track': 'faq:cost', 'aria-expanded': 'false' }, main)), ORIGIN)).toEqual({ kind: 'faq', target: 'cost', area: 'main', opening: true });
    expect(classifyClick(el(node('button', { 'data-track': 'faq:cost', 'aria-expanded': 'true' }, main)), ORIGIN)?.opening).toBe(false);
    expect(classifyClick(el(node('button', { 'data-track': 'lang:en' }, header)), ORIGIN)).toEqual({ kind: 'lang', target: 'en', area: 'header' });
  });

  it('mailto and tel never carry the address or number', () => {
    expect(classifyClick(el(node('a', { href: 'mailto:someone@example.org?subject=x' }, footer)), ORIGIN)).toEqual({ kind: 'mailto', target: null, area: 'footer' });
    expect(classifyClick(el(node('a', { href: 'tel:+41790000000' }, main)), ORIGIN)).toEqual({ kind: 'tel', target: null, area: 'main' });
  });

  it('outbound gives the lowercase host without www.', () => {
    expect(classifyClick(el(node('a', { href: 'https://WWW.LinkedIn.com/in/x?trk=1' }, footer)), ORIGIN)).toEqual({ kind: 'outbound', target: 'linkedin.com', area: 'footer' });
  });

  it('nav for same-origin links in header/footer/nav only, with the raw pathname', () => {
    expect(classifyClick(el(node('a', { href: '/de/automation?x=1#faq' }, header)), ORIGIN)).toEqual({ kind: 'nav', target: '/de/automation', area: 'header' });
    expect(classifyClick(el(node('a', { href: '/de/it' }, node('nav', {}, main))), ORIGIN)).toMatchObject({ kind: 'nav', area: 'main' });
    expect(classifyClick(el(node('a', { href: '/de/it' }, main)), ORIGIN)).toBeNull();
  });

  it('ignores clicks outside links and tracked elements, and odd hrefs', () => {
    expect(classifyClick(el(node('p', {}, main)), ORIGIN)).toBeNull();
    expect(classifyClick(el(node('a', { href: 'javascript:void(0)' }, header)), ORIGIN)).toBeNull();
    expect(classifyClick(null, ORIGIN)).toBeNull();
  });
});
