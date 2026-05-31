'use client';

// Client island for the dashboard's app/service tiles. Owns one piece of
// state — the active category filter. Tile layout ported from prototype
// `dashboard.jsx:198-269`. Manage button on internal apps is disabled
// until Phase 6 (TODO below).
import { useState, type CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, type IconName } from '@/components/ui/Icon';
import { StatusDot } from '@/components/ui/StatusDot';
import type { HomelabApp, AppStatus } from '@/data/homelab-apps';

const ICON_MAP: Record<string, IconName> = {
  'IoT Platform': 'iot',
  n8n: 'flow',
  Aemtlifyer: 'users',
  'Personal Agent': 'ai',
  Grafana: 'chart',
  ArgoCD: 'git',
  Longhorn: 'db',
  'Auth Service': 'lock',
  Karaokee: 'mic',
  'Club Assist': 'boat',
  Terra1: 'chip',
};

// Apps with in-app admin GUIs (built in Phase 6). Until then, the Manage
// button is rendered disabled — clicking would 404.
const INTERNAL_APPS = new Set<string>(['Auth Service', 'IoT Platform']);

const STATUS_COLOR: Record<AppStatus, string> = {
  online: 'var(--status-online)',
  wip: 'var(--status-wip)',
  repo: 'var(--status-repo)',
};

const sectionLabel: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '.8125rem',
  letterSpacing: '.06em',
  textTransform: 'uppercase',
  color: 'var(--n-50)',
};

const chipBase: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '.68rem',
  letterSpacing: '.04em',
  textTransform: 'uppercase',
  padding: '.3rem .65rem',
  borderRadius: '2px',
  border: '1px solid rgba(162,167,176,.35)',
  cursor: 'pointer',
  transition: 'background .15s, color .15s',
};

const tileStyle: CSSProperties = {
  background: 'var(--white)',
  border: '1px solid rgba(162,167,176,.22)',
  borderRadius: '2px',
  padding: '1.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '.75rem',
  transition: 'border-color .2s, box-shadow .2s',
  cursor: 'default',
};

const iconBoxStyle: CSSProperties = {
  width: '2rem',
  height: '2rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid rgba(162,167,176,.3)',
  background: 'var(--n-10)',
};

const actionBase: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '.35rem',
  fontFamily: 'var(--mono)',
  fontSize: '.68rem',
  letterSpacing: '.04em',
  textTransform: 'uppercase',
  padding: '.35rem .7rem',
  border: 'none',
  borderRadius: '2px',
  textDecoration: 'none',
};

// Shared style for non-clickable action affordances (internal Manage
// placeholder + offline external tile). Uses <button disabled> so the
// disabled attribute does the work — no click handler, no nav, AT
// announces it as unavailable. `appearance: 'none'` resets Safari's
// UA button rendering (otherwise the gradient leaks through).
const disabledAction: CSSProperties = {
  ...actionBase,
  background: 'var(--n-20)',
  color: 'var(--n-50)',
  cursor: 'default',
  // pointerEvents: 'none' on the button itself stops nested <span>/<Icon>
  // from showing a text cursor when hovered — disabled buttons receive
  // no mouse events anyway, so this is a UX consistency fix.
  pointerEvents: 'none',
  appearance: 'none',
  WebkitAppearance: 'none',
};

export function AppGrid({ apps, kicker }: { apps: HomelabApp[]; kicker: string }) {
  const t = useTranslations('dashboard.apps');
  const [activeFilter, setActiveFilter] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(apps.map((a) => a.cat)))];
  const filtered = activeFilter === 'All' ? apps : apps.filter((a) => a.cat === activeFilter);

  return (
    <>
      {/* Section header row — kicker (server-rendered text passed in) on the
          left, filter chips on the right, matches prototype dashboard.jsx:199. */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <p style={sectionLabel}>{kicker}</p>
        <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
          {categories.map((c) => {
            const isActive = activeFilter === c;
            const label = c === 'All' ? t('filterAll') : c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setActiveFilter(c)}
                style={{
                  ...chipBase,
                  background: isActive ? 'var(--n-100)' : 'transparent',
                  color: isActive ? 'var(--white)' : 'var(--n-60)',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tile grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '.75rem',
        }}
      >
        {filtered.map((app) => {
          const iconName = ICON_MAP[app.name] ?? 'code';
          const isInternal = INTERNAL_APPS.has(app.name);
          const isOnline = app.status === 'online';

          return (
            <div
              key={app.name}
              style={tileStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(14,60,166,.3)';
                e.currentTarget.style.boxShadow = '0 2px 12px rgba(14,60,166,.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(162,167,176,.22)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={iconBoxStyle}>
                  <Icon name={iconName} size={14} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                  <StatusDot status={app.status} />
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '.65rem',
                      letterSpacing: '.06em',
                      textTransform: 'uppercase',
                      color: STATUS_COLOR[app.status],
                    }}
                  >
                    {t(`status.${app.status}`)}
                  </span>
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontFamily: 'var(--sans)',
                    fontSize: '.95rem',
                    fontWeight: 500,
                    letterSpacing: '-.02em',
                    color: 'var(--n-100)',
                    marginBottom: '.25rem',
                  }}
                >
                  {app.name}
                </div>
                <p style={{ fontSize: '.825rem', color: 'var(--n-60)', lineHeight: 1.45 }}>{app.desc}</p>
              </div>

              <div
                style={{
                  marginTop: 'auto',
                  display: 'flex',
                  gap: '.6rem',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '.65rem',
                    letterSpacing: '.04em',
                    textTransform: 'uppercase',
                    color: 'var(--n-50)',
                  }}
                >
                  {app.cat}
                </span>
                <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
                  {app.repo && (
                    <a
                      href={app.repo}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="GitHub"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '.3rem',
                        fontFamily: 'var(--mono)',
                        fontSize: '.65rem',
                        letterSpacing: '.04em',
                        textTransform: 'uppercase',
                        color: 'var(--n-50)',
                        textDecoration: 'none',
                      }}
                    >
                      <Icon name="github" size={11} /> {t('repo')}
                    </a>
                  )}

                  {isInternal ? (
                    // TODO(phase6): replace with <Link href={`/dashboard/${app.name === 'Auth Service' ? 'auth' : 'devices'}`}>
                    <button type="button" disabled style={disabledAction}>
                      {t('manage')} <span style={{ color: 'var(--n-40)' }}>· {t('soon')}</span>
                    </button>
                  ) : isOnline ? (
                    <a
                      href={app.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        ...actionBase,
                        background: 'var(--n-100)',
                        color: 'var(--white)',
                        cursor: 'pointer',
                      }}
                    >
                      {t('open')} <Icon name="ext" size={10} />
                    </a>
                  ) : (
                    // Offline tile: render disabled (no nav) instead of an
                    // anchor with cursor:default. Status badge already
                    // signals why; AT announces the disabled state.
                    <button type="button" disabled style={disabledAction}>
                      {t('open')} <Icon name="ext" size={10} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
