// Impressum / Datenschutz layout (#16): the shared PageHeader, a contact block
// with the owner's name and e-mail, then the text sections. Typography follows
// the about page (sentence-case labels, --n-60 body text).
import { PageHeader } from '@/components/ui/PageHeader';
import { ContactEmail } from '@/components/ui/ContactEmail';
import { LEGAL_CONTACT, type LegalPageCopy } from '@/data/legal';

// Sentence case, no mono (redesign PR 8); `h2` labels carry the 2px ink rule.
const labelMono = {
  fontSize: 'var(--text-14)',
  color: 'var(--text-3)',
  fontWeight: 400,
};
const headLabel = {
  ...labelMono,
  borderTop: '2px solid var(--rule)',
  paddingTop: 'var(--space-3)',
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

        <div style={{ paddingTop: 'var(--section-y)' }}>
          <h2 style={{ ...headLabel, marginBottom: '1.5rem' }}>{copy.contactLabel}</h2>
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
          <section key={section.heading} style={{ paddingTop: 'var(--section-y)' }}>
            <h2 style={{ ...headLabel, marginBottom: '1.25rem' }}>{section.heading}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {section.paragraphs.map((p, i) => (
                <p key={i} style={bodyText}>
                  {p}
                </p>
              ))}
            </div>
          </section>
        ))}

        <p style={{ ...labelMono, padding: '2rem 0 3rem' }}>
          {copy.updatedLabel}: {copy.updated}
        </p>
      </div>
    </div>
  );
}
