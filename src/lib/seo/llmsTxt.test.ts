import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import sitemap from '@/app/sitemap';
import { localizedUrl } from './metadata';

// public/llms.txt follows the llmstxt.org proposal: an H1, a blockquote
// summary, then H2 sections with Markdown link lists.
const text = readFileSync(join(process.cwd(), 'public', 'llms.txt'), 'utf8');
const links = [...text.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1]);

// Every site URL a reader may follow: sitemap pages in both languages, plus
// the files that are not pages.
const knownUrls = new Set([
  ...sitemap().flatMap((e) => [e.url, ...Object.values(e.alternates?.languages ?? {})]),
  'https://furchert.ch/sitemap.xml',
]);

// Any link to this site, whatever the scheme or subdomain (hostname check,
// not a string prefix).
const isSiteLink = (url: string) => /(^|\.)furchert\.ch$/.test(new URL(url).hostname);

describe('llms.txt', () => {
  it('has the llmstxt.org shape', () => {
    expect(text.startsWith('# ')).toBe(true);
    expect(text).toMatch(/^> \S/m);
    expect(text).toMatch(/^## Pages$/m);
    expect(text).toMatch(/^## Optional$/m);
  });

  it('links only to pages that exist on the site', () => {
    const siteLinks = links.filter(isSiteLink);
    expect(siteLinks.length).toBeGreaterThan(0);
    for (const url of siteLinks) expect(knownUrls.has(url), url).toBe(true);
  });

  it('links the offer and the main pages in both languages', () => {
    for (const href of ['/automation', '/about', '/projects', '/contact']) {
      expect(links).toContain(localizedUrl('de', href));
      expect(links).toContain(localizedUrl('en', href));
    }
  });

  it('has no em dash (owner, 2026-11-03)', () => {
    expect(text).not.toContain('\u2014');
  });

  it('publishes no e-mail address (the contact page is linked instead)', () => {
    expect(text).not.toMatch(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
  });
});
