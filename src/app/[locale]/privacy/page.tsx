import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/i18n/routing';
import { buildPageMetadata, ownerTitle } from '@/lib/seo/metadata';
import { LegalPage } from '@/components/ui/LegalPage';
import { LEGAL_PAGES } from '@/data/legal';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const copy = LEGAL_PAGES.privacy[locale];
  return buildPageMetadata({
    locale,
    href: '/privacy',
    title: ownerTitle(copy.title),
    description: copy.sub,
  });
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
