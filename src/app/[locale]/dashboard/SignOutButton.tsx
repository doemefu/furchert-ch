'use client';

// Navigates to the server-side federated-logout route, which reads the
// id_token server-side, ends the IdP session (id_token_hint) and clears the
// local session cookie (worklog F6). No token is touched on the client.
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui/Icon';

export function SignOutButton({ compact = false }: { compact?: boolean } = {}) {
  const t = useTranslations('dashboard');

  // `compact` matches the prototype dashboard header-bar sign-out
  // (dashboard.jsx:158-160); the default keeps the Phase-4 large variant
  // so any future call site that needs it doesn't break.
  const sizing = compact
    ? {
        fontSize: '.72rem',
        letterSpacing: '.04em',
        padding: '.35rem .75rem',
        color: 'var(--n-60)',
        border: '1px solid rgba(162,167,176,.3)',
      }
    : {
        fontSize: '.8125rem',
        letterSpacing: '.02em',
        padding: '.875rem 1.375rem',
        color: 'var(--n-100)',
        border: '1px solid rgba(162,167,176,.35)',
      };

  return (
    <button
      type="button"
      onClick={() => {
        window.location.href = '/api/federated-logout';
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '.45rem',
        fontFamily: 'var(--mono)',
        textTransform: 'uppercase',
        background: 'transparent',
        borderRadius: '2px',
        cursor: 'pointer',
        ...sizing,
      }}
    >
      {t('signOut')} <Icon name="arrow" size={compact ? 10 : 12} />
    </button>
  );
}
