-- ============================================================================
-- RPC FUNCTION - LIST STUDENT TASKS
-- ============================================================================
-- This migration creates a dedicated RPC function to list tasks assigned to
-- the current student, avoiding RLS recursion issues with nested selects.
--
-- Root Cause: The previous query used nested selects (task_assignments ->
-- tasks -> classes) which can trigger RLS recursion when policies check
-- cross-table relationships.
--
-- Solution: Use SECURITY DEFINER RPC that bypasses RLS for the query but
-- enforces security via WHERE ta.student_id = auth.uid() check.
-- ============================================================================

DROP FUNCTION IF EXISTS public.list_student_tasks();

CREATE OR REPLACE FUNCTION public.list_student_tasks()
RETURNS TABLE (
  assignment_id uuid,
  task_id uuid,
  class_id uuid,
  class_name text,
  title text,
  due_date date,
  status text,
  stars_awarded int,
  target_skill text,
  target_level text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ta.id as assignment_id,
    t.id as task_id,
    c.id as class_id,
    c.name as class_name,
    t.title,
    t.due_date,
    ta.status,
    ta.stars_awarded,
    t.target_skill,
    t.target_level,
    ta.created_at
  FROM task_assignments ta
  JOIN tasks t ON t.id = ta.task_id
  JOIN classes c ON c.id = t.class_id
  WHERE ta.student_id = auth.uid()
  ORDER BY COALESCE(t.due_date, now()::date) ASC, ta.created_at DESC;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.list_student_tasks() TO authenticated;

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================
-- This function uses SECURITY DEFINER, which means it runs with the privileges
-- of the function owner (typically postgres), bypassing RLS.
--
-- Security is enforced by:
-- 1. WHERE ta.student_id = auth.uid() - Only returns assignments for the
--    current authenticated user
-- 2. The function can only be called by authenticated users (GRANT EXECUTE)
--
-- This prevents:
-- - Students from seeing other students' tasks
-- - Any data leakage across user boundaries
--
-- The function returns all fields needed by the UI:
-- - assignment_id: For linking to submissions
-- - task_id: For navigation to task detail page
-- - class_id, class_name: For displaying class context
-- - title, due_date: Task information
-- - status: For StatusChip display
-- - stars_awarded: For showing stars
-- - created_at: For sorting
-- ============================================================================
