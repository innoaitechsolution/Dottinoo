'use client'

import { supabase } from './client'

export interface StudentSupportNeeds {
  id: string
  student_id: string
  created_by: string
  dyslexia: boolean
  adhd: boolean
  autism: boolean
  other_needs: string | null
  updated_at: string
}

export interface StudentUiPrefs {
  student_id: string
  font_scale: 'sm' | 'md' | 'lg' | 'xl'
  spacing: 'sm' | 'md' | 'lg'
  reduce_clutter: boolean
  simplified_language: boolean
  high_contrast: boolean
  updated_at: string
}

export interface StudentWithNeeds {
  id: string
  full_name: string | null
  support_needs: StudentSupportNeeds | null
  ui_prefs: StudentUiPrefs | null
}

export interface UpsertSupportNeedsPayload {
  dyslexia?: boolean
  adhd?: boolean
  autism?: boolean
  other_needs?: string | null
}

export interface UpsertUiPrefsPayload {
  font_scale?: 'sm' | 'md' | 'lg' | 'xl'
  spacing?: 'sm' | 'md' | 'lg'
  reduce_clutter?: boolean
  simplified_language?: boolean
  high_contrast?: boolean
}

/**
 * Upsert student support needs (teacher/admin only)
 */
export async function upsertStudentSupportNeeds(
  studentId: string,
  payload: UpsertSupportNeedsPayload
): Promise<{ data: StudentSupportNeeds | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } }
  }

  // Verify user is teacher or admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
    return { data: null, error: { message: 'Access denied: teacher or admin only' } }
  }

  // For teachers, verify student is in their class
  if (profile.role === 'teacher') {
    const { data: membership } = await supabase
      .from('class_memberships')
      .select('class_id, classes!inner(teacher_id)')
      .eq('student_id', studentId)
      .limit(1)
      .single()

    if (!membership || (membership.classes as any).teacher_id !== user.id) {
      return { data: null, error: { message: 'Student not found in your classes' } }
    }
  }

  // Upsert support needs
  const { data, error } = await supabase
    .from('student_support_needs')
    .upsert({
      student_id: studentId,
      created_by: user.id,
      dyslexia: payload.dyslexia ?? false,
      adhd: payload.adhd ?? false,
      autism: payload.autism ?? false,
      other_needs: payload.other_needs ?? null,
    }, {
      onConflict: 'student_id',
    })
    .select()
    .single()

  return { data, error }
}

/**
 * Upsert student UI preferences (teacher/admin can set, student can read)
 */
export async function upsertStudentUiPrefs(
  studentId: string,
  payload: UpsertUiPrefsPayload
): Promise<{ data: StudentUiPrefs | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } }
  }

  // Verify user is teacher, admin, or the student themselves
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return { data: null, error: { message: 'Profile not found' } }
  }

  // If not admin and not the student themselves, verify teacher owns a class with this student
  if (profile.role !== 'admin' && user.id !== studentId) {
    if (profile.role !== 'teacher') {
      return { data: null, error: { message: 'Access denied' } }
    }

    // Verify student is in teacher's class
    const { data: membership } = await supabase
      .from('class_memberships')
      .select('class_id, classes!inner(teacher_id)')
      .eq('student_id', studentId)
      .limit(1)
      .single()

    if (!membership || (membership.classes as any).teacher_id !== user.id) {
      return { data: null, error: { message: 'Student not found in your classes' } }
    }
  }

  // Get existing prefs to merge
  const { data: existing } = await supabase
    .from('student_ui_prefs')
    .select('*')
    .eq('student_id', studentId)
    .single()

  // Upsert UI prefs
  const { data, error } = await supabase
    .from('student_ui_prefs')
    .upsert({
      student_id: studentId,
      font_scale: payload.font_scale ?? existing?.font_scale ?? 'md',
      spacing: payload.spacing ?? existing?.spacing ?? 'md',
      reduce_clutter: payload.reduce_clutter ?? existing?.reduce_clutter ?? false,
      simplified_language: payload.simplified_language ?? existing?.simplified_language ?? false,
      high_contrast: payload.high_contrast ?? existing?.high_contrast ?? false,
    }, {
      onConflict: 'student_id',
    })
    .select()
    .single()

  return { data, error }
}

/**
 * Get student's own UI preferences (student can call this).
 * Fails gracefully: on 404/401/403/network or missing table, returns { data: null, error: null } so callers can use defaults.
 */
export async function getMyUiPrefs(): Promise<{ data: StudentUiPrefs | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { data: null, error: null }
    }

    const { data, error } = await supabase
      .from('student_ui_prefs')
      .select('*')
      .eq('student_id', user.id)
      .single()

    // Any error (404, PGRST116, relation missing, etc.): return no prefs, no error — caller uses defaults
    if (error) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log('[UI prefs] Fetch failed, using defaults:', error.message || error.code || error)
      }
      return { data: null, error: null }
    }

    return { data: data || null, error: null }
  } catch (e) {
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log('[UI prefs] Fetch failed, using defaults:', e)
    }
    return { data: null, error: null }
  }
}

/**
 * List students with support needs and UI prefs for a class (teacher/admin only)
 */
export async function listStudentsWithNeeds(
  classId: string
): Promise<{ data: StudentWithNeeds[] | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } }
  }

  // Verify teacher owns the class or user is admin
  const { data: classData } = await supabase
    .from('classes')
    .select('teacher_id')
    .eq('id', classId)
    .single()

  if (!classData) {
    return { data: null, error: { message: 'Class not found' } }
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return { data: null, error: { message: 'Profile not found' } }
  }

  if (profile.role !== 'admin' && classData.teacher_id !== user.id) {
    return { data: null, error: { message: 'Access denied' } }
  }

  // Get students in the class
  const { data: memberships, error: membershipError } = await supabase
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

  if (membershipError) {
    return { data: null, error: membershipError }
  }

  const studentIds = (memberships || [])
    .filter((m: any) => {
      const profile = m.profiles
      return profile && (profile.role === 'student' || profile.role === 'external')
    })
    .map((m: any) => m.profiles.id)

  if (studentIds.length === 0) {
    return { data: [], error: null }
  }

  // Get support needs and UI prefs for these students
  const [supportNeedsResult, uiPrefsResult] = await Promise.all([
    supabase
      .from('student_support_needs')
      .select('*')
      .in('student_id', studentIds),
    supabase
      .from('student_ui_prefs')
      .select('*')
      .in('student_id', studentIds),
  ])

  if (supportNeedsResult.error) {
    return { data: null, error: supportNeedsResult.error }
  }

  // If student_ui_prefs table is missing (404) or unavailable, continue with empty prefs so /app/classes still loads
  if (uiPrefsResult.error && typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('[UI prefs] listStudentsWithNeeds: student_ui_prefs fetch failed, using empty prefs:', uiPrefsResult.error.message || uiPrefsResult.error)
  }

  // Build maps for quick lookup
  const supportNeedsMap = new Map<string, StudentSupportNeeds>()
  for (const needs of supportNeedsResult.data || []) {
    supportNeedsMap.set(needs.student_id, needs)
  }

  const uiPrefsMap = new Map<string, StudentUiPrefs>()
  for (const prefs of uiPrefsResult.data || []) {
    uiPrefsMap.set(prefs.student_id, prefs)
  }
  // When uiPrefsResult.error (e.g. 404), uiPrefsResult.data is empty; we use empty map so students get ui_prefs: null

  // Build result array
  const students: StudentWithNeeds[] = []
  for (const membership of memberships || []) {
    const profile = (membership as any).profiles
    if (profile && typeof profile === 'object' && 'role' in profile && (profile.role === 'student' || profile.role === 'external')) {
      students.push({
        id: profile.id,
        full_name: profile.full_name,
        support_needs: supportNeedsMap.get(profile.id) || null,
        ui_prefs: uiPrefsMap.get(profile.id) || null,
      })
    }
  }

  return { data: students, error: null }
}
