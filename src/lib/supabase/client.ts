import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null
let isInitialized = false
let envVarsMissing = false

/**
 * Check if Supabase environment variables are configured
 */
export function isSupabaseConfigured(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!(supabaseUrl && supabaseAnonKey)
}

/**
 * Get or create the Supabase client instance.
 * Uses lazy initialization to avoid build-time errors when env vars are missing.
 * Returns a safe mock client if env vars are missing (does NOT throw).
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
    envVarsMissing = true
    // Return a safe mock client that returns errors instead of throwing
    // This allows the app to render and show a friendly error message
    const mockClient = {
      auth: {
        getSession: async () => ({ data: { session: null }, error: { message: 'Supabase not configured' } }),
        signInWithPassword: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
        signUp: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
        signOut: async () => ({ error: { message: 'Supabase not configured' } }),
        signInWithOAuth: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => ({
        select: () => ({ data: null, error: { message: 'Supabase not configured' } }),
        insert: () => ({ data: null, error: { message: 'Supabase not configured' } }),
        update: () => ({ data: null, error: { message: 'Supabase not configured' } }),
        delete: () => ({ data: null, error: { message: 'Supabase not configured' } }),
      }),
      rpc: () => ({ data: null, error: { message: 'Supabase not configured' } }),
      storage: {
        from: () => ({
          upload: () => ({ data: null, error: { message: 'Supabase not configured' } }),
          createSignedUrl: () => ({ data: null, error: { message: 'Supabase not configured' } }),
        }),
      },
    } as any as SupabaseClient
    
    supabaseInstance = mockClient
    isInitialized = true
    return supabaseInstance
  }

  // Create and cache the real client
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
    isInitialized = true
    envVarsMissing = false
    return supabaseInstance
  } catch (e) {
    // Fallback if client creation fails (shouldn't happen with valid env vars)
    console.error('Failed to create Supabase client:', e)
    envVarsMissing = true
    // Return mock client as fallback
    return getSupabaseClient() // This will return the mock since env vars check will fail
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

// Export a flag to check if env vars are missing
export function areEnvVarsMissing(): boolean {
  if (!isInitialized) {
    getSupabaseClient()
  }
  return envVarsMissing
}
