/**
 * Server-side authentication helpers for API routes
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { ProfileRole } from './profile'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export interface AuthResult {
  userId: string | null
  role: ProfileRole | null
  email: string | null
}

/**
 * Get authenticated user and profile from server-side API route
 * Uses cookies from request (Supabase stores session in cookies) or Authorization header
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
      // Fallback to cookies
      let cookieStore: any = null
      try {
        cookieStore = await cookies()
      } catch {
        // If cookies() fails, try to get from request headers
        if (request) {
          const cookieHeader = request.headers.get('cookie') || ''
          const cookieMap = Object.fromEntries(
            cookieHeader.split('; ').map(c => {
              const [key, ...values] = c.split('=')
              return [key, decodeURIComponent(values.join('='))]
            })
          )
          cookieStore = {
            get: (name: string) => ({ value: cookieMap[name] || null }),
          }
        }
      }

      if (!cookieStore) {
        return { userId: null, role: null, email: null }
      }

      // Create Supabase client with cookie access
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set() {
            // No-op for server-side
          },
          remove() {
            // No-op for server-side
          },
        },
      })

      const {
        data: { user: userData },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !userData) {
        return { userId: null, role: null, email: null }
      }

      user = userData
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
