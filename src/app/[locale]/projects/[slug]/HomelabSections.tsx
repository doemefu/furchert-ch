// Public homelab sections on /projects/homelab: what runs (static showcase)
// and the live status. Server component; only the live values are a client
// island. Everything shown here is public by design (see `data/homelab-lab.ts`).
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
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

export async function HomelabSections({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'pages.lab' });
  const tProjects = await getTranslations({ locale, namespace: 'pages.projects' });
  const updated = new Intl.DateTimeFormat(LOCALE_TAG[locale], { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(LAB_CONTENT_UPDATED),
  );

  return (
    <>
      <section className="pj-sec">
        <h2 className="dir-head">{t('showcaseHeading')}</h2>
        <p className="lh-lead">{t('showcaseLead')}</p>
        <div className="cell-grid lh-grid">
          {LAB_SHOWCASE.map((item) => (
            <div key={item.id} className="cell lh-item">
              <h3>{item.i18n[locale].title}</h3>
              <p>{item.i18n[locale].text}</p>
              {item.repos.length > 0 && (
                <div className="lh-repos">
                  {item.repos.map((repo) => (
                    <a
                      key={repo.href}
                      href={repo.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${repo.label}: ${t('reposLabel')} ${tProjects('newTab')}`}
                      className="text-link text-link-block"
                      style={{ fontSize: 'var(--text-14)' }}
                    >
                      {repo.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="lh-note">
          {t('showcaseUpdated')}: <time dateTime={LAB_CONTENT_UPDATED}>{updated}</time>
        </p>
      </section>

      <section className="pj-sec">
        <h2 className="dir-head">{t('statusHeading')}</h2>
        <p className="lh-lead">{t('statusLead', { days: LAB_UPTIME_WINDOW_DAYS })}</p>
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
        <p className="lh-note">{t('statusNote')}</p>
      </section>
    </>
  );
}
