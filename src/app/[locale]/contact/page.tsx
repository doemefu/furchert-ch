import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { isLocale } from '@/i18n/routing';
import { getPathname } from '@/i18n/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { ContactForm } from './ContactForm';

const HOST = 'https://furchert.ch';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale });
  return {
    title: `${t('contact.title')} — furchert.ch`,
    description: t('contact.sub'),
    alternates: {
      languages: {
        de: HOST + getPathname({ locale: 'de', href: '/contact' }),
        en: HOST + getPathname({ locale: 'en', href: '/contact' }),
      },
    },
  };
}

const CONTACTS: { label: string; value: string; href: string | null }[] = [
  { label: 'Email', value: 'dominic@furchert.ch', href: 'mailto:dominic@furchert.ch' },
  { label: 'GitHub', value: 'github.com/doemefu', href: 'https://github.com/doemefu' },
  {
    label: 'LinkedIn',
    value: 'linkedin.com/in/dominic-furchert',
    href: 'https://linkedin.com/in/dominic-furchert',
  },
  { label: 'Location', value: 'Rapperswil-Jona, CH', href: null },
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
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
                color: 'var(--n-50)',
                marginBottom: '1.5rem',
              }}
            >
              {t('contact.ref')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {CONTACTS.map((c) => (
                <div key={c.label}>
                  <div
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '.72rem',
                      letterSpacing: '.05em',
                      textTransform: 'uppercase',
                      color: 'var(--n-40)',
                      marginBottom: '.25rem',
                    }}
                  >
                    {c.label}
                  </div>
                  {c.href ? (
                    <a
                      href={c.href}
                      target={c.href.startsWith('http') ? '_blank' : undefined}
                      rel={c.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      style={{ fontSize: '.9375rem', color: 'var(--blue-base)', textDecoration: 'none' }}
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
