'use client'

import { supabase } from './client'

export interface SignUpMetadata {
  role: string
  full_name?: string | null
}

export async function signUp(
  email: string,
  password: string,
  metadata?: SignUpMetadata,
  emailRedirectTo?: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata || {},
      ...(emailRedirectTo && { emailRedirectTo }),
    },
  })

  return { data, error }
}

export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error && typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.warn('[signIn] Auth error:', error.message, error.status, error)
    }

    return { data, error }
  } catch (e: any) {
    // Network / CORS errors surface as thrown exceptions, not returned errors
    const message = e?.message || String(e)
    const isCorsOrNetwork = message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('CORS')

    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.error('[signIn] Exception (likely CORS or network):', e)
    }

    return {
      data: null,
      error: {
        message: isCorsOrNetwork
          ? 'Unable to reach the authentication server. This may be a network or CORS configuration issue. Please contact the administrator.'
          : (message || 'An unexpected error occurred during sign in.'),
        status: 0,
      },
    }
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}

