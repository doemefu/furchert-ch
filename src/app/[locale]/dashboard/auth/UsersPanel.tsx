'use client';

// Users tab, ported from prototype `auth-admin.jsx` AuthUsers + UserDrawer.
// The list comes from the server (GET /api/v1/users, one page); search and
// the status/role chips filter that page client-side, as in the prototype.
// Every mutation is a Server Action (`actions.ts`) that re-checks ADMIN and
// calls auth-service — no token or password ever round-trips through state.
// Prototype deviation: status is ACTIVE/INACTIVE (auth-service's values; the
// prototype's DISABLED does not exist).
import { useActionState, useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { IDLE, type ActionState } from '@/lib/authadmin/forms';
import type { UserRole, UserStatus } from '@/lib/authadmin/userFields';
import { createUserAction, deleteUserAction, resetPasswordAction, updateUserAction } from './actions';
import { FieldError, FormError } from './FormFeedback';
import { MonoLabel, Pill, btnDanger, btnPrimary, btnSecondary, btnSmall, cardStyle, fieldStyle, hintStyle, BORDER } from './ui';

/** A user row as rendered — timestamps pre-formatted on the server (no hydration drift). */
export interface UserRow {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdLabel: string;
  updatedLabel: string;
}

type Filter = 'all' | 'active' | 'inactive' | 'admin';

const GRID = '2.4rem 1.2fr 1.7fr .7fr .8fr 1fr 6.5rem';

export function UsersPanel({
  users,
  page,
  size,
  total,
  currentUsername,
}: {
  users: UserRow[];
  page: number;
  size: number;
  total: number;
  /** The signed-in admin's username — that row cannot be deleted, deactivated or demoted. */
  currentUsername: string | null;
}) {
  const t = useTranslations('dashboard.authAdmin.users');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  // null = closed, 'new' = create form, number = edit that user id.
  const [drawer, setDrawer] = useState<null | 'new' | number>(null);

  const needle = q.trim().toLowerCase();
  const filtered = users.filter((u) => {
    const matchQ = !needle || u.username.toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle);
    const matchF =
      filter === 'all' ||
      (filter === 'active' && u.status === 'ACTIVE') ||
      (filter === 'inactive' && u.status === 'INACTIVE') ||
      (filter === 'admin' && u.role === 'ADMIN');
    return matchQ && matchF;
  });
  const editing = typeof drawer === 'number' ? users.find((u) => u.id === drawer) : undefined;
  const pages = Math.max(1, Math.ceil(total / size));

  const chips: Array<[Filter, string]> = [
    ['all', t('filterAll')],
    ['active', t('filterActive')],
    ['inactive', t('filterInactive')],
    ['admin', t('filterAdmin')],
  ];

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('search')}
            aria-label={t('searchLabel')}
            style={{ ...fieldStyle, flex: '1 1 220px', maxWidth: 340, width: 'auto', fontSize: '.78rem' }}
          />
          <div style={{ display: 'flex', gap: '.25rem', flexWrap: 'wrap' }}>
            {chips.map(([k, label]) => (
              <button
                key={k}
                type="button"
                aria-pressed={filter === k}
                onClick={() => setFilter(k)}
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '.65rem',
                  letterSpacing: '.04em',
                  textTransform: 'uppercase',
                  padding: '.35rem .65rem',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  border: '1px solid rgba(162,167,176,.35)',
                  background: filter === k ? 'var(--n-100)' : 'transparent',
                  color: filter === k ? 'var(--white)' : 'var(--n-60)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <button type="button" onClick={() => setDrawer('new')} style={btnPrimary}>
          {t('new')}
        </button>
      </div>

      {/* Table */}
      <div style={{ ...cardStyle, overflowX: 'auto' }}>
        <div style={{ minWidth: 720 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: GRID,
              alignItems: 'center',
              gap: '.5rem',
              padding: '.65rem 1rem',
              background: 'var(--n-10)',
              borderBottom: BORDER,
              fontFamily: 'var(--mono)',
              fontSize: '.62rem',
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              color: 'var(--n-50)',
            }}
          >
            <span>{t('colId')}</span>
            <span>{t('colUsername')}</span>
            <span>{t('colEmail')}</span>
            <span>{t('colRole')}</span>
            <span>{t('colStatus')}</span>
            <span>{t('colUpdated')}</span>
            <span />
          </div>
          {filtered.length === 0 && (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '.75rem', color: 'var(--n-50)' }}>
              {t('none')}
            </div>
          )}
          {filtered.map((u, i) => (
            <div
              key={u.id}
              style={{
                display: 'grid',
                gridTemplateColumns: GRID,
                alignItems: 'center',
                gap: '.5rem',
                padding: '.7rem 1rem',
                borderBottom: i < filtered.length - 1 ? '1px solid rgba(162,167,176,.18)' : 'none',
                fontFamily: 'var(--mono)',
                fontSize: '.78rem',
                color: 'var(--n-90)',
              }}
            >
              <span style={{ color: 'var(--n-50)' }}>#{u.id}</span>
              <span style={{ color: 'var(--n-100)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.username}</span>
              <span style={{ color: 'var(--n-60)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span>
              <span>
                <Pill tone={u.role === 'ADMIN' ? 'info' : 'mute'}>{u.role}</Pill>
              </span>
              <span>
                <Pill tone={u.status === 'ACTIVE' ? 'ok' : 'warn'}>{u.status}</Pill>
              </span>
              <span style={{ color: 'var(--n-50)', fontSize: '.7rem' }}>{u.updatedLabel}</span>
              <span style={{ display: 'flex', gap: '.3rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setDrawer(u.id)} style={btnSmall}>
                  {t('edit')}
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Paging — only when auth-service holds more than one page */}
      {(pages > 1 || page > 0) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '.75rem', fontFamily: 'var(--mono)', fontSize: '.68rem', color: 'var(--n-50)' }}>
          <span>
            {total > page * size && <>{t('pageInfo', { from: page * size + 1, to: Math.min((page + 1) * size, total), total })} · </>}
            {t('pageOnlyFilter')}
          </span>
          <span style={{ display: 'flex', gap: '.4rem' }}>
            {page > 0 && (
              <Link href={`/dashboard/auth?tab=users&page=${page - 1}`} style={btnSmall}>
                {t('prev')}
              </Link>
            )}
            {page + 1 < pages && (
              <Link href={`/dashboard/auth?tab=users&page=${page + 1}`} style={btnSmall}>
                {t('next')}
              </Link>
            )}
          </span>
        </div>
      )}

      {drawer === 'new' && <UserDrawer key="new" onClose={() => setDrawer(null)} />}
      {editing && (
        <UserDrawer key={editing.id} user={editing} isSelf={currentUsername === null || editing.username === currentUsername} onClose={() => setDrawer(null)} />
      )}
    </div>
  );
}

function UserDrawer({ user, isSelf = false, onClose }: { user?: UserRow; isSelf?: boolean; onClose: () => void }) {
  const t = useTranslations('dashboard.authAdmin.drawer');
  const isNew = !user;
  // Controlled fields: React resets uncontrolled inputs after every action,
  // which would wipe what the admin typed when auth-service rejects a save.
  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [role, setRole] = useState<UserRole>(user?.role ?? 'USER');
  const [status, setStatus] = useState<UserStatus>(user?.status ?? 'ACTIVE');
  const [pwReset, setPwReset] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Wrapping the action closes the drawer on success without an effect.
  const [saveState, saveAction, saving] = useActionState(async (prev: ActionState, fd: FormData) => {
    const r = await (isNew ? createUserAction(prev, fd) : updateUserAction(prev, fd));
    if (r.status === 'ok') onClose();
    return r;
  }, IDLE);
  const [deleteState, deleteAction, deleting] = useActionState(async (prev: ActionState, fd: FormData) => {
    const r = await deleteUserAction(prev, fd);
    if (r.status === 'ok') onClose();
    return r;
  }, IDLE);
  const [resetState, resetAction, resetting] = useActionState(resetPasswordAction, IDLE);

  const confirmDelete = (e: FormEvent<HTMLFormElement>) => {
    if (!user || !window.confirm(t('confirmDelete', { username: user.username }))) e.preventDefault();
  };

  // Portalled to <body>: the page's layout wrappers form a stacking context
  // below the fixed site header, which would otherwise cover the drawer top.
  return createPortal(
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(8,24,61,.35)', zIndex: 300, display: 'flex', justifyContent: 'flex-end' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-drawer-title"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(440px, 92vw)', height: '100%', background: 'var(--n-10)', borderLeft: '1px solid rgba(162,167,176,.35)', overflowY: 'auto' }}
      >
        <div style={{ padding: '1.5rem', borderBottom: BORDER, background: 'var(--white)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '.65rem', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--n-50)' }}>
              {isNew ? 'POST /api/v1/users' : `PUT /api/v1/users/${user.id}`}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('close')}
              style={{ fontFamily: 'var(--mono)', fontSize: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n-60)' }}
            >
              ×
            </button>
          </div>
          <div id="user-drawer-title" style={{ fontFamily: 'var(--sans)', fontSize: '1.25rem', fontWeight: 500, letterSpacing: '-.02em', color: 'var(--n-100)' }}>
            {isNew ? t('newTitle') : user.username}
          </div>
          {!isNew && (
            <div style={{ fontFamily: 'var(--mono)', fontSize: '.7rem', color: 'var(--n-50)', marginTop: '.25rem' }}>
              {t('created', { id: user.id, created: user.createdLabel })}
            </div>
          )}
        </div>

        <form action={saveAction} id="user-form" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!isNew && <input type="hidden" name="id" value={user.id} />}
          <label>
            <MonoLabel mb=".3rem">{t('username')}</MonoLabel>
            <input
              name="username"
              required
              minLength={3}
              maxLength={50}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              readOnly={isSelf}
              autoComplete="off"
              autoFocus
              style={fieldStyle}
            />
            <FieldError state={saveState} field="username" />
          </label>
          <label>
            <MonoLabel mb=".3rem">{t('email')}</MonoLabel>
            <input
              name="email"
              type="email"
              required
              maxLength={100}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              style={fieldStyle}
            />
            <FieldError state={saveState} field="email" />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
            <label>
              <MonoLabel mb=".3rem">{t('role')}</MonoLabel>
              <select name="role" value={role} onChange={(e) => setRole(e.target.value as UserRole)} style={fieldStyle}>
                <option disabled={isSelf}>USER</option>
                <option>ADMIN</option>
              </select>
            </label>
            {!isNew && (
              <label>
                <MonoLabel mb=".3rem">{t('status')}</MonoLabel>
                <select name="status" value={status} onChange={(e) => setStatus(e.target.value as UserStatus)} style={fieldStyle}>
                  <option>ACTIVE</option>
                  <option disabled={isSelf}>INACTIVE</option>
                </select>
              </label>
            )}
          </div>
          {isSelf && <p style={hintStyle}>{t('selfHint')}</p>}
          {!isNew && status === 'INACTIVE' && user.status !== 'INACTIVE' && <p style={hintStyle}>{t('inactiveHint')}</p>}

          {isNew && (
            <label>
              <MonoLabel mb=".3rem">{t('password')}</MonoLabel>
              <input name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" style={fieldStyle} />
              <p style={hintStyle}>{t('passwordHint')}</p>
              <FieldError state={saveState} field="password" />
            </label>
          )}
          <FormError state={saveState} />
        </form>

        {!isNew && (
          <div style={{ padding: '0 1.5rem 1.5rem' }}>
            <div style={{ borderTop: BORDER, paddingTop: '1rem' }}>
              <button type="button" onClick={() => setPwReset((p) => !p)} style={btnSecondary}>
                {pwReset ? t('resetCancel') : t('reset')}
              </button>
              {pwReset && (
                <form action={resetAction} style={{ marginTop: '.75rem', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                  <input type="hidden" name="id" value={user.id} />
                  <input
                    name="newPassword"
                    type="password"
                    required
                    minLength={8}
                    maxLength={72}
                    placeholder={t('newPassword')}
                    aria-label={t('newPassword')}
                    autoComplete="new-password"
                    style={fieldStyle}
                  />
                  <p style={hintStyle}>{t('resetHint', { id: user.id })}</p>
                  <FieldError state={resetState} field="newPassword" />
                  <FormError state={resetState} />
                  {resetState.status === 'ok' && (
                    <p role="status" style={{ ...hintStyle, color: '#15803d' }}>
                      {t('resetDone')}
                    </p>
                  )}
                  <div>
                    <button type="submit" disabled={resetting} style={btnSecondary}>
                      {resetting ? t('saving') : t('resetSubmit')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        <div style={{ padding: '1.25rem 1.5rem', borderTop: BORDER, background: 'var(--white)', display: 'flex', justifyContent: 'space-between', gap: '.5rem', flexWrap: 'wrap' }}>
          {!isNew && (
            <form action={deleteAction} onSubmit={confirmDelete}>
              <input type="hidden" name="id" value={user.id} />
              <button type="submit" disabled={deleting || isSelf} style={{ ...btnDanger, ...(isSelf ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }}>
                {t('delete')}
              </button>
            </form>
          )}
          <div style={{ display: 'flex', gap: '.5rem', marginLeft: 'auto' }}>
            <button type="button" onClick={onClose} style={btnSecondary}>
              {t('cancel')}
            </button>
            <button type="submit" form="user-form" disabled={saving} style={{ ...btnPrimary, padding: '.5rem 1rem' }}>
              {saving ? t('saving') : isNew ? t('create') : t('save')}
            </button>
          </div>
        </div>
        {deleteState.status === 'error' && (
          <div style={{ padding: '0 1.5rem 1.25rem', background: 'var(--white)' }}>
            <FormError state={deleteState} />
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
