'use client';

// Consent bar for usage statistics (spec 100 §10.1; WA-2a #153). Copy is the
// Q3 draft; final sign-off in WA-5 (#157). Equal prominence: the same Btn
// variant and size for both answers, Decline first, nothing pre-selected,
// no "accept all" and no "later". Non-modal: no focus trap, the page stays
// usable. Esc hides the bar for this page load and stores nothing; scrolling
// does nothing. Look: a twin of the header surface, the page's `.border-x`
// grid continuing through it (globals.css "CONSENT BAR").
import { useEffect, useRef, type KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Btn } from '@/components/ui/Btn';
import type { ConsentChoice } from '@/lib/analytics/consent';
import { getConsentController } from '@/lib/analytics/controller';
import { CONSENT_BAR_ID, CONSENT_TITLE_ID, PRIVACY_SETTINGS_ID } from './ids';

export function ConsentBar({ reopened, choice }: { reopened: boolean; choice: ConsentChoice | null }) {
  const t = useTranslations('analytics.consent');
  const ref = useRef<HTMLDivElement>(null);
  const controller = getConsentController();

  // Opened from the footer link: move focus into the bar (it is fixed, so
  // nothing scrolls). The automatic first show never takes focus.
  useEffect(() => {
    if (reopened) ref.current?.focus({ preventScroll: true });
  }, [reopened]);

  // Expose the bar's height so globals.css can keep the page end and focused
  // elements clear of it.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => root.style.setProperty('--consent-bar-h', `${el.offsetHeight}px`));
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--consent-bar-h');
    };
  }, []);

  // When the bar was opened from the footer link and focus is inside it,
  // focus goes back to that link once the bar closes.
  const close = (action: () => void) => () => {
    const returnFocus = reopened && ref.current?.contains(document.activeElement);
    action();
    if (returnFocus) document.getElementById(PRIVACY_SETTINGS_ID)?.focus();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close(() => controller.dismiss())();
  };

  return (
    <div
      ref={ref}
      id={CONSENT_BAR_ID}
      className="consent-bar"
      role="region"
      aria-labelledby={CONSENT_TITLE_ID}
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <div className="container border-x consent-inner">
        <div className="consent-text">
          <p>
            <strong id={CONSENT_TITLE_ID}>{t('title')}</strong> {t('body')}
          </p>
          <p>
            {t('bodyMore')} <Link href="/privacy">{t('privacyLink')}</Link>
          </p>
        </div>
        <div className="consent-side">
          {reopened && choice !== null && (
            <p className="consent-current">
              {t('current', { state: choice === 'granted' ? t('currentGranted') : t('currentDenied') })}
            </p>
          )}
          <div className="consent-actions">
            <Btn onClick={close(() => void controller.decline())}>{t('decline')}</Btn>
            <Btn onClick={close(() => void controller.allow())}>{t('accept')}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
