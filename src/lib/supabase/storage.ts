'use client'

import { supabase } from './client'

/**
 * Upload a file to Supabase Storage
 * Path format: submissions/<userId>/<assignmentId>/<timestamp>-<filename>
 */
export async function uploadSubmissionFile(
  file: File,
  userId: string,
  assignmentId: string
): Promise<{ data: string | null; error: any }> {
  try {
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `${userId}/${assignmentId}/${timestamp}-${sanitizedFileName}`

    const { data, error } = await supabase.storage
      .from('submissions')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      })

    if (error) {
      return { data: null, error }
    }

    return { data: filePath, error: null }
  } catch (err: any) {
    return { data: null, error: { message: err.message || 'Upload failed' } }
  }
}

/**
 * Get a signed URL for downloading a file (expires in 60 seconds)
 */
export async function getSignedUrl(
  filePath: string
): Promise<{ data: string | null; error: any }> {
  try {
    const { data, error } = await supabase.storage
      .from('submissions')
      .createSignedUrl(filePath, 60)

    if (error) {
      return { data: null, error }
    }

    return { data: data.signedUrl, error: null }
  } catch (err: any) {
    return { data: null, error: { message: err.message || 'Failed to generate download link' } }
  }
}

