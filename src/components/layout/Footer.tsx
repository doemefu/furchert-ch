// Ported verbatim from the prototype (shared.jsx Footer). Server component;
// nav uses the locale-aware Link.
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/ui/Icon';

const NAV_KEYS = ['about', 'it', 'rowing', 'projects', 'automation', 'contact'] as const;

export async function Footer() {
  const t = await getTranslations();

  const colTitle = {
    fontFamily: 'var(--mono)',
    fontSize: '.72rem',
    letterSpacing: '.06em',
    textTransform: 'uppercase' as const,
    color: 'var(--n-50)',
    marginBottom: '.75rem',
  };
  const linkStyle = {
    fontFamily: 'var(--mono)',
    fontSize: '.75rem',
    letterSpacing: '.04em',
    textTransform: 'uppercase' as const,
    textDecoration: 'none',
    color: 'var(--n-50)',
    cursor: 'pointer',
    transition: 'color .15s',
  };

  return (
    <footer
      style={{
        background: 'var(--n-100)',
        color: 'var(--n-60)',
        paddingTop: '3rem',
        paddingBottom: '3rem',
      }}
    >
      <div className="container border-x">
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
                fontSize: '.9rem',
                fontWeight: 500,
                letterSpacing: '.04em',
                textTransform: 'uppercase',
                color: 'var(--white)',
                marginBottom: '1rem',
              }}
            >
              furchert.ch
            </div>
            <p style={{ fontSize: '.875rem', color: 'var(--n-60)', lineHeight: 1.5 }}>
              {t('footer.role')}
            </p>
          </div>

          <div>
            <div style={colTitle}>{t('footer.navigation')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
              {NAV_KEYS.map((k) => (
                <Link key={k} href={`/${k}`} style={linkStyle}>
                  {t(`nav.${k}`)}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div style={colTitle}>{t('footer.contact')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
              <a
                href="mailto:dominic@furchert.ch"
                style={{ ...linkStyle, textTransform: 'none' }}
              >
                dominic@furchert.ch
              </a>
              <span style={{ ...linkStyle, color: 'var(--n-60)', cursor: 'default' }}>
                {t('footer.location')}
              </span>
            </div>
          </div>

          <div>
            <div style={colTitle}>{t('footer.social')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
              <a
                href="https://github.com/doemefu"
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...linkStyle, display: 'flex', alignItems: 'center', gap: '.4rem' }}
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
            fontSize: '.8125rem',
            color: 'var(--n-60)',
          }}
        >
          <span>{t('footer.copy')}</span>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            {/* Imprint/Privacy pages are not implemented yet (follow-up). Render
                as non-interactive placeholders rather than `href="#"` so they
                don't masquerade as real navigation. */}
            <span style={{ ...linkStyle, color: 'var(--n-60)', cursor: 'default' }}>
              {t('footer.imprint')}
            </span>
            <span style={{ ...linkStyle, color: 'var(--n-60)', cursor: 'default' }}>
              {t('footer.privacy')}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
