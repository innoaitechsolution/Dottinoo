-- Update submit_task RPC to use attachment_path
-- This should be run after 003_task_flow_submissions_ai.sql and 004_storage_attachments.sql

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

  -- Upsert submission (use attachment_path, keep attachment_url for backward compatibility)
  INSERT INTO submissions (task_assignment_id, student_id, content, attachment_path)
  VALUES (v_assignment_id, auth.uid(), p_content, p_attachment_path)
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

