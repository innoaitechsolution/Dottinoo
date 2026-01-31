'use client'

import { supabase } from './client'

export interface Class {
  id: string
  teacher_id: string
  name: string
  invite_code: string
  created_at: string
}

export interface ClassMembership {
  id: string
  class_id: string
  student_id: string
  created_at: string
}

export interface ClassWithDetails extends Class {
  class_memberships?: ClassMembership[]
}

/**
 * Generate a random 8-character hex invite code
 */
function generateInviteCode(): string {
  const chars = '0123456789abcdef'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Create a new class (teacher only)
 */
export async function createClass(name: string): Promise<{ data: Class | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } }
  }

  // Generate unique invite code
  let inviteCode = generateInviteCode()
  let attempts = 0
  const maxAttempts = 10

  // Ensure uniqueness (retry if collision)
  while (attempts < maxAttempts) {
    const { data: existing } = await supabase
      .from('classes')
      .select('id')
      .eq('invite_code', inviteCode)
      .single()

    if (!existing) {
      break // Code is unique
    }
    inviteCode = generateInviteCode()
    attempts++
  }

  const { data, error } = await supabase
    .from('classes')
    .insert({
      teacher_id: user.id,
      name,
      invite_code: inviteCode,
    })
    .select()
    .single()

  return { data, error }
}

/**
 * List classes for the current user
 * - Teachers: classes they created
 * - Students: classes they joined
 */
export async function listMyClasses(): Promise<{ data: Class[] | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } }
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return { data: null, error: { message: 'Profile not found' } }
  }

  if (profile.role === 'teacher') {
    // Teachers see classes they created
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    return { data, error }
  } else {
    // Students see classes they joined
    const { data: memberships, error: membershipError } = await supabase
      .from('class_memberships')
      .select('class_id')
      .eq('student_id', user.id)

    if (membershipError || !memberships || memberships.length === 0) {
      return { data: [], error: null }
    }

    const classIds = memberships.map(m => m.class_id)
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .in('id', classIds)
      .order('created_at', { ascending: false })

    return { data, error }
  }
}

/**
 * Join a class by invite code (student only)
 * Returns the class ID of the joined class
 */
export async function joinClassByCode(inviteCode: string): Promise<{ data: string | null; error: any }> {
  const { data, error } = await supabase.rpc('join_class_by_code', {
    p_invite_code: inviteCode,
  })

  if (error) {
    return { data: null, error }
  }

  // Function returns array with { class_id, class_name }
  if (data && Array.isArray(data) && data.length > 0) {
    return { data: data[0].class_id, error: null }
  }

  return { data: null, error: { message: 'Unexpected response from join_class_by_code' } }
}

export interface ClassStudent {
  id: string
  full_name: string | null
  role: string
  support_needs_tags?: string[] | null
}

/**
 * Get list of students in a class (teacher only)
 */
export async function getClassStudents(classId: string): Promise<{ data: ClassStudent[] | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } }
  }

  // Verify teacher owns the class
  const { data: classData } = await supabase
    .from('classes')
    .select('teacher_id')
    .eq('id', classId)
    .single()

  if (!classData || classData.teacher_id !== user.id) {
    return { data: null, error: { message: 'Class not found or access denied' } }
  }

  // Get students via class_memberships (select only columns that exist in base profiles schema)
  try {
    const { data, error } = await supabase
      .from('class_memberships')
      .select(`
        student_id,
        profiles!inner (
          id,
          full_name,
          role
        )
      `)
      .eq('class_id', classId)

    if (error) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.warn('[getClassStudents] Query failed, using empty list:', error.code, error.message)
      }
      return { data: [], error: null }
    }

    // Transform to ClassStudent format (support_needs_tags not on profiles in all envs; use null)
    const students: ClassStudent[] = (data || [])
      .map((item: any) => ({
        id: item.profiles?.id,
        full_name: item.profiles?.full_name,
        role: item.profiles?.role,
        support_needs_tags: item.profiles?.support_needs_tags ?? null,
      }))
      .filter((s: ClassStudent) => s.id && (s.role === 'student' || s.role === 'external'))

    return { data: students, error: null }
  } catch (e) {
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.warn('[getClassStudents] Error, using empty list:', e)
    }
    return { data: [], error: null }
  }
}
