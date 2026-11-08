import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { dmSans, dmMono } from '@/lib/fonts';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Providers } from '@/components/Providers';
import { LazyAnalytics } from '@/components/analytics/lazy';
import { ANALYTICS_UI_ENABLED } from '@/lib/analytics/flags';
import { ownerTitle } from '@/lib/seo/metadata';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: ownerTitle('furchert.ch'),
  description:
    'Dominic Furchert, Software Engineer: KI für KMU im Zürcher Oberland, IoT-Plattform, Homelab.',
};

// Unknown locales are a plain 404, never rendered on demand. Paths with a
// dot skip the intl proxy's redirect (see `proxy.ts` matcher), and each one
// would otherwise write to Next's size-limited on-disk route cache (#78).
export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as never)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${dmSans.variable} ${dmMono.variable}`}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <Header />
            <main className="page-enter" style={{ paddingTop: 'var(--header-h)' }}>
              {children}
            </main>
            <Footer />
            {/* Dark until the WA-6 go-live (#158); see src/lib/analytics/flags.ts. */}
            {ANALYTICS_UI_ENABLED && <LazyAnalytics />}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
