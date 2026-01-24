import type { Metadata } from 'next';
import { Noto_Sans_Arabic } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { cn } from '@/lib/utils';

const notoSansArabic = Noto_Sans_Arabic({ subsets: ['arabic'], variable: '--font-noto-arabic' });

export const metadata: Metadata = {
  title: 'Stitched Admin Portal',
  description: 'Premium Administration Portal',
  icons: {
    icon: '/images/favicon-icon.png', // Using the uploaded logo as favicon
    apple: '/images/favicon-icon.png',
  },
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
  const locale = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as 'ar' | 'en'
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning className={cn(
      GeistSans.variable,
      GeistMono.variable,
      notoSansArabic.variable,
      'antialiased'
    )}>
      <head>
        {/* Blocking script to apply cached theme before React hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('user-theme') || 'purple';
                  var themes = {
                    'purple': { primary: '#41295A', primaryLight: '#392250', primaryDark: '#2F0743', gradientFrom: '#41295A', gradientVia: '#392250', gradientTo: '#2F0743', textPrimary: '#FFFFFF', textSecondary: '#E0E0E0', accent: '#9B59B6', buttonText: '#FFFFFF', buttonOutline: '#FFFFFF', isDark: true },
                    'mint': { primary: '#51DDBC', primaryLight: '#39BDA7', primaryDark: '#1F968B', gradientFrom: '#51DDBC', gradientVia: '#39BDA7', gradientTo: '#1F968B', textPrimary: '#222222', textSecondary: '#4A4A4A', accent: '#1F968B', buttonText: '#222222', buttonOutline: '#1F968B', isDark: false },
                    'gold': { primary: '#BF953F', primaryLight: '#D7B45F', primaryDark: '#825F14', gradientFrom: '#BF953F', gradientVia: '#D7B45F', gradientTo: '#825F14', textPrimary: '#222222', textSecondary: '#4A4A4A', accent: '#825F14', buttonText: '#222222', buttonOutline: '#825F14', isDark: false },
                    'maroon': { primary: '#6E0F1E', primaryLight: '#8A1538', primaryDark: '#A52846', gradientFrom: '#6E0F1E', gradientVia: '#8A1538', gradientTo: '#A52846', textPrimary: '#FFFFFF', textSecondary: '#E0E0E0', accent: '#E74C3C', buttonText: '#FFFFFF', buttonOutline: '#FFFFFF', isDark: true }
                  };
                  var config = themes[theme] || themes['purple'];
                  var root = document.documentElement;
                  root.style.setProperty('--theme-primary', config.primary);
                  root.style.setProperty('--theme-primary-light', config.primaryLight);
                  root.style.setProperty('--theme-primary-dark', config.primaryDark);
                  root.style.setProperty('--theme-gradient-from', config.gradientFrom);
                  root.style.setProperty('--theme-gradient-via', config.gradientVia);
                  root.style.setProperty('--theme-gradient-to', config.gradientTo);
                  root.style.setProperty('--theme-text-primary', config.textPrimary);
                  root.style.setProperty('--theme-text-secondary', config.textSecondary);
                  root.style.setProperty('--theme-accent', config.accent);
                  root.style.setProperty('--theme-button-text', config.buttonText);
                  root.style.setProperty('--theme-button-outline', config.buttonOutline);
                  root.style.setProperty('--theme-is-dark', config.isDark ? '1' : '0');
                  root.setAttribute('data-theme', theme);
                } catch(e) {}
              })();
            `
          }}
        />
      </head>
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
