import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { isLocale } from '@/i18n/routing';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { PageHeader } from '@/components/ui/PageHeader';
import { ContactEmail } from '@/components/ui/ContactEmail';
import { ContactForm } from './ContactForm';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale });
  return buildPageMetadata({
    locale,
    href: '/contact',
    title: t('contact.metaTitle'),
    description: t('contact.metaDescription'),
  });
}

// GitHub and LinkedIn are names; the e-mail and location labels are copy.
// The e-mail entry renders through <ContactEmail>: the address exists only
// in the browser (#147).
type ContactEntry =
  | { label: string; email: true }
  | { label: string; value: string; href: string | null };

const CONTACTS: ContactEntry[] = [
  { label: 'GitHub', value: 'github.com/doemefu', href: 'https://github.com/doemefu' },
  {
    label: 'LinkedIn',
    value: 'linkedin.com/in/dominic-furchert',
    href: 'https://linkedin.com/in/dominic-furchert',
  },
];

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();
  // The location is the same message the footer shows.
  const contacts: ContactEntry[] = [
    { label: t('contact.labelEmail'), email: true },
    ...CONTACTS,
    { label: t('contact.labelLocation'), value: t('footer.location'), href: null },
  ];
  const linkStyle = { fontSize: '.9375rem', color: 'var(--blue-base)', textDecoration: 'none' };

  return (
    <div>
      <div className="container border-x">
        <PageHeader
          label={t('contact.label')}
          title={t('contact.title')}
          sub={t('contact.sub')}
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: '0',
            borderTop: '1px solid rgba(162,167,176,.22)',
          }}
        >
          <div
            style={{
              padding: '3rem 2rem 3rem 0',
              borderRight: '1px solid rgba(162,167,176,.22)',
            }}
          >
            <ContactForm />
          </div>
          <div style={{ padding: '3rem 0 3rem 3rem' }}>
            <p
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '.8125rem',
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                color: 'var(--n-60)',
                marginBottom: '1.5rem',
              }}
            >
              {t('contact.ref')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {contacts.map((c) => (
                <div key={c.label}>
                  <div
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '.72rem',
                      letterSpacing: '.05em',
                      textTransform: 'uppercase',
                      color: 'var(--n-60)',
                      marginBottom: '.25rem',
                    }}
                  >
                    {c.label}
                  </div>
                  {'email' in c ? (
                    <ContactEmail style={linkStyle} />
                  ) : c.href ? (
                    <a
                      href={c.href}
                      target={c.href.startsWith('http') ? '_blank' : undefined}
                      rel={c.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      style={linkStyle}
                    >
                      {c.value}
                    </a>
                  ) : (
                    <span style={{ fontSize: '.9375rem', color: 'var(--n-70)' }}>{c.value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
