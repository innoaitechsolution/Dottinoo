'use client'

import { supabase } from './client'

export interface Submission {
  id: string
  task_assignment_id: string
  student_id: string
  content: string
  attachment_url: string | null
  attachment_path: string | null
  created_at: string
  updated_at: string
}

/**
 * Get submission by assignment ID
 */
export async function getSubmissionByAssignment(
  assignmentId: string
): Promise<{ data: Submission | null; error: any }> {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('task_assignment_id', assignmentId)
    .maybeSingle()

  // maybeSingle returns null (no error) when 0 rows, avoids PGRST116
  return { data: data || null, error: error || null }
}

