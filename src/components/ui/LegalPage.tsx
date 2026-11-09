// Impressum / Datenschutz layout (#16): the shared PageHeader, a contact block
// with the owner's name and e-mail, then the text sections. Typography follows
// the about page (mono uppercase labels, --n-60 body text).
import { PageHeader } from '@/components/ui/PageHeader';
import { ContactEmail } from '@/components/ui/ContactEmail';
import { LEGAL_CONTACT, type LegalPageCopy } from '@/data/legal';

const BORDER = '1px solid rgba(162,167,176,.22)';

const labelMono = {
  fontFamily: 'var(--mono)',
  fontSize: 'var(--fs-13)',
  letterSpacing: '.04em',
  textTransform: 'uppercase' as const,
  color: 'var(--n-60)',
  // DM Mono is loaded at 400/500 only; h2 would otherwise get a faux bold.
  fontWeight: 400,
};

const bodyText = {
  fontSize: 'var(--fs-16)',
  color: 'var(--n-60)',
  lineHeight: 1.6,
  letterSpacing: 0,
  maxWidth: '70ch',
};

const valueText = { fontSize: 'var(--fs-16)', color: 'var(--n-100)', marginTop: '.25rem' };

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
                {/* The address is rendered only in the browser (#147). */}
                <ContactEmail style={{ color: 'var(--blue-base)', textDecoration: 'none' }} />
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

        <p style={{ ...labelMono, fontSize: 'var(--fs-12)', padding: '2rem 0 3rem' }}>
          {copy.updatedLabel}: {copy.updated}
        </p>
      </div>
    </div>
  );
}
