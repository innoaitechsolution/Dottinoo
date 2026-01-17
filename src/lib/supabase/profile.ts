'use client'

import { supabase } from './client'

export type ProfileRole = 'student' | 'teacher' | 'admin' | 'external'

export interface UIPreferences {
  colorTheme?: 'default' | 'high-contrast' | 'pastel' | 'dyslexia-friendly'
  fontSize?: 'small' | 'medium' | 'large'
  lineSpacing?: 'normal' | 'relaxed' | 'loose'
  letterCase?: 'normal' | 'lowercase' | 'uppercase'
  simplifiedLayout?: boolean
}

export interface Profile {
  id: string
  role: ProfileRole
  full_name: string | null
  created_at: string
  ui_preferences?: UIPreferences | null
}

export interface CreateProfileParams {
  id: string
  role: ProfileRole
  full_name?: string | null
}

/**
 * Create a new profile for a user
 */
export async function createProfile({ id, role, full_name }: CreateProfileParams) {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id,
      role,
      full_name: full_name || null,
    })
    .select()
    .single()

  return { data, error }
}

/**
 * Get the current user's profile
 */
export async function getMyProfile(): Promise<{ data: Profile | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: { message: 'No authenticated user' } }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return { data, error }
}

