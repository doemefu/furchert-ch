'use client';

// Phone menu (redesign «Formular» PR 3): an opaque sheet under the header with
// a dim layer behind it. Focus moves in on open and is trapped between the menu
// button and the sheet; Escape, the dim layer and any link close it, and focus
// returns to the button. Body scroll is locked while open.
import { useEffect, useRef, type RefObject } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/ui/Icon';
import { nextTrapTarget } from '@/lib/a11y/drawer';
import { ABOUT_NAV, BUSINESS_NAV, isNavActive } from './nav-items';

const FOCUSABLE = 'a[href], button:not([disabled])';

interface MobileNavProps {
  id: string;
  open: boolean;
  onClose: () => void;
  /** The menu button: part of the trap and the focus return target. */
  toggleRef: RefObject<HTMLButtonElement | null>;
  pathname: string;
  otherLocale: string;
  onSwitchLocale: () => void;
}

export function MobileNav({ id, open, onClose, toggleRef, pathname, otherLocale, onSwitchLocale }: MobileNavProps) {
  const t = useTranslations('nav');
  const sheetRef = useRef<HTMLElement>(null);

  // Everything below runs only while open. `onClose` is read through a ref so
  // the effect does not re-run (and re-focus) when the parent re-renders.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const sheet = sheetRef.current;
    const toggle = toggleRef.current;
    if (!sheet || !toggle) return;

    sheet.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = [toggle, ...sheet.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const target = nextTrapTarget(items.length, items.indexOf(document.activeElement as HTMLElement), e.shiftKey);
      if (target === null) return;
      e.preventDefault();
      (items[target] ?? sheet).focus();
    };
    document.addEventListener('keydown', onKey);

    // The desktop nav takes over above 900px.
    const mq = window.matchMedia('(min-width: 901px)');
    const onMq = (e: MediaQueryListEvent) => {
      if (e.matches) closeRef.current();
    };
    mq.addEventListener('change', onMq);

    return () => {
      document.removeEventListener('keydown', onKey);
      mq.removeEventListener('change', onMq);
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
      toggle.focus();
    };
  }, [open, toggleRef]);

  const row = (key: string) => (
    <Link
      key={key}
      href={`/${key}`}
      className="mnav-i"
      aria-current={isNavActive(pathname, key) ? 'page' : undefined}
      onClick={onClose}
    >
      <b>{t(key)}</b>
      <span>{t(`desc.${key}`)}</span>
      <Icon name="chevron" />
    </Link>
  );

  return (
    <>
      <div className="mnav-dim" hidden={!open} aria-hidden="true" onClick={onClose} />
      <nav id={id} ref={sheetRef} className="mnav" hidden={!open} aria-label={t('mobileLabel')} tabIndex={-1}>
        <div className="mnav-grp">
          <span className="mnav-lab">{t('groupBusiness')}</span>
          {BUSINESS_NAV.map(row)}
        </div>
        <div className="mnav-grp">
          <span className="mnav-lab">{t('groupAbout')}</span>
          {ABOUT_NAV.map(row)}
        </div>
        <div className="mnav-lang">
          <button
            type="button"
            className="btn"
            data-variant="secondary"
            data-size="small"
            lang={otherLocale}
            onClick={onSwitchLocale}
            data-track={`lang:${otherLocale}`}
          >
            {t('switchLang')}
          </button>
        </div>
      </nav>
    </>
  );
}
