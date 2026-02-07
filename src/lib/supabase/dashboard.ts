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
    // Get teacher's task IDs and titles
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('id, title')
      .eq('created_by', user.id)

    if (!tasksData || tasksData.length === 0) {
      return { data: [], error: null }
    }

    const taskIds = tasksData.map(t => t.id)

    // Get submitted assignments (flat select — no embedded join to avoid 400)
    const { data, error } = await supabase
      .from('task_assignments')
      .select('id, task_id, student_id, updated_at')
      .in('task_id', taskIds)
      .eq('status', 'submitted')
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (error) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.warn('[listTeacherNeedsReview]', error.message, error.code, error.details)
      }
      return { data: null, error }
    }

    // Build a task title map from the data we already have
    const taskTitleMap = new Map<string, string>()
    for (const t of tasksData || []) {
      taskTitleMap.set(t.id, t.title)
    }

    // Refetch task titles if taskIds that appear in assignments weren't in tasksData
    // (unlikely, but safe)
    const missingTaskIds = [...new Set((data || []).map((d: any) => d.task_id).filter((id: string) => !taskTitleMap.has(id)))]
    if (missingTaskIds.length > 0) {
      const { data: extraTasks } = await supabase.from('tasks').select('id, title').in('id', missingTaskIds)
      for (const t of extraTasks || []) {
        taskTitleMap.set(t.id, t.title)
      }
    }

    // Get student profiles separately
    const studentIds = [...new Set((data || []).map((item: any) => item.student_id))]
    const { data: profilesData } = studentIds.length > 0
      ? await supabase.from('profiles').select('id, full_name').in('id', studentIds)
      : { data: [] }

    const profilesMap = new Map((profilesData || []).map((p: any) => [p.id, p]))

    // Transform the data
    const items: NeedsReviewItem[] = (data || []).map((item: any) => {
      const profile = profilesMap.get(item.student_id)
      return {
        task_id: item.task_id,
        task_title: taskTitleMap.get(item.task_id) || 'Unknown Task',
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
    // Get student's assignments (flat select — no embedded join to avoid 400)
    const { data, error } = await supabase
      .from('task_assignments')
      .select('task_id, status')
      .eq('student_id', user.id)
      .neq('status', 'reviewed')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.warn('[listStudentNextTasks]', error.message, error.code, error.details)
      }
      return { data: null, error }
    }

    // Get task details separately
    const taskIds = [...new Set((data || []).map((d: any) => d.task_id))]
    const taskMap = new Map<string, any>()

    if (taskIds.length > 0) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, due_date, class_id')
        .in('id', taskIds)

      for (const t of tasks || []) {
        taskMap.set(t.id, t)
      }
    }

    // Get class names separately
    const classIds = [...new Set([...taskMap.values()].map((t: any) => t.class_id).filter(Boolean))]
    const classesMap = new Map<string, string>()

    if (classIds.length > 0) {
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name')
        .in('id', classIds)

      for (const c of classesData || []) {
        classesMap.set(c.id, c.name)
      }
    }

    // Transform the data
    const items: NextTaskItem[] = (data || []).map((item: any) => {
      const task = taskMap.get(item.task_id)
      return {
        task_id: item.task_id,
        task_title: task?.title || 'Unknown Task',
        due_date: task?.due_date || null,
        status: item.status as 'not_started' | 'in_progress' | 'submitted' | 'reviewed',
        class_name: task?.class_id ? (classesMap.get(task.class_id) || null) : null,
      }
    })

    return { data: items, error: null }
  } catch (err: any) {
    return { data: null, error: { message: err.message || 'Failed to load next tasks' } }
  }
}

