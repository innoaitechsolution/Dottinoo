'use client'

import { usePathname } from 'next/navigation'
import Header from './Header'

export default function ConditionalHeader() {
  const pathname = usePathname()
  
  // Hide header on landing page (/) and app routes (/app/*)
  // Show on auth pages (/login, /signup, /onboarding, etc.)
  if (pathname === '/' || pathname?.startsWith('/app')) {
    return null
  }
  
  return <Header />
}
