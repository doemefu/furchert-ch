'use client';

// Device clients tab. Layout follows the prototype's "OIDC Clients" accordion
// (`auth-admin.jsx` AuthClients), but the data is what auth-service's admin
// API actually manages: device clients only (../auth-service/INTERFACES.md
// §8). SSO/OIDC clients are config-defined and labelled as not manageable
// here instead of being mocked. The one-time secret returned on create is
// rendered once from the action result and dropped on dismiss — never
// stored, logged or re-fetchable.
import { useActionState, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui/Icon';
import { IDLE, type ActionState } from '@/lib/authadmin/forms';
import { createDeviceClientAction, deleteDeviceClientAction } from './actions';
import { CopyButton } from './CopyButton';
import { FieldError, FormError } from './FormFeedback';
import { MonoLabel, Pill, btnDanger, btnPrimary, btnSecondary, btnSmall, cardStyle, fieldStyle, hintStyle } from './ui';

export interface ClientRow {
  clientId: string;
  description: string | null;
  createdLabel: string;
  scopes: string[];
}

export function ClientsPanel({ clients }: { clients: ClientRow[] }) {
  const t = useTranslations('dashboard.authAdmin.clients');
  const [open, setOpen] = useState<string | null>(clients[0]?.clientId ?? null);
  const [creating, setCreating] = useState(false);
  const [secret, setSecret] = useState<{ clientId: string; clientSecret: string } | null>(null);
  // Controlled so a rejected create (e.g. 409) keeps what was typed.
  const [clientId, setClientId] = useState('');
  const [description, setDescription] = useState('');

  const [createState, createAction, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const r = await createDeviceClientAction(prev, fd);
    if (r.status === 'ok' && r.created) {
      setSecret(r.created);
      setCreating(false);
      setClientId('');
      setDescription('');
      // Keep the one-time secret out of the action state: it lives only in
      // `secret` and is gone once dismissed.
      return { status: 'ok' } as const;
    }
    return r;
  }, IDLE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem', flexWrap: 'wrap', gap: '.5rem' }}>
        <div>
          <MonoLabel>{t('registered', { count: clients.length })}</MonoLabel>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '.65rem', color: 'var(--n-50)' }}>{t('source')}</span>
        </div>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} style={btnPrimary}>
            {t('new')}
          </button>
        )}
      </div>

      <p style={{ ...hintStyle, marginTop: 0, marginBottom: '.5rem' }}>{t('ssoNote')}</p>

      {secret && (
        <div role="status" style={{ padding: '1rem', background: 'var(--blue-wash)', border: '1px solid rgba(14,60,166,.2)', borderRadius: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.4rem' }}>
            <Icon name="lock" size={11} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: '.65rem', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--blue-base)' }}>
              {t('secretTitle', { clientId: secret.clientId })}
            </span>
          </div>
          <p style={{ fontSize: '.78rem', color: 'var(--n-80)', lineHeight: 1.5, marginBottom: '.6rem' }}>{t('secretBody')}</p>
          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <code
              style={{
                flex: '1 1 260px',
                fontFamily: 'var(--mono)',
                fontSize: '.75rem',
                padding: '.45rem .6rem',
                background: 'var(--white)',
                border: '1px solid rgba(162,167,176,.35)',
                borderRadius: '2px',
                wordBreak: 'break-all',
                userSelect: 'all',
              }}
            >
              {secret.clientSecret}
            </code>
            <CopyButton text={secret.clientSecret} label={t('copy')} copiedLabel={t('copied')} style={btnSmall} />
            <button type="button" onClick={() => setSecret(null)} style={btnSecondary}>
              {t('secretDismiss')}
            </button>
          </div>
        </div>
      )}

      {creating && (
        <form action={createAction} style={{ ...cardStyle, padding: '1.1rem 1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '.75rem 1rem' }}>
          <label>
            <MonoLabel mb=".3rem">{t('clientId')}</MonoLabel>
            <input
              name="clientId"
              required
              pattern="[a-z0-9\-]{3,32}"
              maxLength={32}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              autoComplete="off"
              autoFocus
              style={fieldStyle}
            />
            <p style={hintStyle}>{t('clientIdHint')}</p>
            <FieldError state={createState} field="clientId" />
          </label>
          <label>
            <MonoLabel mb=".3rem">{t('description')}</MonoLabel>
            <input
              name="description"
              maxLength={200}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              autoComplete="off"
              style={fieldStyle}
            />
            <p style={hintStyle}>{t('descriptionHint')}</p>
            <FieldError state={createState} field="description" />
          </label>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
            <FormError state={createState} />
            <div style={{ display: 'flex', gap: '.5rem', marginLeft: 'auto' }}>
              <button type="button" onClick={() => setCreating(false)} style={btnSecondary}>
                {t('cancel')}
              </button>
              <button type="submit" disabled={pending} style={{ ...btnPrimary, padding: '.5rem 1rem' }}>
                {pending ? t('creating') : t('create')}
              </button>
            </div>
          </div>
        </form>
      )}

      {clients.length === 0 && (
        <div style={{ ...cardStyle, padding: '2rem 1rem', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '.75rem', color: 'var(--n-50)' }}>
          {t('none')}
        </div>
      )}

      {clients.map((c) => (
        <ClientItem key={c.clientId} client={c} isOpen={open === c.clientId} onToggle={() => setOpen(open === c.clientId ? null : c.clientId)} />
      ))}
    </div>
  );
}

function ClientItem({ client: c, isOpen, onToggle }: { client: ClientRow; isOpen: boolean; onToggle: () => void }) {
  const t = useTranslations('dashboard.authAdmin.clients');
  const [revokeState, revokeAction, revoking] = useActionState(deleteDeviceClientAction, IDLE);
  const confirmRevoke = (e: FormEvent<HTMLFormElement>) => {
    if (!window.confirm(t('confirmRevoke', { clientId: c.clientId }))) e.preventDefault();
  };

  return (
    <div style={{ ...cardStyle, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        style={{
          width: '100%',
          textAlign: 'left',
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto auto',
          gap: '.85rem',
          alignItems: 'center',
          padding: '.85rem 1rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            width: 32,
            height: 32,
            background: 'var(--n-10)',
            border: '1px solid rgba(162,167,176,.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--n-70)',
          }}
        >
          <Icon name="chip" size={13} />
        </span>
        <span>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '.85rem', fontWeight: 500, color: 'var(--n-100)' }}>{c.clientId}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '.65rem', color: 'var(--n-50)', marginTop: '.15rem' }}>
            {c.scopes.join(' · ')} · {c.description ?? t('noDescription')}
          </div>
        </span>
        <Pill tone="info">device</Pill>
        <span style={{ fontFamily: 'var(--mono)', fontSize: '.85rem', color: 'var(--n-50)' }}>{isOpen ? '−' : '+'}</span>
      </button>

      {isOpen && (
        <div
          style={{
            padding: '0 1rem 1.1rem',
            borderTop: '1px dashed rgba(162,167,176,.3)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem 1.5rem',
          }}
        >
          <div style={{ paddingTop: '1rem' }}>
            <MonoLabel mb=".4rem">{t('scopes')}</MonoLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem' }}>
              {c.scopes.map((s) => (
                <Pill key={s} tone="mute">
                  {s}
                </Pill>
              ))}
            </div>
            <MonoLabel mt="1rem" mb=".4rem">{t('createdAt')}</MonoLabel>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '.75rem', color: 'var(--n-80)' }}>{c.createdLabel}</div>
          </div>
          <div style={{ paddingTop: '1rem' }}>
            <MonoLabel mb=".4rem">{t('description')}</MonoLabel>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '.75rem', color: 'var(--n-80)' }}>{c.description ?? t('noDescription')}</div>
            <form action={revokeAction} onSubmit={confirmRevoke} style={{ marginTop: '1rem' }}>
              <input type="hidden" name="clientId" value={c.clientId} />
              <button type="submit" disabled={revoking} style={{ ...btnDanger, fontSize: '.65rem', padding: '.4rem .7rem' }}>
                {t('revoke')}
              </button>
            </form>
            <div style={{ marginTop: '.4rem' }}>
              <FormError state={revokeState} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
