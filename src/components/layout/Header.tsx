'use client';

// Site header (redesign «Formular» PR 3). Phone: wordmark, a "Kontakt" text link
// and the menu button that opens `MobileNav`. From 901px: the desktop nav with
// the language switch and "Kontakt" as the primary button. No Homelab entry: the
// dashboard link lives in the footer.
import { useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { Icon } from '@/components/ui/Icon';
import { Btn } from '@/components/ui/Btn';
import { MobileNav } from './MobileNav';
import { DESKTOP_NAV, isNavActive } from './nav-items';

export function Header() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const otherLocale = locale === 'de' ? 'en' : 'de';

  const switchLocale = () => {
    router.replace(pathname, { locale: otherLocale });
    setMenuOpen(false);
  };

  return (
    <header className="site-header">
      <div className="container border-x site-header-in">
        <Link href="/" className="wm" onClick={() => setMenuOpen(false)}>
          Dominic Furchert
        </Link>

        <nav className="dnav" aria-label={t('mobileLabel')}>
          {DESKTOP_NAV.map((k) => (
            <Link key={k} href={`/${k}`} aria-current={isNavActive(pathname, k) ? 'page' : undefined}>
              {t(k)}
            </Link>
          ))}
          <button type="button" className="dnav-lang" lang={otherLocale} onClick={switchLocale} data-track={`lang:${otherLocale}`}>
            {otherLocale.toUpperCase()}
          </button>
          <Btn href="/contact" variant="primary" small>
            {t('contact')}
          </Btn>
        </nav>

        {!menuOpen && (
          <Link href="/contact" className="hd-k">
            {t('contact')}
          </Link>
        )}
        <button
          ref={toggleRef}
          type="button"
          className="mbtn"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <Icon name={menuOpen ? 'close' : 'menu'} />
          {menuOpen ? t('close') : t('menu')}
        </button>
      </div>

      <MobileNav
        id="mobile-nav"
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        toggleRef={toggleRef}
        pathname={pathname}
        otherLocale={otherLocale}
        onSwitchLocale={switchLocale}
      />
    </header>
  );
}
