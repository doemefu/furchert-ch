import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/i18n/routing';
import { getPathname } from '@/i18n/navigation';
import { LegalPage } from '@/components/ui/LegalPage';
import { LEGAL_PAGES } from '@/data/legal';

const HOST = 'https://furchert.ch';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const copy = LEGAL_PAGES.privacy[locale];
  return {
    title: `${copy.title} — furchert.ch`,
    description: copy.sub,
    alternates: {
      languages: {
        de: HOST + getPathname({ locale: 'de', href: '/privacy' }),
        en: HOST + getPathname({ locale: 'en', href: '/privacy' }),
        'x-default': HOST + getPathname({ locale: 'de', href: '/privacy' }),
      },
    },
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  return <LegalPage copy={LEGAL_PAGES.privacy[locale]} />;
}
