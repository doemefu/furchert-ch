'use client';

// Ported from the prototype (shared.jsx Header). Hash routing replaced by
// next-intl locale-aware routing; the DE/EN toggle switches locale on the
// current path. `authed` styling is wired in Phase 4 (OIDC); false for now.
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSession } from 'next-auth/react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { Icon } from '@/components/ui/Icon';

const NAV_KEYS = ['about', 'it', 'rowing', 'projects', 'automation', 'contact'] as const;

export function Header() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  // Real auth state via the client SessionProvider (worklog D-B) — keeps the
  // blue "Homelab" button in sync without forcing public pages dynamic.
  const { status } = useSession();
  const authed = status === 'authenticated';

  const isActive = (key: string) =>
    pathname === `/${key}` || pathname.startsWith(`/${key}/`);

  const switchLocale = () => {
    router.replace(pathname, { locale: locale === 'de' ? 'en' : 'de' });
    setMenuOpen(false);
  };

  const navLink = (key: string, label: string) => (
    <Link
      key={key}
      href={key === 'home' ? '/' : `/${key}`}
      onClick={() => setMenuOpen(false)}
      style={{
        fontFamily: 'var(--mono)',
        fontSize: '.72rem',
        letterSpacing: '.05em',
        textTransform: 'uppercase',
        textDecoration: 'none',
        color: isActive(key) ? 'var(--n-100)' : 'var(--n-60)',
        padding: '.375rem .5rem',
        cursor: 'pointer',
        transition: 'color .15s',
        borderBottom: isActive(key)
          ? '1px solid var(--n-100)'
          : '1px solid transparent',
      }}
    >
      {label}
    </Link>
  );

  const langBtnStyle = {
    fontFamily: 'var(--mono)',
    fontSize: '.72rem',
    letterSpacing: '.05em',
    textTransform: 'uppercase' as const,
    background: 'none',
    border: '1px solid rgba(162,167,176,.35)',
    borderRadius: '2px',
    padding: '.25rem .5rem',
    cursor: 'pointer',
    color: 'var(--n-60)',
    transition: 'color .15s',
  };
  const homelabBtnStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '.4rem',
    background: authed ? 'var(--blue-base)' : 'none',
    border: '1px solid rgba(162,167,176,.35)',
    borderRadius: '2px',
    padding: '.3rem .55rem',
    cursor: 'pointer',
    color: authed ? 'var(--white)' : 'var(--n-70)',
    marginLeft: '.25rem',
    transition: 'background .15s, color .15s',
    fontFamily: 'var(--mono)',
    fontSize: '.68rem',
    letterSpacing: '.05em',
    textTransform: 'uppercase' as const,
    textDecoration: 'none',
  };

  return (
    <header
      style={{
        position: 'fixed',
        inset: '0 0 auto',
        zIndex: 100,
        height: 'var(--header-h)',
        background: 'rgba(250,250,255,.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(162,167,176,.22)',
      }}
    >
      <div
        className="container border-x"
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '.9rem',
            fontWeight: 500,
            letterSpacing: '.04em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            color: 'var(--n-100)',
            cursor: 'pointer',
          }}
        >
          furchert.ch
        </Link>

        <nav
          className="desktop-nav"
          style={{ display: 'flex', gap: '.1rem', alignItems: 'center', flexWrap: 'nowrap' }}
        >
          {NAV_KEYS.map((k) => navLink(k, t(`nav.${k}`)))}
          <span
            style={{
              width: 1,
              height: 16,
              background: 'rgba(162,167,176,.3)',
              margin: '0 .5rem',
            }}
          />
          <button onClick={switchLocale} style={langBtnStyle}>
            {locale === 'de' ? 'EN' : 'DE'}
          </button>
          <Link href="/dashboard" style={homelabBtnStyle} title="Homelab Dashboard">
            <Icon name="lock" size={11} /> {t('common.homelab')}
          </Link>
        </nav>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="burger"
          style={{
            display: 'none',
            background: 'none',
            border: '1px solid rgba(162,167,176,.35)',
            borderRadius: '2px',
            padding: '.3rem .5rem',
            cursor: 'pointer',
            color: 'var(--n-70)',
            fontFamily: 'var(--mono)',
            fontSize: '.7rem',
            letterSpacing: '.04em',
            textTransform: 'uppercase',
          }}
        >
          {t('common.menu')}
        </button>
      </div>

      {menuOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'var(--header-h)',
            left: 0,
            right: 0,
            background: 'rgba(250,250,255,.97)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(162,167,176,.22)',
            padding: '1rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '.25rem',
          }}
        >
          {NAV_KEYS.map((k) => navLink(k, t(`nav.${k}`)))}
          <div
            style={{
              display: 'flex',
              gap: '.5rem',
              marginTop: '.5rem',
              paddingTop: '.75rem',
              borderTop: '1px solid rgba(162,167,176,.15)',
            }}
          >
            <button onClick={switchLocale} style={langBtnStyle}>
              {locale === 'de' ? 'EN' : 'DE'}
            </button>
            <Link
              href="/dashboard"
              onClick={() => setMenuOpen(false)}
              style={{ ...homelabBtnStyle, marginLeft: 0 }}
            >
              <Icon name="lock" size={11} /> {t('common.homelab')}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
