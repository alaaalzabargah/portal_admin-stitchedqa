import type { Metadata } from 'next';
import { Noto_Sans_Arabic } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { cn } from '@/lib/utils';

const notoSansArabic = Noto_Sans_Arabic({ subsets: ['arabic'], variable: '--font-noto-arabic' });

export const metadata: Metadata = {
  title: 'Admin Portal',
  description: 'Premium Administration Portal',
};

import { LanguageProvider } from '@/lib/i18n/context'
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeSystemProvider } from '@/lib/themes/context'
import { DialogProvider } from '@/lib/dialog'

import { cookies } from 'next/headers'

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies()
  const locale = (cookieStore.get('NEXT_LOCALE')?.value || 'ar') as 'ar' | 'en'
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning className={cn(
      GeistSans.variable,
      GeistMono.variable,
      notoSansArabic.variable,
      'antialiased'
    )}>
      <body className="min-h-screen bg-background font-sans text-foreground">
        <LanguageProvider initialLocale={locale}>
          <DialogProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <ThemeSystemProvider>
                {children}
              </ThemeSystemProvider>
            </ThemeProvider>
          </DialogProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
