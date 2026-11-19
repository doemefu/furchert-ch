// Site footer (redesign «Formular» PR 4). Server component; four groups under a
// 2px ink rule: sender, contact, pages, legal. Phone: two columns with sender
// and contact spanning both; from 48rem four columns. Last line: copyright, the
// date of the newest page change and the quiet «Homelab» link to the dashboard.
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/ui/Icon';
import { ContactEmail } from '@/components/ui/ContactEmail';
import { LazyPrivacySettingsLink } from '@/components/analytics/lazy';
import { ANALYTICS_UI_ENABLED } from '@/lib/analytics/flags';
import { PAGE_LAST_MODIFIED } from '@/lib/seo/pages';
import { FooterLocaleLink } from './FooterLocaleLink';

const NAV_KEYS = ['automation', 'about', 'it', 'rowing', 'projects'] as const;

/** Newest ISO date in the lastmod registry: the last real content change of the site. */
const LATEST_CONTENT_DATE = Object.values(PAGE_LAST_MODIFIED).reduce((a, b) => (b > a ? b : a));

export async function Footer() {
  const t = await getTranslations();
  const locale = await getLocale();
  const date = new Intl.DateTimeFormat(locale === 'de' ? 'de-CH' : 'en-GB', {
    day: 'numeric',
    month: locale === 'de' ? 'numeric' : 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${LATEST_CONTENT_DATE}T00:00:00Z`));
  const newTab = <span className="sr-only"> {t('pages.projects.newTab')}</span>;

  return (
    <footer className="ft">
      <div className="container border-x ft-wrap">
        <div className="ft-in">
          <div className="ft-send">
            <span className="ft-lab">{t('footer.sender')}</span>
            <b>Dominic Furchert</b>
            <span>{t('footer.role')}</span>
            <span>{t('footer.location')}</span>
          </div>

          <div className="ft-contact">
            <span className="ft-lab">{t('footer.contact')}</span>
            <ul>
              <li>
                {/* The address is rendered only in the browser (#147). */}
                <ContactEmail label={t('footer.email')} />
              </li>
              <li>
                <span>{t('footer.reply')}</span>
              </li>
              <li>
                <a href="https://linkedin.com/in/dominic-furchert" target="_blank" rel="noopener noreferrer">
                  LinkedIn{newTab}
                </a>
              </li>
              <li>
                <a href="https://github.com/doemefu" target="_blank" rel="noopener noreferrer">
                  GitHub{newTab}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <span className="ft-lab">{t('footer.pages')}</span>
            <ul>
              {NAV_KEYS.map((k) => (
                <li key={k}>
                  <Link href={`/${k}`}>{t(`nav.${k}`)}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <span className="ft-lab">{t('footer.legal')}</span>
            <ul>
              <li>
                <Link href="/imprint">{t('footer.imprint')}</Link>
              </li>
              <li>
                <Link href="/privacy">{t('footer.privacy')}</Link>
              </li>
              <li>{ANALYTICS_UI_ENABLED && <LazyPrivacySettingsLink style={{}} />}</li>
              <li>
                <FooterLocaleLink />
              </li>
            </ul>
          </div>
        </div>

        <div className="ft-bot">
          <span>{t('footer.copy')}</span>
          <span>{t('footer.updated', { date })}</span>
          <Link href="/dashboard" prefetch={false}>
            <Icon name="lock" size={14} />
            {t('footer.homelab')}
          </Link>
        </div>
      </div>
    </footer>
  );
}
