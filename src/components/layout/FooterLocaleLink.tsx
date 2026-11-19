'use client';

// Footer language link: the same page in the other language. A real,
// server-rendered link (not the header's button), so it works without
// JavaScript. It is an island only because it reads the current pathname; the
// Footer itself is a server component. next-intl sets hrefLang on it.
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

export function FooterLocaleLink() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const otherLocale = locale === 'de' ? 'en' : 'de';

  return (
    <Link href={pathname} locale={otherLocale} lang={otherLocale} data-track={`lang:${otherLocale}`}>
      {t('switchLang')}
    </Link>
  );
}
