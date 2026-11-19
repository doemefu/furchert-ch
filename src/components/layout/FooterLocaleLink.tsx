'use client';

// Footer language link: the same page in the other language. A real link (not
// the header's button) so it works without JavaScript once hydrated and shows
// the target URL. The Footer is a server component, hence this small island.
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

export function FooterLocaleLink() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const otherLocale = locale === 'de' ? 'en' : 'de';

  return (
    <Link href={pathname} locale={otherLocale} lang={otherLocale} hrefLang={otherLocale} data-track={`lang:${otherLocale}`}>
      {t('switchLang')}
    </Link>
  );
}
