import { setRequestLocale, getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/ui/PageHeader';

// Phase 1 placeholder — verifies the shell, design tokens, fonts and i18n.
// The full prototype Home (hero, teasers, stats, CTA) lands in Phase 2.
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <div className="container border-x">
      <PageHeader label={t('hero.label')} title="furchert.ch" sub={t('hero.sub')} />
      <div style={{ padding: '3rem 0' }}>
        <p
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '.8125rem',
            letterSpacing: '.06em',
            textTransform: 'uppercase',
            color: 'var(--n-50)',
          }}
        >
          Phase 1 — design system shell. Pages land in Phase 2.
        </p>
      </div>
    </div>
  );
}
