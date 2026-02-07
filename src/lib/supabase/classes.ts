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
  /** Display label for the student (resolved from full_name, role, or id fallback) */
  label: string
  role: string
  support_needs_tags?: string[] | null
}

const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development'

/**
 * Build a display label for a student.
 * Priority: full_name → "Student <short-id>" fallback.
 */
function studentLabel(id: string, fullName: string | null): string {
  if (fullName && fullName.trim()) return fullName.trim()
  return `Student ${id.slice(0, 8)}…`
}

/**
 * Get list of students in a class (teacher only).
 *
 * Uses flat queries (no embedded joins) to avoid PostgREST/RLS issues:
 *   1. class_memberships → student_id list
 *   2. profiles → id, full_name, role
 *
 * Requires migration 019 (profiles SELECT policy for teachers).
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

  try {
    // Step 1: Get membership rows (flat — no join)
    const { data: memberships, error: membershipError } = await supabase
      .from('class_memberships')
      .select('student_id')
      .eq('class_id', classId)

    if (membershipError) {
      if (isDev) console.warn('[getClassStudents] class_memberships query failed:', membershipError.message, membershipError.code)
      return { data: [], error: membershipError }
    }

    const studentIds = (memberships || []).map(m => m.student_id)

    if (isDev) console.log(`[getClassStudents] class_id=${classId}: ${studentIds.length} membership rows`)

    if (studentIds.length === 0) {
      return { data: [], error: null }
    }

    // Step 2: Get profiles for those students
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .in('id', studentIds)

    if (profilesError) {
      if (isDev) console.warn('[getClassStudents] profiles query failed:', profilesError.message, profilesError.code)
      // Fall back: return students with id-only labels so the picker still works
      const fallback: ClassStudent[] = studentIds.map(sid => ({
        id: sid,
        full_name: null,
        label: studentLabel(sid, null),
        role: 'student',
      }))
      return { data: fallback, error: profilesError }
    }

    // Build a map of profile data
    const profileMap = new Map<string, { full_name: string | null; role: string }>()
    for (const p of profilesData || []) {
      profileMap.set(p.id, { full_name: p.full_name, role: p.role })
    }

    // Build student list — include ALL membership IDs, even those without a profile row
    const students: ClassStudent[] = studentIds
      .map(sid => {
        const p = profileMap.get(sid)
        return {
          id: sid,
          full_name: p?.full_name ?? null,
          label: studentLabel(sid, p?.full_name ?? null),
          role: p?.role ?? 'student',
        }
      })
      .filter(s => s.role === 'student' || s.role === 'external')

    if (isDev) {
      const resolved = students.filter(s => s.full_name).length
      console.log(`[getClassStudents] Resolved ${resolved}/${students.length} names. First 3:`, students.slice(0, 3).map(s => s.label))
    }

    return { data: students, error: null }
  } catch (e) {
    if (isDev) console.warn('[getClassStudents] Unexpected error:', e)
    const err = e && typeof e === 'object' && 'message' in e ? e : { message: String(e) }
    return { data: [], error: err }
  }
}
