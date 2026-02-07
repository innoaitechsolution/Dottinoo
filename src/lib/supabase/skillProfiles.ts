'use client'

import { supabase } from './client'

export type DigitalSkill = 'digital_safety' | 'search_information' | 'communication' | 'productivity' | 'ai_literacy'
export type SkillLevel = 'beginner' | 'developing' | 'confident'

export interface StudentSkillProfile {
  id: string
  student_id: string
  class_id: string
  skill_key: DigitalSkill
  level: SkillLevel
  created_at: string
  updated_at: string
}

export interface StudentWithSkills {
  id: string
  full_name: string | null
  skills: Record<DigitalSkill, SkillLevel | null>
}

export const DIGITAL_SKILLS: { key: DigitalSkill; label: string }[] = [
  { key: 'digital_safety', label: 'Digital Safety' },
  { key: 'search_information', label: 'Search & Information' },
  { key: 'communication', label: 'Communication' },
  { key: 'productivity', label: 'Productivity' },
  { key: 'ai_literacy', label: 'AI Literacy' },
]

export const SKILL_LEVELS: { value: SkillLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'developing', label: 'Developing' },
  { value: 'confident', label: 'Confident' },
]

/**
 * Get students with their skill profiles for a class (teacher only)
 */
export async function getStudentsWithSkills(classId: string): Promise<{ data: StudentWithSkills[] | null; error: any }> {
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

  const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development'

  // Step 1: flat membership query (no embedded join)
  const { data: memberships, error: membershipError } = await supabase
    .from('class_memberships')
    .select('student_id')
    .eq('class_id', classId)

  if (membershipError) {
    if (isDev) console.warn('[getStudentsWithSkills] membership query failed:', membershipError.message)
    return { data: null, error: membershipError }
  }

  const allStudentIds = (memberships || []).map(m => m.student_id)
  if (allStudentIds.length === 0) {
    return { data: [], error: null }
  }

  // Step 2: flat profiles query
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .in('id', allStudentIds)

  if (profilesError) {
    if (isDev) console.warn('[getStudentsWithSkills] profiles query failed:', profilesError.message)
  }

  // Build a profile map
  const profileMap = new Map<string, { full_name: string | null; role: string }>()
  for (const p of profilesData || []) {
    profileMap.set(p.id, { full_name: p.full_name, role: p.role })
  }

  // Filter to students/external only
  const studentIds = allStudentIds.filter(sid => {
    const p = profileMap.get(sid)
    return !p || p.role === 'student' || p.role === 'external'
  })

  if (studentIds.length === 0) {
    return { data: [], error: null }
  }

  // Step 3: skill profiles
  const { data: skillData, error: skillError } = await supabase
    .from('student_skill_profiles')
    .select('*')
    .eq('class_id', classId)
    .in('student_id', studentIds)

  if (skillError) {
    if (isDev) console.warn('[getStudentsWithSkills] skill profiles query failed:', skillError.message)
    return { data: null, error: skillError }
  }

  // Build skills map per student
  const skillsMap = new Map<string, Record<DigitalSkill, SkillLevel | null>>()

  const emptySkills = (): Record<DigitalSkill, SkillLevel | null> => ({
    digital_safety: null,
    search_information: null,
    communication: null,
    productivity: null,
    ai_literacy: null,
  })

  for (const sid of studentIds) {
    skillsMap.set(sid, emptySkills())
  }

  for (const row of skillData || []) {
    const studentSkills = skillsMap.get(row.student_id)
    if (studentSkills && row.skill_key in studentSkills) {
      const skillKey = row.skill_key as DigitalSkill
      studentSkills[skillKey] = row.level
    }
  }

  // Build result array
  const students: StudentWithSkills[] = studentIds.map(sid => {
    const p = profileMap.get(sid)
    return {
      id: sid,
      full_name: p?.full_name ?? null,
      skills: skillsMap.get(sid) || {
        digital_safety: null,
        search_information: null,
        communication: null,
        productivity: null,
        ai_literacy: null,
      },
    }
  })

  if (isDev) console.log(`[getStudentsWithSkills] class_id=${classId}: ${students.length} students, ${(skillData || []).length} skill rows`)

  return { data: students, error: null }
}

/**
 * Upsert skill profile for a student (teacher only)
 */
export async function upsertSkillProfile(
  studentId: string,
  classId: string,
  skillKey: DigitalSkill,
  level: SkillLevel | null
): Promise<{ data: StudentSkillProfile | null; error: any }> {
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

  if (level === null) {
    // Delete the profile if level is null
    const { error } = await supabase
      .from('student_skill_profiles')
      .delete()
      .eq('student_id', studentId)
      .eq('class_id', classId)
      .eq('skill_key', skillKey)

    if (error) {
      return { data: null, error }
    }
    return { data: null, error: null }
  }

  // Upsert the profile
  const { data, error } = await supabase
    .from('student_skill_profiles')
    .upsert({
      student_id: studentId,
      class_id: classId,
      skill_key: skillKey,
      level: level,
    }, {
      onConflict: 'student_id,class_id,skill_key',
    })
    .select()
    .single()

  return { data, error }
}

/**
 * Bulk upsert skill profiles for multiple students (teacher only)
 */
export async function bulkUpsertSkillProfiles(
  classId: string,
  updates: Array<{
    studentId: string
    skillKey: DigitalSkill
    level: SkillLevel | null
  }>
): Promise<{ data: StudentSkillProfile[] | null; error: any }> {
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

  // Separate inserts and deletes
  const toInsert: Array<{
    student_id: string
    class_id: string
    skill_key: DigitalSkill
    level: SkillLevel
  }> = []
  const toDelete: Array<{
    student_id: string
    class_id: string
    skill_key: DigitalSkill
  }> = []

  for (const update of updates) {
    if (update.level === null) {
      toDelete.push({
        student_id: update.studentId,
        class_id: classId,
        skill_key: update.skillKey,
      })
    } else {
      toInsert.push({
        student_id: update.studentId,
        class_id: classId,
        skill_key: update.skillKey,
        level: update.level,
      })
    }
  }

  // Delete first
  if (toDelete.length > 0) {
    for (const del of toDelete) {
      const { error } = await supabase
        .from('student_skill_profiles')
        .delete()
        .eq('student_id', del.student_id)
        .eq('class_id', del.class_id)
        .eq('skill_key', del.skill_key)

      if (error) {
        return { data: null, error }
      }
    }
  }

  // Then insert/update
  if (toInsert.length > 0) {
    const { data, error } = await supabase
      .from('student_skill_profiles')
      .upsert(toInsert, {
        onConflict: 'student_id,class_id,skill_key',
      })
      .select()

    if (error) {
      return { data: null, error }
    }

    return { data, error: null }
  }

  return { data: [], error: null }
}
