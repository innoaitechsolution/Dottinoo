'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'

/**
 * Auth callback page: handles email confirmation and OAuth redirects.
 * Exchanges the auth code for a session and redirects to /app (or safe default).
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const didRun = useRef(false)

  useEffect(() => {
    if (didRun.current) return
    didRun.current = true

    if (!isSupabaseConfigured()) {
      router.replace('/login')
      return
    }

    const code = searchParams.get('code')
    const requestedNext = searchParams.get('next') ?? '/app'
    // Only allow relative paths to prevent open redirect
    const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/app'

    if (code) {
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error }) => {
          if (error) {
            setStatus('error')
            return
          }
          router.replace(next)
          router.refresh()
        })
        .catch(() => setStatus('error'))
      return
    }

    // No code: might be hash-based or already confirmed; try existing session then redirect
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace(next)
        router.refresh()
      } else {
        router.replace('/login')
      }
    })
  }, [router, searchParams])

  if (status === 'error') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Something went wrong confirming your email. Please try signing in again.</p>
        <a href="/login">Back to Sign In</a>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p>Confirming your email…</p>
    </div>
  )
}
