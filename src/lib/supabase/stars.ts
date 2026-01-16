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
    // Get all reviewed assignments with stars
    const { data: assignments, error } = await supabase
      .from('task_assignments')
      .select(`
        task_id,
        stars_awarded,
        reviewed_at,
        feedback,
        tasks (
          title
        )
      `)
      .eq('student_id', user.id)
      .eq('status', 'reviewed')
      .not('stars_awarded', 'is', null)
      .order('reviewed_at', { ascending: false })
      .limit(10)

    if (error) {
      return { data: null, error }
    }

    const totalStars = assignments?.reduce((sum, a) => sum + (a.stars_awarded || 0), 0) || 0

    const recentStars: StarEntry[] = (assignments || []).map(a => ({
      task_id: a.task_id,
      task_title: (a.tasks as any)?.title || 'Unknown Task',
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
    // Get tasks created by teacher
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('id, title')
      .eq('created_by', user.id)

    const taskIds = tasksData?.map(t => t.id) || []

    if (taskIds.length === 0) {
      return { data: [], error: null }
    }

    // Get recent reviewed assignments for these tasks
    const { data: assignments, error } = await supabase
      .from('task_assignments')
      .select(`
        task_id,
        stars_awarded,
        reviewed_at,
        feedback,
        tasks!inner (
          title,
          created_by
        )
      `)
      .in('task_id', taskIds)
      .eq('status', 'reviewed')
      .not('stars_awarded', 'is', null)
      .order('reviewed_at', { ascending: false })
      .limit(10)

    if (error) {
      return { data: null, error }
    }

    const reviews: StarEntry[] = (assignments || []).map(a => ({
      task_id: a.task_id,
      task_title: (a.tasks as any)?.title || 'Unknown Task',
      stars_awarded: a.stars_awarded || 0,
      reviewed_at: a.reviewed_at || '',
      feedback: a.feedback,
    }))

    return { data: reviews, error: null }
  } catch (err: any) {
    return { data: null, error: { message: err.message || 'Failed to load reviews' } }
  }
}

