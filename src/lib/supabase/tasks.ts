'use client'

import { supabase } from './client'

export interface Task {
  id: string
  class_id: string
  created_by: string
  title: string
  instructions: string
  steps: any[]
  differentiation: any
  success_criteria: any[]
  due_date: string | null
  creation_mode: 'manual' | 'template' | 'ai'
  target_skill: string | null
  target_level: string | null
  created_at: string
}

export interface TaskWithClass extends Task {
  classes?: {
    id: string
    name: string
  }
}

export interface TaskWithStatus extends TaskWithClass {
  assignmentStatus?: 'not_started' | 'in_progress' | 'submitted' | 'reviewed'
  starsAwarded?: number
}

export interface TaskWithCounts extends TaskWithClass {
  submittedCount?: number
  reviewedCount?: number
}

/**
 * List tasks for a teacher (tasks they created)
 */
export async function listTasksForTeacher(): Promise<{ data: TaskWithClass[] | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } }
  }

  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      classes (
        id,
        name
      )
    `)
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })

  return { data, error }
}

/**
 * List tasks for a student (ONLY tasks explicitly assigned to them via task_assignments)
 * Uses direct query with nested selects (same pattern as listStudentNextTasks)
 */
export async function listTasksForStudent(): Promise<{ data: TaskWithStatus[] | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } }
  }

  try {
    // Get student's assignments with task info
    const { data, error } = await supabase
      .from('task_assignments')
      .select(`
        id,
        status,
        stars_awarded,
        created_at,
        tasks!inner (
          id,
          class_id,
          created_by,
          title,
          instructions,
          steps,
          differentiation,
          success_criteria,
          due_date,
          creation_mode,
          target_skill,
          target_level,
          created_at
        )
      `)
      .eq('student_id', user.id)
      .order('due_date', { foreignTable: 'tasks', ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (error) {
      return { data: null, error }
    }

    // Get class names separately (to avoid RLS recursion with nested selects)
    const classIds = [...new Set((data || []).map((item: any) => item.tasks?.class_id).filter(Boolean))]
    const { data: classesData } = await supabase
      .from('classes')
      .select('id, name')
      .in('id', classIds)

    const classesMap = new Map((classesData || []).map((c: any) => [c.id, c.name]))

    // Transform to TaskWithStatus format
    const tasks: TaskWithStatus[] = (data || []).map((item: any) => ({
      id: item.tasks?.id || '',
      class_id: item.tasks?.class_id || '',
      created_by: item.tasks?.created_by || '',
      title: item.tasks?.title || 'Unknown Task',
      instructions: item.tasks?.instructions || '',
      steps: item.tasks?.steps || [],
      differentiation: item.tasks?.differentiation || {},
      success_criteria: item.tasks?.success_criteria || [],
      due_date: item.tasks?.due_date || null,
      creation_mode: (item.tasks?.creation_mode || 'manual') as 'manual' | 'template' | 'ai',
      target_skill: item.tasks?.target_skill || null,
      target_level: item.tasks?.target_level || null,
      created_at: item.tasks?.created_at || item.created_at,
      classes: item.tasks?.class_id ? {
        id: item.tasks.class_id,
        name: classesMap.get(item.tasks.class_id) || 'Unknown Class',
      } : undefined,
      assignmentStatus: item.status as 'not_started' | 'in_progress' | 'submitted' | 'reviewed',
      starsAwarded: item.stars_awarded || 0,
    }))

    return { data: tasks, error: null }
  } catch (err: any) {
    return { data: null, error: { message: err.message || 'Failed to load student tasks' } }
  }
}

/**
 * Get assignment status for a student's task
 */
export async function getAssignmentStatusForTask(
  taskId: string
): Promise<{ data: { status: string; stars_awarded: number } | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } }
  }

  const { data, error } = await supabase
    .from('task_assignments')
    .select('status, stars_awarded')
    .eq('task_id', taskId)
    .eq('student_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    return { data: null, error }
  }

  return { data: data || null, error: null }
}

/**
 * Get submission counts for a teacher's task
 */
export async function getSubmissionCountsForTask(
  taskId: string
): Promise<{ data: { submitted: number; reviewed: number } | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } }
  }

  // Verify task belongs to teacher
  const { data: task } = await supabase
    .from('tasks')
    .select('created_by')
    .eq('id', taskId)
    .single()

  if (!task || task.created_by !== user.id) {
    return { data: null, error: { message: 'Task not found or access denied' } }
  }

  const { count: submittedCount } = await supabase
    .from('task_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('task_id', taskId)
    .eq('status', 'submitted')

  const { count: reviewedCount } = await supabase
    .from('task_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('task_id', taskId)
    .eq('status', 'reviewed')

  return {
    data: {
      submitted: submittedCount || 0,
      reviewed: reviewedCount || 0,
    },
    error: null,
  }
}
