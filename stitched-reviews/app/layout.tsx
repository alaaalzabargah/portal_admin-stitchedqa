import type { Metadata, Viewport } from 'next'
import { Noto_Sans_Arabic } from 'next/font/google'
import { GeistSans } from 'geist/font/sans'
import './globals.css'

const notoSansArabic = Noto_Sans_Arabic({ subsets: ['arabic'], variable: '--font-noto-arabic' })

export const metadata: Metadata = {
    title: 'Stitched — Share Your Story',
    description: 'Tell us about your Stitched experience.',
    icons: {
        icon: '/images/favicon-icon.png',
        apple: '/images/favicon-icon.png',
    },
}

export const viewport: Viewport = {
    themeColor: '#000000',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className={`${GeistSans.variable} ${notoSansArabic.variable} antialiased`}>
            <body style={{ margin: 0, padding: 0, background: '#000000' }}>
                {children}
            </body>
        </html>
    )
}
