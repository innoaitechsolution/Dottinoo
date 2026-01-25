import type { Metadata } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dottinoo.co.uk'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your Dottinoo account to continue your learning journey. Access your classes, tasks, and student progress.',
  openGraph: {
    title: 'Sign In - Dottinoo',
    description: 'Sign in to your Dottinoo account to continue your learning journey.',
    url: `${siteUrl}/login`,
    images: ['/og/og-image.png'],
  },
  twitter: {
    card: 'summary',
    title: 'Sign In - Dottinoo',
    description: 'Sign in to your Dottinoo account to continue your learning journey.',
  },
  robots: {
    index: false,
    follow: true,
  },
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
