'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Landing from '@/components/Landing'

export default function HomePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setIsAuthenticated(true)
          router.push('/app')
        } else {
          setIsAuthenticated(false)
        }
      } catch (error) {
        console.error('Error checking session:', error)
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAuthenticated(true)
        router.push('/app')
      } else {
        setIsAuthenticated(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  // Show loading state briefly to avoid flash
  if (isLoading) {
    return null
  }

  // If authenticated, redirect happens in useEffect, but show nothing while redirecting
  if (isAuthenticated) {
    return null
  }

  // Show landing page for unauthenticated users
  return <Landing />
}

