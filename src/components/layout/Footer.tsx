// Ported verbatim from the prototype (shared.jsx Footer). Server component;
// nav uses the locale-aware Link.
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/ui/Icon';
import { ContactEmail } from '@/components/ui/ContactEmail';
import { LazyPrivacySettingsLink } from '@/components/analytics/lazy';
import { ANALYTICS_UI_ENABLED } from '@/lib/analytics/flags';

const NAV_KEYS = ['about', 'it', 'rowing', 'projects', 'automation', 'contact'] as const;

export async function Footer() {
  const t = await getTranslations();

  const colTitle = {
    fontFamily: 'var(--mono)',
    fontSize: 'var(--fs-12)',
    letterSpacing: '.05em',
    textTransform: 'uppercase' as const,
    color: 'var(--n-50)',
    marginBottom: '.75rem',
  };
  const linkStyle = {
    fontFamily: 'var(--mono)',
    fontSize: 'var(--fs-12)',
    textDecoration: 'none',
    color: 'var(--n-50)',
    cursor: 'pointer',
    transition: 'color .15s',
  };

  return (
    <footer
      className="on-dark"
      style={{
        background: 'var(--n-100)',
        color: 'var(--n-40)',
      }}
    >
      <div className="container border-x" style={{ paddingBlock: '3rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '2rem',
            paddingBottom: '2rem',
            borderBottom: '1px solid rgba(162,167,176,.1)',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 'var(--fs-15)',
                fontWeight: 500,
                letterSpacing: '.04em',
                textTransform: 'uppercase',
                color: 'var(--white)',
                marginBottom: '1rem',
              }}
            >
              furchert.ch
            </div>
            <p style={{ fontSize: 'var(--fs-14)', color: 'var(--n-40)', lineHeight: 1.5 }}>
              {t('footer.role')}
            </p>
          </div>

          <div>
            <div style={colTitle}>{t('footer.navigation')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {NAV_KEYS.map((k) => (
                <Link key={k} href={`/${k}`} style={linkStyle}>
                  {t(`nav.${k}`)}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div style={colTitle}>{t('footer.contact')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {/* The address is rendered only in the browser (#147). */}
              <ContactEmail style={linkStyle} />
              <span style={{ ...linkStyle, color: 'var(--n-40)', cursor: 'default' }}>
                {t('footer.location')}
              </span>
            </div>
          </div>

          <div>
            <div style={colTitle}>{t('footer.social')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              <a
                href="https://github.com/doemefu"
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...linkStyle, display: 'flex', alignItems: 'center', gap: '.5rem' }}
              >
                <Icon name="github" size={13} /> GitHub
              </a>
              <a
                href="https://linkedin.com/in/dominic-furchert"
                target="_blank"
                rel="noopener noreferrer"
                style={linkStyle}
              >
                LinkedIn ↗
              </a>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            paddingTop: '1.5rem',
            fontSize: 'var(--fs-13)',
            color: 'var(--n-40)',
          }}
        >
          <span>{t('footer.copy')}</span>
          {/* Three links wrap on phones; unchanged while analytics is dark. */}
          <div
            style={{
              display: 'flex',
              gap: '1.5rem',
              ...(ANALYTICS_UI_ENABLED ? { flexWrap: 'wrap' as const, rowGap: '.5rem' } : null),
            }}
          >
            <Link href="/imprint" style={{ ...linkStyle, color: 'var(--n-40)' }}>
              {t('footer.imprint')}
            </Link>
            <Link href="/privacy" style={{ ...linkStyle, color: 'var(--n-40)' }}>
              {t('footer.privacy')}
            </Link>
            {ANALYTICS_UI_ENABLED && <LazyPrivacySettingsLink style={{ ...linkStyle, color: 'var(--n-40)' }} />}
          </div>
        </div>
      </div>
    </footer>
  );
}
