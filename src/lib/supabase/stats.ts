'use client'

import { supabase } from './client'

export interface TeacherStats {
  totalTasks: number
  submissionsSubmitted: number
  submissionsReviewed: number
}

export interface StudentStats {
  assignedTasksCount: number
  submittedCount: number
  reviewedCount: number
  totalStars: number
}

/**
 * Get statistics for a teacher
 */
export async function getTeacherStats(): Promise<{ data: TeacherStats | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } }
  }

  try {
    // Total tasks created
    const { count: totalTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', user.id)

    // Get task IDs first
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('id')
      .eq('created_by', user.id)

    const taskIds = tasksData?.map(t => t.id) || []

    if (taskIds.length === 0) {
      return {
        data: {
          totalTasks: totalTasks || 0,
          submissionsSubmitted: 0,
          submissionsReviewed: 0,
        },
        error: null,
      }
    }

    // Submissions submitted (count assignments with status 'submitted')
    const { count: submittedCount } = await supabase
      .from('task_assignments')
      .select('*', { count: 'exact', head: true })
      .in('task_id', taskIds)
      .eq('status', 'submitted')

    // Submissions reviewed
    const { count: reviewedCount } = await supabase
      .from('task_assignments')
      .select('*', { count: 'exact', head: true })
      .in('task_id', taskIds)
      .eq('status', 'reviewed')

    return {
      data: {
        totalTasks: totalTasks || 0,
        submissionsSubmitted: submittedCount || 0,
        submissionsReviewed: reviewedCount || 0,
      },
      error: null,
    }
  } catch (err: any) {
    return { data: null, error: { message: err.message || 'Failed to load stats' } }
  }
}

/**
 * Get statistics for a student
 */
export async function getStudentStats(): Promise<{ data: StudentStats | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } }
  }

  try {
    // Assigned tasks count
    const { count: assignedTasksCount } = await supabase
      .from('task_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', user.id)

    // Submitted count
    const { count: submittedCount } = await supabase
      .from('task_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .eq('status', 'submitted')

    // Reviewed count
    const { count: reviewedCount } = await supabase
      .from('task_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .eq('status', 'reviewed')

    // Total stars
    const { data: assignmentsData } = await supabase
      .from('task_assignments')
      .select('stars_awarded')
      .eq('student_id', user.id)

    const totalStars = assignmentsData?.reduce((sum, a) => sum + (a.stars_awarded || 0), 0) || 0

    return {
      data: {
        assignedTasksCount: assignedTasksCount || 0,
        submittedCount: submittedCount || 0,
        reviewedCount: reviewedCount || 0,
        totalStars,
      },
      error: null,
    }
  } catch (err: any) {
    return { data: null, error: { message: err.message || 'Failed to load stats' } }
  }
}

