import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null
let isInitialized = false

/**
 * Get or create the Supabase client instance.
 * Uses lazy initialization to avoid build-time errors when env vars are missing.
 * 
 * @throws Error if environment variables are missing at runtime (client-side)
 */
function getSupabaseClient(): SupabaseClient {
  // Return cached instance if available
  if (supabaseInstance) {
    return supabaseInstance
  }

  // Check environment variables at call-time (not module load time)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // Only throw at runtime (client-side), not during build/prerender
    if (typeof window !== 'undefined') {
      throw new Error(
        'Missing Supabase environment variables. Please check your environment configuration.'
      )
    }
    // During build/prerender (server-side), create a minimal mock client
    // This allows static pages to be generated without env vars
    // The mock will fail gracefully if actually used during build
    // Use a valid-looking URL format to avoid validation errors
    try {
      supabaseInstance = createClient('https://placeholder.supabase.co', 'placeholder-key', {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
      isInitialized = true
      return supabaseInstance
    } catch (e) {
      // If even creating a placeholder fails, return a minimal object
      // This should never happen, but provides a fallback
      return {} as SupabaseClient
    }
  }

  // Create and cache the real client
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
    isInitialized = true
    return supabaseInstance
  } catch (e) {
    // Fallback if client creation fails (shouldn't happen with valid env vars)
    console.error('Failed to create Supabase client:', e)
    throw new Error('Failed to initialize Supabase client')
  }
}

// Create a proxy that lazily initializes the client on first access
// This defers env var checking until the client is actually used
// This prevents build-time errors when env vars are missing
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    // Only initialize when actually accessed (not during module evaluation)
    if (!isInitialized) {
      getSupabaseClient()
    }
    
    // If we still don't have an instance, return undefined for the property
    if (!supabaseInstance) {
      return undefined
    }
    
    const value = (supabaseInstance as any)[prop]
    // If it's a function, bind it to the client to preserve 'this' context
    if (typeof value === 'function') {
      return value.bind(supabaseInstance)
    }
    return value
  },
}) as SupabaseClient

