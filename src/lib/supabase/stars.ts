'use client'

import { supabase } from './client'

export interface StarEntry {
  task_id: string
  task_title: string
  stars_awarded: number
  reviewed_at: string
  feedback: string | null
}

export interface StarsSummary {
  totalStars: number
  recentStars: StarEntry[]
}

/**
 * Get student stars summary
 */
export async function getStudentStarsSummary(): Promise<{ data: StarsSummary | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } }
  }

  try {
    // Get reviewed assignments — fetch assignments first, then task titles separately
    // to avoid nested select issues with RLS / schema cache
    const { data: assignments, error } = await supabase
      .from('task_assignments')
      .select('task_id, stars_awarded, reviewed_at, feedback')
      .eq('student_id', user.id)
      .eq('status', 'reviewed')
      .gt('stars_awarded', 0)
      .order('reviewed_at', { ascending: false })
      .limit(10)

    if (error) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.warn('[getStudentStarsSummary]', error.message, error.code, error.details)
      }
      return { data: null, error }
    }

    // Get task titles separately
    const taskIds = [...new Set((assignments || []).map(a => a.task_id))]
    const taskTitleMap = new Map<string, string>()

    if (taskIds.length > 0) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title')
        .in('id', taskIds)

      for (const t of tasks || []) {
        taskTitleMap.set(t.id, t.title)
      }
    }

    // Also get the total stars across ALL reviewed assignments (not just top 10)
    const { data: allAssignments } = await supabase
      .from('task_assignments')
      .select('stars_awarded')
      .eq('student_id', user.id)
      .eq('status', 'reviewed')

    const totalStars = allAssignments?.reduce((sum, a) => sum + (a.stars_awarded || 0), 0) || 0

    const recentStars: StarEntry[] = (assignments || []).map(a => ({
      task_id: a.task_id,
      task_title: taskTitleMap.get(a.task_id) || 'Unknown Task',
      stars_awarded: a.stars_awarded || 0,
      reviewed_at: a.reviewed_at || '',
      feedback: a.feedback,
    }))

    return {
      data: {
        totalStars,
        recentStars,
      },
      error: null,
    }
  } catch (err: any) {
    return { data: null, error: { message: err.message || 'Failed to load stars' } }
  }
}

/**
 * Get teacher recent reviews
 */
export async function getTeacherRecentReviews(): Promise<{ data: StarEntry[] | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } }
  }

  try {
    // Get tasks created by teacher (id + title)
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('id, title')
      .eq('created_by', user.id)

    const taskIds = tasksData?.map(t => t.id) || []
    const taskTitleMap = new Map<string, string>()
    for (const t of tasksData || []) {
      taskTitleMap.set(t.id, t.title)
    }

    if (taskIds.length === 0) {
      return { data: [], error: null }
    }

    // Get recent reviewed assignments — flat select (no nested join) to avoid 400s
    const { data: assignments, error } = await supabase
      .from('task_assignments')
      .select('task_id, stars_awarded, reviewed_at, feedback')
      .in('task_id', taskIds)
      .eq('status', 'reviewed')
      .gt('stars_awarded', 0)
      .order('reviewed_at', { ascending: false })
      .limit(10)

    if (error) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.warn('[getTeacherRecentReviews]', error.message, error.code, error.details)
      }
      return { data: null, error }
    }

    const reviews: StarEntry[] = (assignments || []).map(a => ({
      task_id: a.task_id,
      task_title: taskTitleMap.get(a.task_id) || 'Unknown Task',
      stars_awarded: a.stars_awarded || 0,
      reviewed_at: a.reviewed_at || '',
      feedback: a.feedback,
    }))

    return { data: reviews, error: null }
  } catch (err: any) {
    return { data: null, error: { message: err.message || 'Failed to load reviews' } }
  }
}

