import { describe, expect, it } from 'vitest';
import { buildPageMetadata, languageAlternates, localizedUrl, ownerTitle } from './metadata';

const base = { title: 'Über mich — furchert.ch', description: 'Kurzbeschreibung.' };

describe('localizedUrl', () => {
  it('prefixes every locale, also the default one', () => {
    expect(localizedUrl('de', '/')).toBe('https://furchert.ch/de');
    expect(localizedUrl('en', '/')).toBe('https://furchert.ch/en');
    expect(localizedUrl('en', '/about')).toBe('https://furchert.ch/en/about');
  });
});

describe('languageAlternates', () => {
  it('lists every locale and points x-default at the German page', () => {
    expect(languageAlternates('/about')).toEqual({
      de: 'https://furchert.ch/de/about',
      en: 'https://furchert.ch/en/about',
      'x-default': 'https://furchert.ch/de/about',
    });
  });
});

describe('buildPageMetadata', () => {
  it('sets a self-referencing canonical for each locale', () => {
    expect(buildPageMetadata({ ...base, locale: 'de', href: '/about' }).alternates?.canonical).toBe(
      'https://furchert.ch/de/about',
    );
    expect(buildPageMetadata({ ...base, locale: 'en', href: '/' }).alternates?.canonical).toBe(
      'https://furchert.ch/en',
    );
  });

  it('adds the language alternates of the same page', () => {
    const meta = buildPageMetadata({ ...base, locale: 'en', href: '/rowing' });
    expect(meta.alternates?.languages).toEqual(languageAlternates('/rowing'));
  });

  it('passes title and description through unchanged', () => {
    const meta = buildPageMetadata({ ...base, locale: 'de', href: '/about' });
    expect(meta.title).toBe(base.title);
    expect(meta.description).toBe(base.description);
  });

  it('describes the page for social previews with the regional locales', () => {
    const de = buildPageMetadata({ ...base, locale: 'de', href: '/about' });
    expect(de.openGraph).toEqual({
      type: 'website',
      siteName: 'furchert.ch',
      title: base.title,
      description: base.description,
      url: 'https://furchert.ch/de/about',
      locale: 'de_CH',
      alternateLocale: ['en_GB'],
    });
    const en = buildPageMetadata({ ...base, locale: 'en', href: '/about' });
    expect(en.openGraph).toMatchObject({ locale: 'en_GB', alternateLocale: ['de_CH'] });
    expect(en.twitter).toEqual({ card: 'summary', title: base.title, description: base.description });
  });

  it('only sets robots when the page must stay out of the index', () => {
    expect(buildPageMetadata({ ...base, locale: 'de', href: '/about' })).not.toHaveProperty('robots');
    expect(
      buildPageMetadata({ ...base, locale: 'de', href: '/automation/scan', noindex: true }).robots,
    ).toEqual({ index: false, follow: true });
  });
});

describe('ownerTitle', () => {
  it('appends the owner with "|" (no em dash)', () => {
    expect(ownerTitle('Kontakt')).toBe('Kontakt | Dominic Furchert');
    expect(ownerTitle('IoT Platform: Terra1')).not.toContain('\u2014');
  });
});
