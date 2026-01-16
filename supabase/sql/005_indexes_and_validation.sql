-- ============================================================================
-- CHECK CONSTRAINTS FOR DATA VALIDATION
-- ============================================================================

-- Submissions content length validation
ALTER TABLE public.submissions
ADD CONSTRAINT submissions_content_length_check
  CHECK (char_length(content) <= 5000);

-- Tasks title length validation
ALTER TABLE public.tasks
ADD CONSTRAINT tasks_title_length_check
  CHECK (char_length(title) <= 140);

-- Tasks instructions length validation
ALTER TABLE public.tasks
ADD CONSTRAINT tasks_instructions_length_check
  CHECK (char_length(instructions) <= 8000);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_class_id ON public.tasks(class_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);

-- Class memberships indexes
CREATE INDEX IF NOT EXISTS idx_class_memberships_student_id ON public.class_memberships(student_id);
CREATE INDEX IF NOT EXISTS idx_class_memberships_class_id ON public.class_memberships(class_id);

-- Task assignments indexes
CREATE INDEX IF NOT EXISTS idx_task_assignments_student_id ON public.task_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON public.task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_status ON public.task_assignments(status);

-- Submissions indexes
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON public.submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_task_assignment_id ON public.submissions(task_assignment_id);

-- ============================================================================
-- UPDATE submit_task RPC TO VALIDATE CONTENT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.submit_task(
  p_task_id uuid,
  p_content text,
  p_attachment_path text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignment_id uuid;
  v_submission_id uuid;
  v_content_trimmed text;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Trim and validate content
  v_content_trimmed := trim(p_content);
  
  IF v_content_trimmed = '' THEN
    RAISE EXCEPTION 'Content cannot be empty';
  END IF;

  IF char_length(v_content_trimmed) > 5000 THEN
    RAISE EXCEPTION 'Content must be 5000 characters or less';
  END IF;

  -- Find the task assignment
  SELECT id INTO v_assignment_id
  FROM task_assignments
  WHERE task_id = p_task_id AND student_id = auth.uid();

  IF v_assignment_id IS NULL THEN
    RAISE EXCEPTION 'Task assignment not found';
  END IF;

  -- Upsert submission (use attachment_path, keep attachment_url for backward compatibility)
  INSERT INTO submissions (task_assignment_id, student_id, content, attachment_path)
  VALUES (v_assignment_id, auth.uid(), v_content_trimmed, p_attachment_path)
  ON CONFLICT (task_assignment_id)
  DO UPDATE SET
    content = EXCLUDED.content,
    attachment_path = EXCLUDED.attachment_path,
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

