-- Migration 018: Add INSERT and DELETE RLS policies for task_assignments
-- ============================================================================
--
-- Problem:
--   Teachers can create tasks (INSERT into tasks) but cannot assign students
--   (INSERT into task_assignments) because no INSERT policy exists.
--   Error: "new row violates row-level security policy for table 'task_assignments' [42501]"
--
-- Fix:
--   1. Allow teachers to INSERT into task_assignments for tasks they own.
--   2. Allow teachers to DELETE assignments for tasks they own.
--   Both policies check: tasks.created_by = auth.uid()
--
-- Idempotent: uses DROP POLICY IF EXISTS before CREATE.
-- ============================================================================

-- ── INSERT policy for teachers ──────────────────────────────────────────────
-- Teachers can assign students ONLY to tasks they created.
DROP POLICY IF EXISTS "Teachers can insert assignments for own tasks" ON task_assignments;
CREATE POLICY "Teachers can insert assignments for own tasks"
  ON task_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_assignments.task_id
        AND t.created_by = auth.uid()
    )
  );

-- ── DELETE policy for teachers ──────────────────────────────────────────────
-- Teachers can remove assignments ONLY from tasks they created.
DROP POLICY IF EXISTS "Teachers can delete assignments for own tasks" ON task_assignments;
CREATE POLICY "Teachers can delete assignments for own tasks"
  ON task_assignments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_assignments.task_id
        AND t.created_by = auth.uid()
    )
  );

-- Refresh PostgREST schema cache so changes take effect immediately
SELECT pg_notify('pgrst', 'reload schema');
