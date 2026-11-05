'use client';

// Keyboard focus handling shared by the admin drawers (#140): keep Tab inside
// the open dialog, and return focus to the button that opened it on close.
import { useCallback, useEffect, useRef } from 'react';
import { nextTrapTarget } from '@/lib/a11y/drawer';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0);
}

/**
 * Focus trap for a `role="dialog"` element: spread the returned props onto it.
 * Tab is handled on `document` while the dialog is mounted, because focus can
 * fall to <body> inside an open drawer (a focused button turns disabled while
 * a save is pending, or a click lands on plain text); focus outside the list
 * counts as "not on an element", so Tab goes to the first and Shift+Tab to the
 * last. On mount, focus moves into the dialog unless an `autoFocus` field
 * already took it. Esc stays with the drawer's own listener. The dialog needs
 * `outline: 'none'` in its style (it is focused only as a fallback).
 */
export function useFocusTrap<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (root && !root.contains(document.activeElement)) root.focus();
    // Direction of a Tab the browser moves itself. Safari and Firefox on macOS
    // skip buttons and radios by default, so the first/last focusable element
    // need not be a stop and a Tab can still step out of the dialog; if focus
    // lands outside during such a Tab, pull it back.
    let browserTab: { shift: boolean } | null = null;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Tab' || !root) return;
      const items = focusables(root);
      const target = nextTrapTarget(items.length, items.indexOf(document.activeElement as HTMLElement), e.shiftKey);
      if (target === null) {
        browserTab = { shift: e.shiftKey };
        setTimeout(() => {
          browserTab = null;
        });
        return;
      }
      e.preventDefault();
      (target === -1 ? root : items[target]).focus();
    };
    const onFocusIn = (e: FocusEvent) => {
      if (!browserTab || !root || root.contains(e.target as Node)) return;
      const items = focusables(root);
      (items.length ? items[browserTab.shift ? items.length - 1 : 0] : root).focus();
    };
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('focusin', onFocusIn, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('focusin', onFocusIn, true);
    };
  }, []);

  return { ref, tabIndex: -1 };
}

/**
 * Remembers the element that opened a drawer (capture it on click, before the
 * drawer's autoFocus moves focus) and returns focus to it on `restore`.
 * `remember` can be called again to re-point the opener, e.g. when it
 * disappears with a deleted row.
 */
export function useReturnFocus() {
  const opener = useRef<HTMLElement | null>(null);
  const remember = useCallback((el: HTMLElement) => {
    opener.current = el;
  }, []);
  const restore = useCallback(() => {
    const el = opener.current;
    opener.current = null;
    if (el?.isConnected) el.focus();
  }, []);
  return { remember, restore };
}
