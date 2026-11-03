import { describe, expect, it, vi } from 'vitest';

// next-intl's navigation entry cannot load under plain Node ESM in vitest;
// with `localePrefix: 'always'` a path is `/<locale><href>` (`/` → `/<locale>`).
vi.mock('@/i18n/navigation', () => ({
  getPathname: ({ locale, href }: { locale: string; href: string }) => `/${locale}${href === '/' ? '' : href}`,
}));

const { default: sitemap } = await import('./sitemap');

describe('sitemap', () => {
  it('lists the imprint and privacy pages with both locales', () => {
    const entries = sitemap();
    for (const path of ['/imprint', '/privacy']) {
      const entry = entries.find((e) => e.url === `https://furchert.ch/de${path}`);
      expect(entry).toBeDefined();
      expect(entry?.alternates?.languages).toMatchObject({
        de: `https://furchert.ch/de${path}`,
        en: `https://furchert.ch/en${path}`,
      });
    }
  });
});
