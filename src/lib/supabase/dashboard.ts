'use client'

import { supabase } from './client'

export interface NeedsReviewItem {
  task_id: string
  task_title: string
  student_id: string
  student_name: string | null
  student_email: string | null
  assignment_id: string
  submitted_at: string
}

export interface NextTaskItem {
  task_id: string
  task_title: string
  due_date: string | null
  status: 'not_started' | 'in_progress' | 'submitted' | 'reviewed'
  class_name: string | null
}

/**
 * List submissions that need review for a teacher (top N)
 */
export async function listTeacherNeedsReview(limit: number = 3): Promise<{ data: NeedsReviewItem[] | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } }
  }

  try {
    // Get teacher's task IDs
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('id')
      .eq('created_by', user.id)

    if (!tasksData || tasksData.length === 0) {
      return { data: [], error: null }
    }

    const taskIds = tasksData.map(t => t.id)

    // Get submitted assignments with task and student info
    const { data, error } = await supabase
      .from('task_assignments')
      .select(`
        id,
        task_id,
        student_id,
        updated_at,
        tasks!inner (
          id,
          title,
          created_by
        )
      `)
      .in('task_id', taskIds)
      .eq('status', 'submitted')
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (error) {
      return { data: null, error }
    }

    // Get student profiles separately
    const studentIds = [...new Set((data || []).map((item: any) => item.student_id))]
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', studentIds)

    const profilesMap = new Map((profilesData || []).map((p: any) => [p.id, p]))

    // Get user emails from auth (we'll use student_id to match)
    const studentEmails = new Map<string, string>()
    for (const studentId of studentIds) {
      // Note: We can't directly query auth.users, so we'll skip email for now
      // In production, you might want to store email in profiles or use a different approach
    }

    // Transform the data
    const items: NeedsReviewItem[] = (data || []).map((item: any) => {
      const profile = profilesMap.get(item.student_id)
      return {
        task_id: item.task_id,
        task_title: item.tasks?.title || 'Unknown Task',
        student_id: item.student_id,
        student_name: profile?.full_name || null,
        student_email: null, // Email not available from profiles table
        assignment_id: item.id,
        submitted_at: item.updated_at,
      }
    })

    return { data: items, error: null }
  } catch (err: any) {
    return { data: null, error: { message: err.message || 'Failed to load needs review' } }
  }
}

/**
 * List next tasks for a student (top N upcoming, ordered by due date)
 */
export async function listStudentNextTasks(limit: number = 3): Promise<{ data: NextTaskItem[] | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } }
  }

  try {
    // Get student's assignments with task info
    const { data, error } = await supabase
      .from('task_assignments')
      .select(`
        task_id,
        status,
        tasks!inner (
          id,
          title,
          due_date,
          class_id
        )
      `)
      .eq('student_id', user.id)
      .order('tasks.due_date', { ascending: true, nullsFirst: false })
      .limit(limit)

    if (error) {
      return { data: null, error }
    }

    // Get class names separately
    const classIds = [...new Set((data || []).map((item: any) => item.tasks?.class_id).filter(Boolean))]
    const { data: classesData } = await supabase
      .from('classes')
      .select('id, name')
      .in('id', classIds)

    const classesMap = new Map((classesData || []).map((c: any) => [c.id, c.name]))

    // Transform the data
    const items: NextTaskItem[] = (data || []).map((item: any) => ({
      task_id: item.task_id,
      task_title: item.tasks?.title || 'Unknown Task',
      due_date: item.tasks?.due_date || null,
      status: item.status as 'not_started' | 'in_progress' | 'submitted' | 'reviewed',
      class_name: item.tasks?.class_id ? (classesMap.get(item.tasks.class_id) || null) : null,
    }))

    return { data: items, error: null }
  } catch (err: any) {
    return { data: null, error: { message: err.message || 'Failed to load next tasks' } }
  }
}

