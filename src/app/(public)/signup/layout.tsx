import type { Metadata } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dottinoo.co.uk'

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create your Dottinoo account to start creating inclusive, differentiated tasks for your students. Sign up with email and password.',
  openGraph: {
    title: 'Sign Up - Dottinoo',
    description: 'Create your Dottinoo account to start creating inclusive, differentiated tasks for your students.',
    url: `${siteUrl}/signup`,
    images: ['/og/og-image.png'],
  },
  twitter: {
    card: 'summary',
    title: 'Sign Up - Dottinoo',
    description: 'Create your Dottinoo account to start creating inclusive, differentiated tasks for your students.',
  },
  robots: {
    index: false,
    follow: true,
  },
}

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
