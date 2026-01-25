import type { Metadata } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dottinoo.co.uk'

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn about Dottinoo, an inclusive learning platform designed for UK classrooms. Founded by Arzu Caner, Dottinoo helps teachers produce inclusive, differentiated tasks faster and supports learners with diverse needs.',
  openGraph: {
    title: 'About Dottinoo - Inclusive Learning Platform',
    description: 'Learn about Dottinoo, an inclusive learning platform designed for UK classrooms. Founded by Arzu Caner of InnoAI Tech Solutions.',
    url: `${siteUrl}/about`,
    images: ['/og/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Dottinoo - Inclusive Learning Platform',
    description: 'Learn about Dottinoo, an inclusive learning platform designed for UK classrooms. Founded by Arzu Caner of InnoAI Tech Solutions.',
  },
}

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
