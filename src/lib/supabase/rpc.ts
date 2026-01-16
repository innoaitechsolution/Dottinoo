'use client'

import { supabase } from './client'

/**
 * Submit a task (student)
 * @param attachmentPath - Path to file in storage (e.g., "userId/assignmentId/filename")
 */
export async function submitTask(
  taskId: string,
  content: string,
  attachmentPath?: string | null
): Promise<{ data: string | null; error: any }> {
  const { data, error } = await supabase.rpc('submit_task', {
    p_task_id: taskId,
    p_content: content,
    p_attachment_path: attachmentPath || null,
  })

  if (error) {
    return { data: null, error }
  }

  return { data: data as string, error: null }
}

/**
 * Review a task (teacher)
 */
export async function reviewTask(
  taskId: string,
  studentId: string,
  feedback: string,
  stars: number
): Promise<{ data: string | null; error: any }> {
  // Validate stars
  if (stars < 0 || stars > 5) {
    return { data: null, error: { message: 'Stars must be between 0 and 5' } }
  }

  const { data, error } = await supabase.rpc('review_task', {
    p_task_id: taskId,
    p_student_id: studentId,
    p_feedback: feedback,
    p_stars: stars,
  })

  if (error) {
    return { data: null, error }
  }

  return { data: data as string, error: null }
}

