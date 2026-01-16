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
 * Uses RPC function to avoid RLS recursion issues with nested selects
 */
export async function listTasksForStudent(): Promise<{ data: TaskWithStatus[] | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } }
  }

  // Use RPC function to get assigned tasks (avoids RLS recursion)
  const { data, error } = await supabase.rpc('list_student_tasks')

  if (error) {
    return { data: null, error }
  }

  // Transform RPC result to TaskWithStatus format
  // RPC returns: assignment_id, task_id, class_id, class_name, title, due_date, status, stars_awarded, created_at
  const tasks: TaskWithStatus[] = (data || []).map((item: any) => ({
    id: item.task_id,
    class_id: item.class_id,
    created_by: '', // Not returned by RPC, but not needed for list view
    title: item.title,
    instructions: '', // Not returned by RPC, loaded separately on detail page
    steps: [],
    differentiation: {},
    success_criteria: [],
    due_date: item.due_date,
    creation_mode: 'manual' as const, // Default, loaded separately on detail page
    target_skill: item.target_skill || null,
    target_level: item.target_level || null,
    created_at: item.created_at,
    classes: {
      id: item.class_id,
      name: item.class_name,
    },
    assignmentStatus: item.status as 'not_started' | 'in_progress' | 'submitted' | 'reviewed',
    starsAwarded: item.stars_awarded || 0,
  }))

  return { data: tasks, error: null }
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
