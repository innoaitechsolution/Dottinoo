'use client'

import AppNavbar from '@/components/navigation/AppNavbar'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <AppNavbar />
      <main>{children}</main>
    </>
  )
}
