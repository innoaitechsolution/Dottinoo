-- ============================================================================
-- SUBMISSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_assignment_id uuid NOT NULL UNIQUE REFERENCES public.task_assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  attachment_url text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger to update updated_at on submissions updates
CREATE OR REPLACE FUNCTION update_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER submissions_updated_at
  BEFORE UPDATE ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_submissions_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY - SUBMISSIONS
-- ============================================================================

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Students can SELECT their own submissions
CREATE POLICY "Students can view own submissions"
  ON submissions
  FOR SELECT
  USING (student_id = auth.uid());

-- Students can INSERT their own submissions
CREATE POLICY "Students can insert own submissions"
  ON submissions
  FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Students can UPDATE their own submissions
CREATE POLICY "Students can update own submissions"
  ON submissions
  FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Teachers can SELECT submissions for tasks they created
CREATE POLICY "Teachers can view submissions for own tasks"
  ON submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.task_assignments a
      JOIN public.tasks t ON t.id = a.task_id
      WHERE a.id = submissions.task_assignment_id
        AND t.created_by = auth.uid()
    )
  );

-- ============================================================================
-- RPC: SUBMIT TASK
-- ============================================================================

CREATE OR REPLACE FUNCTION public.submit_task(
  p_task_id uuid,
  p_content text,
  p_attachment_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignment_id uuid;
  v_submission_id uuid;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find the task assignment
  SELECT id INTO v_assignment_id
  FROM task_assignments
  WHERE task_id = p_task_id AND student_id = auth.uid();

  IF v_assignment_id IS NULL THEN
    RAISE EXCEPTION 'Task assignment not found';
  END IF;

  -- Upsert submission
  INSERT INTO submissions (task_assignment_id, student_id, content, attachment_url)
  VALUES (v_assignment_id, auth.uid(), p_content, p_attachment_url)
  ON CONFLICT (task_assignment_id)
  DO UPDATE SET
    content = EXCLUDED.content,
    attachment_url = EXCLUDED.attachment_url,
    updated_at = now();

  -- Get submission id
  SELECT id INTO v_submission_id
  FROM submissions
  WHERE task_assignment_id = v_assignment_id;

  -- Update task assignment status
  UPDATE task_assignments
  SET status = 'submitted',
      updated_at = now()
  WHERE id = v_assignment_id;

  RETURN v_assignment_id;
END;
$$;

-- ============================================================================
-- RPC: REVIEW TASK
-- ============================================================================

CREATE OR REPLACE FUNCTION public.review_task(
  p_task_id uuid,
  p_student_id uuid,
  p_feedback text,
  p_stars int
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignment_id uuid;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate stars (0-5)
  IF p_stars < 0 OR p_stars > 5 THEN
    RAISE EXCEPTION 'Stars must be between 0 and 5';
  END IF;

  -- Confirm task belongs to current teacher
  IF NOT EXISTS (
    SELECT 1 FROM tasks
    WHERE id = p_task_id AND created_by = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Task not found or access denied';
  END IF;

  -- Find assignment
  SELECT id INTO v_assignment_id
  FROM task_assignments
  WHERE task_id = p_task_id AND student_id = p_student_id;

  IF v_assignment_id IS NULL THEN
    RAISE EXCEPTION 'Task assignment not found';
  END IF;

  -- Update task assignment
  UPDATE task_assignments
  SET status = 'reviewed',
      feedback = p_feedback,
      stars_awarded = p_stars,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = v_assignment_id;

  RETURN v_assignment_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.submit_task(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_task(uuid, uuid, text, int) TO authenticated;

-- ============================================================================
-- NOTE: Ensure task_assignments RLS does NOT allow students to UPDATE directly
-- The existing policies should already be correct, but verify:
-- - Students can SELECT their own assignments (for viewing)
-- - Teachers can SELECT/UPDATE assignments for tasks they created (for review)
-- Students should only update via the submit_task RPC, not directly.
-- ============================================================================

