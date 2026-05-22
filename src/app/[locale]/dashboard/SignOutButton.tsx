'use client';

// Navigates to the server-side federated-logout route, which reads the
// id_token server-side, ends the IdP session (id_token_hint) and clears the
// local session cookie (worklog F6). No token is touched on the client.
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui/Icon';

export function SignOutButton() {
  const t = useTranslations('dashboard');

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
        fontSize: '.8125rem',
        letterSpacing: '.02em',
        textTransform: 'uppercase',
        border: '1px solid rgba(162,167,176,.35)',
        background: 'transparent',
        color: 'var(--n-100)',
        borderRadius: '2px',
        padding: '.875rem 1.375rem',
        cursor: 'pointer',
      }}
    >
      {t('signOut')} <Icon name="arrow" size={12} />
    </button>
  );
}
