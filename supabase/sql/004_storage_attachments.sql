-- ============================================================================
-- STORAGE BUCKET SETUP
-- ============================================================================

-- Create storage bucket if it doesn't exist
-- Note: This may require superuser permissions. If it fails, create the bucket
-- manually in Supabase Dashboard > Storage > Create Bucket:
-- - Name: submissions
-- - Public: false (private)

INSERT INTO storage.buckets (id, name, public)
VALUES ('submissions', 'submissions', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SCHEMA UPDATES - SUBMISSIONS TABLE
-- ============================================================================

-- Add attachment_path column to submissions table
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS attachment_path text NULL;

-- Note: attachment_url is kept for backward compatibility
-- Future writes should use attachment_path

-- ============================================================================
-- STORAGE RLS POLICIES
-- ============================================================================

-- Enable RLS on storage.objects (if not already enabled)
-- This is typically enabled by default, but we ensure it here

-- Policy 1: INSERT - Students/teachers can upload only to their own folder
CREATE POLICY "Users can upload to own folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'submissions'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy 2: SELECT - Allow reading if user owns file OR is teacher who created related task
CREATE POLICY "Users can view own files or teacher task files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'submissions'
    AND (
      -- User owns the file (first folder == auth.uid())
      (storage.foldername(name))[1] = auth.uid()::text
      OR
      -- User is teacher who created the related task
      EXISTS (
        SELECT 1
        FROM public.submissions s
        JOIN public.task_assignments a ON a.id = s.task_assignment_id
        JOIN public.tasks t ON t.id = a.task_id
        WHERE s.attachment_path = name
          AND t.created_by = auth.uid()
      )
    )
  );

-- Policy 3: DELETE - Allow owners to delete their own files
CREATE POLICY "Users can delete own files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'submissions'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- NOTES
-- ============================================================================
-- Folder convention: submissions/<userId>/<assignmentId>/<filename>
-- Example: submissions/abc123/def456/1699123456-document.pdf
--
-- If bucket creation fails due to permissions, create it manually:
-- 1. Go to Supabase Dashboard > Storage
-- 2. Click "Create Bucket"
-- 3. Name: submissions
-- 4. Public: false (unchecked)
-- 5. Click "Create bucket"

