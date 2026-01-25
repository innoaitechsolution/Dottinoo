import type { Metadata } from 'next'
import './globals.css'
import './accessibility.css'
import ConditionalHeader from '@/components/ConditionalHeader'

// Get site URL from environment or use placeholder
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dottinoo.co.uk'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Dottinoo - Inclusive Learning Platform for UK Classrooms',
    template: '%s | Dottinoo',
  },
  description: 'Dottinoo is an inclusive learning platform designed for UK classrooms, supporting students aged 14–24. Empower teachers with tools for personalized, accessible education and help students develop essential digital skills.',
  keywords: ['education', 'learning platform', 'UK classrooms', 'inclusive education', 'digital skills', 'differentiated learning', 'SEND support', 'teaching tools'],
  authors: [{ name: 'Dottinoo Team' }],
  creator: 'InnoAI Tech Solutions',
  publisher: 'InnoAI Tech Solutions',
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: siteUrl,
    siteName: 'Dottinoo',
    title: 'Dottinoo - Inclusive Learning Platform for UK Classrooms',
    description: 'Empower teachers with tools for personalized, accessible education. Support students aged 14–24 in developing essential digital skills.',
    images: [
      {
        url: '/og/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Dottinoo - Inclusive Learning Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dottinoo - Inclusive Learning Platform for UK Classrooms',
    description: 'Empower teachers with tools for personalized, accessible education. Support students aged 14–24 in developing essential digital skills.',
    images: ['/og/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/brand/dottinoo-logo.png',
    apple: '/brand/dottinoo-logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ConditionalHeader />
        <main>{children}</main>
      </body>
    </html>
  )
}

