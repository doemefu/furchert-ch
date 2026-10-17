import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { dmSans, dmMono } from '@/lib/fonts';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Providers } from '@/components/Providers';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'furchert.ch — Dominic Furchert',
  description:
    'Software Engineer · Zürich. IoT-Plattformen, Homelab-Infrastruktur, AI-Automation.',
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
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
