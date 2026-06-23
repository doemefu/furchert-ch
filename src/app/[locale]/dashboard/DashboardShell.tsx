// Dashboard shell — server-rendered port of prototype `dashboard.jsx:136-296`.
// Wraps the cluster strip + apps section + infra shortcuts. The apps grid
// itself is the client island in ./AppGrid.tsx.
//
// NOTE on padding: the parent `<main>` in `src/app/[locale]/layout.tsx`
// already applies `paddingTop: 'var(--header-h)'` for the fixed header.
// Adding it here would double-pad — the prototype's `paddingTop` lived in
// its own SPA wrapper without a layout. See worklog finding F1.
import type { CSSProperties } from 'react';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { Icon } from '@/components/ui/Icon';
import { StatusDot } from '@/components/ui/StatusDot';
import { CLUSTER_NODES } from '@/data/cluster-nodes';
import { HOMELAB_APPS } from '@/data/homelab-apps';
import { AppGrid } from './AppGrid';
import { DateTimeStrip } from './DateTimeStrip';
import { SignOutButton } from './SignOutButton';

const monoKicker: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '.8125rem',
  letterSpacing: '.06em',
  textTransform: 'uppercase',
  color: 'var(--n-50)',
};

const monoLabel: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '.72rem',
  letterSpacing: '.06em',
  textTransform: 'uppercase',
  color: 'var(--n-50)',
};

const privatePillStyle: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '.68rem',
  letterSpacing: '.04em',
  textTransform: 'uppercase',
  padding: '.15rem .5rem',
  background: 'var(--blue-wash)',
  border: '1px solid rgba(14,60,166,.2)',
  borderRadius: '2px',
  color: 'var(--blue-base)',
};

const externalBtnStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '.4rem',
  fontFamily: 'var(--mono)',
  fontSize: '.72rem',
  letterSpacing: '.04em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  color: 'var(--n-60)',
  border: '1px solid rgba(162,167,176,.3)',
  borderRadius: '2px',
  padding: '.35rem .75rem',
};

function formatDateTime(locale: Locale, now: Date): string {
  // Pinned to Europe/Zurich so the date strip matches the homelab's
  // physical location regardless of the pod's host TZ (k3s default ≈ UTC).
  const tag = locale === 'de' ? 'de-CH' : 'en-GB';
  const date = new Intl.DateTimeFormat(tag, {
    dateStyle: 'full',
    timeZone: 'Europe/Zurich',
  }).format(now);
  const time = new Intl.DateTimeFormat(tag, {
    timeStyle: 'short',
    timeZone: 'Europe/Zurich',
  }).format(now);
  return `${date} · ${time}`;
}

export async function DashboardShell({ locale }: { locale: Locale }) {
  const t = await getTranslations('dashboard');
  const onlineCount = HOMELAB_APPS.filter((a) => a.status === 'online').length;
  const now = new Date();
  const dateTime = formatDateTime(locale, now);

  return (
    <div style={{ background: 'var(--n-10)' }}>
      {/* Section A — dashboard header bar */}
      <div style={{ borderBottom: '1px solid rgba(162,167,176,.22)', background: 'var(--white)' }}>
        <div
          className="container border-x"
          style={{
            padding: '1.5rem 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '.25rem' }}>
              <p style={monoKicker}>{t('headerKicker')}</p>
              <span style={privatePillStyle}>{t('private')}</span>
            </div>
            {/* SSR initial paint is the Zurich-pinned `dateTime` string;
                the client island re-renders with the browser's local TZ
                after hydration. `key={locale}` forces a remount on
                DE↔EN switch so the strip picks up the new SSR value
                instead of holding the previous locale's text. */}
            <DateTimeStrip key={locale} initial={dateTime} initialEpoch={now.getTime()} locale={locale} />
          </div>
          <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
            <a
              href="https://github.com/doemefu/homelab"
              target="_blank"
              rel="noopener noreferrer"
              style={externalBtnStyle}
            >
              <Icon name="github" size={12} /> {t('iacRepo')}
            </a>
            <SignOutButton compact />
          </div>
        </div>
      </div>

      <div className="container border-x">
        {/* Section B — k3s cluster status strip */}
        <div style={{ borderBottom: '1px solid rgba(162,167,176,.22)', padding: '1.5rem 0' }}>
          <p style={{ ...monoLabel, marginBottom: '1rem' }}>
            {t('cluster.title', { count: CLUSTER_NODES.length })}
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '.75rem',
            }}
          >
            {CLUSTER_NODES.map((node) => (
              <div
                key={node.name}
                style={{
                  padding: '1rem',
                  background: 'var(--white)',
                  border: '1px solid rgba(162,167,176,.22)',
                  borderRadius: '2px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <StatusDot status={node.status === 'Ready' ? 'online' : 'wip'} />
                    <span
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: '.75rem',
                        fontWeight: 500,
                        letterSpacing: '.04em',
                        color: 'var(--n-100)',
                      }}
                    >
                      {node.name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '.65rem',
                      letterSpacing: '.04em',
                      textTransform: 'uppercase',
                      padding: '.1rem .4rem',
                      border: '1px solid rgba(162,167,176,.3)',
                      borderRadius: '2px',
                      color: node.role === 'control-plane' ? 'var(--blue-base)' : 'var(--n-50)',
                    }}
                  >
                    {node.role}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '.68rem',
                    letterSpacing: '.03em',
                    color: 'var(--n-50)',
                    marginBottom: '.75rem',
                  }}
                >
                  {node.type}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
                  {([
                    { label: t('cluster.cpu'), val: node.cpu },
                    { label: t('cluster.mem'), val: node.mem },
                  ] as const).map((m) => (
                    <div key={m.label}>
                      <div
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '.6rem',
                          letterSpacing: '.06em',
                          textTransform: 'uppercase',
                          color: 'var(--n-40)',
                          marginBottom: '.2rem',
                        }}
                      >
                        {m.label}
                      </div>
                      <div style={{ height: 4, background: 'var(--n-20)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: m.val,
                            background: 'var(--blue-base)',
                            borderRadius: '2px',
                            transition: 'width 1s ease',
                          }}
                        />
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '.65rem', color: 'var(--n-60)', marginTop: '.15rem' }}>
                        {m.val}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section C — apps & services. The kicker text is server-rendered
            then handed to the client island so the filter chips can flex
            against it without forcing the whole section into the client
            bundle. */}
        <div style={{ padding: '2rem 0' }}>
          <AppGrid
            apps={HOMELAB_APPS}
            kicker={t('apps.kicker', { online: onlineCount, total: HOMELAB_APPS.length })}
          />
        </div>

        {/* Section D — infra shortcuts */}
        <div style={{ borderTop: '1px solid rgba(162,167,176,.22)', padding: '2rem 0' }}>
          <p style={{ ...monoLabel, marginBottom: '1rem' }}>{t('shortcuts.title')}</p>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            {[
              { label: t('shortcuts.iac'), href: 'https://github.com/doemefu/homelab' },
              { label: t('shortcuts.authService'), href: 'https://github.com/doemefu/homelab-auth-service' },
              { label: t('shortcuts.n8n'), href: 'https://github.com/doemefu/homelab-n8n' },
              { label: t('shortcuts.allRepos'), href: 'https://github.com/doemefu' },
            ].map((l) => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '.4rem',
                  fontFamily: 'var(--mono)',
                  fontSize: '.72rem',
                  letterSpacing: '.04em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  border: '1px solid rgba(162,167,176,.3)',
                  borderRadius: '2px',
                  padding: '.4rem .8rem',
                  color: 'var(--n-60)',
                  transition: 'color .15s, border-color .15s',
                }}
              >
                <Icon name="github" size={12} /> {l.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
