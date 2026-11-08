'use client';

// The owner's contact e-mail as a `mailto:` link, rendered only in the
// browser (#147). The server never passes or renders the address, so neither
// the HTML nor the RSC payload carries it (Cloudflare's Email Obfuscation,
// #125, only rewrites the HTML). On the server, during hydration and for
// visitors without JavaScript the element links to the contact page and
// shows a neutral label ("E-Mail", or the given label), which spells no
// address. The first client render equals the server render, so hydration
// matches; the render after mount swaps in the address and the `mailto:` href.
import { useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Btn } from './Btn';
import { contactEmailAddress, contactMailtoHref } from '@/data/contact-email';

const noSubscribe = () => () => {};

interface ContactEmailProps {
  /** Visible text instead of the address, e.g. "E-Mail schreiben". */
  label?: ReactNode;
  /** Rendered after the label or address, e.g. an arrow icon. */
  children?: ReactNode;
  /** Subject for the `mailto:` link. */
  subject?: string;
  /** Render as the default `Btn`; `style` and `className` are then ignored. */
  btn?: boolean;
  /** Analytics click id (`data-track`, spec 100 §3.6); mailto clicks are captured without it too. */
  track?: string;
  style?: CSSProperties;
  className?: string;
}

export function ContactEmail({ label, children, subject, btn, track, style, className }: ContactEmailProps) {
  const t = useTranslations('contact');
  // false on the server and during hydration, true once mounted on the client.
  const mounted = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
  const text = label ?? (mounted ? contactEmailAddress() : t('emailFallback'));
  // Locale-free; Btn and Link from @/i18n/navigation add the locale.
  const href = mounted ? contactMailtoHref(subject) : '/contact';

  if (btn) {
    return (
      <Btn href={href} track={track}>
        {text}
        {children}
      </Btn>
    );
  }
  if (mounted) {
    return (
      <a href={href} style={style} className={className} data-track={track}>
        {text}
        {children}
      </a>
    );
  }
  // No prefetch: the link is swapped for the `mailto:` one right after hydration.
  return (
    <Link href={href} prefetch={false} style={style} className={className} data-track={track}>
      {text}
      {children}
    </Link>
  );
}
