'use client'

import { supabase } from './client'

export interface TaskAssignment {
  id: string
  task_id: string
  student_id: string
  status: 'not_started' | 'in_progress' | 'submitted' | 'reviewed'
  feedback: string | null
  stars_awarded: number
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface TaskAssignmentWithProfile extends TaskAssignment {
  profiles?: {
    id: string
    full_name: string | null
    role: string
  }
}

/**
 * Get the current user's assignment for a specific task
 */
export async function getMyAssignmentForTask(
  taskId: string
): Promise<{ data: TaskAssignment | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } }
  }

  const { data, error } = await supabase
    .from('task_assignments')
    .select('*')
    .eq('task_id', taskId)
    .eq('student_id', user.id)
    .maybeSingle()

  // maybeSingle returns null (no error) when 0 rows, avoids PGRST116
  return { data: data || null, error: error || null }
}

/**
 * List all assignments for a teacher's task (with student profiles)
 */
export async function listAssignmentsForTeacherTask(
  taskId: string
): Promise<{ data: TaskAssignmentWithProfile[] | null; error: any }> {
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

  const { data, error } = await supabase
    .from('task_assignments')
    .select(`
      *,
      profiles (
        id,
        full_name,
        role
      )
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  return { data, error }
}

