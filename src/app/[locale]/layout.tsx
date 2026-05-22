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
