/**
 * Server-side authentication helpers for API routes
 * 
 * NOTE: This file is server-only and should never be imported in client components.
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { ProfileRole } from './profile'

// Local helper to require env vars (throws if missing)
const must = (name: string): string => {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var: ${name}`)
  return v
}

// Require these at module load time (server-side only)
const supabaseUrl = must('NEXT_PUBLIC_SUPABASE_URL')
const supabaseAnonKey = must('NEXT_PUBLIC_SUPABASE_ANON_KEY')

export interface AuthResult {
  userId: string | null
  role: ProfileRole | null
  email: string | null
}

/**
 * Get authenticated user and profile from server-side API route
 * Uses Authorization header token for authentication (cookie fallback disabled)
 */
export async function getServerAuth(request?: NextRequest): Promise<AuthResult> {
  try {
    // Try Authorization header first (if provided)
    const authHeader = request?.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || null

    let user: any = null

    if (token) {
      // Use token directly
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      const { data: { user: userData }, error: userError } = await supabase.auth.getUser(token)
      if (!userError && userData) {
        user = userData
      }
    } else {
      // Cookie fallback disabled because @supabase/supabase-js createClient doesn't support cookie access
      // Only token-based auth via Authorization header is supported
      return { userId: null, role: null, email: null }
    }

    if (!user) {
      return { userId: null, role: null, email: null }
    }

    // Get profile to check role
    // Use service role if available (bypasses RLS), otherwise use anon key (RLS should allow own profile read)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const profileClient = serviceKey
      ? createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : createClient(supabaseUrl, supabaseAnonKey)

    const { data: profile, error: profileError } = await profileClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return { userId: user.id, role: null, email: user.email || null }
    }

    return {
      userId: user.id,
      role: profile.role as ProfileRole,
      email: user.email || null,
    }
  } catch (error) {
    console.error('Server auth error:', error)
    return { userId: null, role: null, email: null }
  }
}

/**
 * Check if user has required role
 */
export function hasRole(auth: AuthResult, allowedRoles: ProfileRole[]): boolean {
  if (!auth.role) return false
  return allowedRoles.includes(auth.role)
}
