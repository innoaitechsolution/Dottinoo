import type { Metadata } from 'next'
import './globals.css'
import './accessibility.css'
import ConditionalHeader from '@/components/ConditionalHeader'

export const metadata: Metadata = {
  title: 'Dottinoo - Education Platform',
  description: 'Education platform for ages 14-24',
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

