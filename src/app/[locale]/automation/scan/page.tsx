// MOCKUP route — visual preview only. No API, no persistence, no
// outbound fetch (CLAUDE.md "Automation = mockup"). The banner below
// stays on every step so the demo nature is unmistakable; `robots:
// noindex` (worklog F5) prevents the page from showing up in search
// snippets where the banner wouldn't be visible. Sitemap excludes it.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { isLocale } from '@/i18n/routing';
import { getPathname } from '@/i18n/navigation';
import { WizardShell } from './WizardShell';

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
    title: `${t('pages.scan.step1HeaderLabel')} — furchert.ch`,
    description: t('pages.scan.bannerBody'),
    robots: { index: false, follow: true },
    alternates: {
      languages: {
        de: HOST + getPathname({ locale: 'de', href: '/automation/scan' }),
        en: HOST + getPathname({ locale: 'en', href: '/automation/scan' }),
      },
    },
  };
}

export default async function ScanPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('pages.scan');

  return (
    <div>
      {/* Persistent demo banner — n-10 bg + blue-base advisory accent
          (worklog F-Q4: do NOT use --blue-wash here; that token signals
          "the good option" on the /automation comparison table). */}
      <div
        role="status"
        style={{
          background: 'var(--n-10)',
          borderTop: '2px solid var(--blue-base)',
          borderBottom: '1px solid rgba(162,167,176,.22)',
        }}
      >
        <div className="container border-x" style={{ padding: '1.25rem 1.5rem' }}>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '.7rem',
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              color: 'var(--blue-base)',
              marginBottom: '.35rem',
            }}
          >
            {t('bannerTitle')}
          </div>
          <p style={{ fontSize: '.875rem', color: 'var(--n-70)', lineHeight: 1.55, maxWidth: '64ch' }}>
            {t('bannerBody')}
          </p>
        </div>
      </div>

      <WizardShell locale={locale} />
    </div>
  );
}
