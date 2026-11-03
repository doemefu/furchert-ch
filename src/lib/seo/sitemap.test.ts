import { describe, expect, it } from 'vitest';
import sitemap from '@/app/sitemap';
import { buildPageMetadata, languageAlternates, localizedUrl } from './metadata';
import { PAGE_LAST_MODIFIED, SITE_LAUNCH_DATE } from './pages';

const entries = sitemap();
const pages = Object.entries(PAGE_LAST_MODIFIED);

describe('sitemap', () => {
  it('lists exactly the pages that have a last-modified date', () => {
    expect(entries.map((e) => e.url).sort()).toEqual(
      pages.map(([href]) => localizedUrl('de', href)).sort(),
    );
  });

  it('uses each page date as lastmod, not the build time', () => {
    for (const [href, date] of pages) {
      const entry = entries.find((e) => e.url === localizedUrl('de', href));
      expect(entry?.lastModified, href).toBe(date);
    }
  });

  it('only has real calendar dates between the launch and today', () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const [href, date] of pages) {
      expect(date, href).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10), href).toBe(date);
      expect(date >= SITE_LAUNCH_DATE && date <= today, `${href} ${date}`).toBe(true);
    }
  });

  it('agrees with the page metadata on URL and language alternates', () => {
    for (const [href] of pages) {
      const entry = entries.find((e) => e.url === localizedUrl('de', href));
      const meta = buildPageMetadata({ locale: 'de', href, title: 't', description: 'd' });
      expect(entry?.url).toBe(meta.alternates?.canonical);
      expect(entry?.alternates?.languages).toEqual(languageAlternates(href));
    }
  });
});
