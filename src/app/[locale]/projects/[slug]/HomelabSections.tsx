// Public homelab sections on /projects/homelab: what runs (static showcase)
// and the live status. Server component; only the live values are a client
// island. Everything shown here is public by design (see `data/homelab-lab.ts`).
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { Icon } from '@/components/ui/Icon';
import {
  LAB_CONTENT_UPDATED,
  LAB_SERVICES,
  LAB_SERVICE_IDS,
  LAB_SHOWCASE,
  LAB_UPTIME_WINDOW_DAYS,
  SHOW_UPTIME,
} from '@/data/homelab-lab';
import { LOCALE_TAG } from '@/app/[locale]/dashboard/datetime';
import { LabLiveStatus } from './LabLiveStatus';

const label = {
  fontFamily: 'var(--mono)',
  fontSize: '.8125rem',
  letterSpacing: '.06em',
  textTransform: 'uppercase' as const,
  color: 'var(--n-60)',
  marginBottom: '1rem',
};
const h2 = {
  fontFamily: 'var(--sans)',
  fontSize: 'clamp(1.5rem,3vw,2.25rem)',
  fontWeight: 500,
  letterSpacing: '-.03em',
  color: 'var(--n-100)',
  marginBottom: '1rem',
};
const lead = {
  fontSize: '1rem',
  color: 'var(--n-70)',
  lineHeight: 1.55,
  maxWidth: '62ch',
  marginBottom: '2.5rem',
};

export async function HomelabSections({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'pages.lab' });
  const updated = new Intl.DateTimeFormat(LOCALE_TAG[locale], { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(LAB_CONTENT_UPDATED),
  );

  return (
    <>
      <section style={{ padding: '3rem 0', borderBottom: '1px solid rgba(162,167,176,.22)' }}>
        <p style={label}>{t('showcaseLabel')}</p>
        <h2 style={h2}>{t('showcaseHeading')}</h2>
        <p style={lead}>{t('showcaseLead')}</p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, max(260px, 30%)), 1fr))',
            borderTop: '1px solid rgba(162,167,176,.22)',
          }}
        >
          {LAB_SHOWCASE.map((item) => (
            <div
              key={item.id}
              style={{
                padding: '1.75rem',
                borderRight: '1px solid rgba(162,167,176,.22)',
                borderBottom: '1px solid rgba(162,167,176,.22)',
                display: 'flex',
                flexDirection: 'column',
                gap: '.75rem',
              }}
            >
              <div
                style={{
                  width: '2rem',
                  height: '2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(162,167,176,.35)',
                  background: 'var(--n-10)',
                }}
              >
                <Icon name={item.icon} size={14} />
              </div>
              <h3
                style={{
                  fontFamily: 'var(--sans)',
                  fontSize: '1.05rem',
                  fontWeight: 500,
                  letterSpacing: '-.02em',
                  color: 'var(--n-100)',
                }}
              >
                {item.i18n[locale].title}
              </h3>
              <p style={{ fontSize: '.9rem', color: 'var(--n-60)', lineHeight: 1.55 }}>{item.i18n[locale].text}</p>
              {item.repos.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem 1rem', marginTop: 'auto' }}>
                  {item.repos.map((repo) => (
                    <a
                      key={repo.href}
                      href={repo.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${repo.label}: ${t('reposLabel')}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '.4rem',
                        fontFamily: 'var(--mono)',
                        fontSize: '.72rem',
                        letterSpacing: '.04em',
                        textDecoration: 'none',
                        color: 'var(--blue-base)',
                      }}
                    >
                      <Icon name="github" size={12} /> {repo.label} <Icon name="ext" size={11} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <p
          style={{
            marginTop: '1.5rem',
            fontFamily: 'var(--mono)',
            fontSize: '.75rem',
            letterSpacing: '.04em',
            color: 'var(--n-60)',
          }}
        >
          {t('showcaseUpdated')}: <time dateTime={LAB_CONTENT_UPDATED}>{updated}</time>
        </p>
      </section>

      <section style={{ padding: '3rem 0', borderBottom: '1px solid rgba(162,167,176,.22)' }}>
        <p style={label}>{t('statusLabel')}</p>
        <h2 style={h2}>{t('statusHeading')}</h2>
        <p style={lead}>{t('statusLead', { days: LAB_UPTIME_WINDOW_DAYS })}</p>
        <LabLiveStatus
          locale={locale}
          windowDays={LAB_UPTIME_WINDOW_DAYS}
          showUptime={SHOW_UPTIME}
          rows={LAB_SERVICE_IDS.map((id) => ({ id, ...LAB_SERVICES[id][locale] }))}
          strings={{
            summaryChecking: t('summaryChecking'),
            summaryAllUp: t('summaryAllUp'),
            summaryDown: t('summaryDown'),
            summaryPartial: t('summaryPartial'),
            summaryUnknown: t('summaryUnknown'),
            up: t('up'),
            down: t('down'),
            unknown: t('unknown'),
            checking: t('checking'),
            uptimeTemplate: t('uptimeTemplate', { pct: '{pct}', days: '{days}' }),
            noscript: t('noscript'),
          }}
        />
        <p style={{ marginTop: '1.5rem', fontSize: '.875rem', color: 'var(--n-60)', lineHeight: 1.55, maxWidth: '68ch' }}>
          {t('statusNote')}
        </p>
      </section>
    </>
  );
}
