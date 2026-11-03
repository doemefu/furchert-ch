// Impressum / Datenschutz layout (#16): the shared PageHeader, a contact block
// with the owner's name and e-mail, then the text sections. Typography follows
// the about page (mono uppercase labels, --n-60 body text).
import { PageHeader } from '@/components/ui/PageHeader';
import { LEGAL_CONTACT, type LegalPageCopy } from '@/data/legal';

const BORDER = '1px solid rgba(162,167,176,.22)';

const labelMono = {
  fontFamily: 'var(--mono)',
  fontSize: '.8125rem',
  letterSpacing: '.06em',
  textTransform: 'uppercase' as const,
  color: 'var(--n-50)',
};

const bodyText = {
  fontSize: '1rem',
  color: 'var(--n-60)',
  lineHeight: 1.6,
  letterSpacing: '-.01em',
  maxWidth: '70ch',
};

const valueText = { fontSize: '1rem', color: 'var(--n-100)', marginTop: '.35rem' };

export function LegalPage({ copy }: { copy: LegalPageCopy }) {
  return (
    <div>
      <div className="container border-x">
        <PageHeader label={copy.label} title={copy.title} sub={copy.sub} />

        <div style={{ padding: '3rem 0', borderBottom: BORDER }}>
          <h2 style={{ ...labelMono, marginBottom: '1.5rem' }}>{copy.contactLabel}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            <div>
              <div style={labelMono}>{copy.nameLabel}</div>
              <div style={valueText}>{LEGAL_CONTACT.name}</div>
            </div>
            <div>
              <div style={labelMono}>{copy.emailLabel}</div>
              <div style={valueText}>
                {/* Leaf link with the address as its only child: Cloudflare
                    Email Obfuscation rewrites it in the SSR HTML (#125). */}
                <a
                  href={`mailto:${LEGAL_CONTACT.email}`}
                  style={{ color: 'var(--blue-base)', textDecoration: 'none' }}
                  suppressHydrationWarning
                >
                  {LEGAL_CONTACT.email}
                </a>
              </div>
            </div>
          </div>
        </div>

        {copy.sections.map((section) => (
          <section key={section.heading} style={{ padding: '2.5rem 0', borderBottom: BORDER }}>
            <h2 style={{ ...labelMono, marginBottom: '1.25rem' }}>{section.heading}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {section.paragraphs.map((p, i) => (
                <p key={i} style={bodyText}>
                  {p}
                </p>
              ))}
            </div>
          </section>
        ))}

        <p style={{ ...labelMono, fontSize: '.75rem', padding: '2rem 0 3rem' }}>
          {copy.updatedLabel}: {copy.updated}
        </p>
      </div>
    </div>
  );
}
