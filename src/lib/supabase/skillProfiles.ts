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

  // Get skill profiles for these students in this class
  const studentIds = (memberships || [])
    .filter((m: any) => {
      const profile = m.profiles
      return profile && (profile.role === 'student' || profile.role === 'external')
    })
    .map((m: any) => m.profiles.id)

  if (studentIds.length === 0) {
    return { data: [], error: null }
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('student_skill_profiles')
    .select('*')
    .eq('class_id', classId)
    .in('student_id', studentIds)

  if (profilesError) {
    return { data: null, error: profilesError }
  }

  // Build skills map per student
  const skillsMap = new Map<string, Record<DigitalSkill, SkillLevel | null>>()
  
  // Initialize all students with null skills
  for (const membership of memberships || []) {
    const profile = (membership as any).profiles
    if (profile && typeof profile === 'object' && 'role' in profile && (profile.role === 'student' || profile.role === 'external')) {
      skillsMap.set(profile.id, {
        digital_safety: null,
        search_information: null,
        communication: null,
        productivity: null,
        ai_literacy: null,
      })
    }
  }

  // Fill in existing profiles
  for (const profile of profiles || []) {
    const studentSkills = skillsMap.get(profile.student_id)
    if (studentSkills && profile.skill_key in studentSkills) {
      const skillKey = profile.skill_key as DigitalSkill
      studentSkills[skillKey] = profile.level
    }
  }

  // Build result array
  const students: StudentWithSkills[] = []
  for (const membership of memberships || []) {
    const profile = (membership as any).profiles
    if (profile && typeof profile === 'object' && 'role' in profile && (profile.role === 'student' || profile.role === 'external')) {
      students.push({
        id: profile.id,
        full_name: profile.full_name,
        skills: skillsMap.get(profile.id) || {
          digital_safety: null,
          search_information: null,
          communication: null,
          productivity: null,
          ai_literacy: null,
        },
      })
    }
  }

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
