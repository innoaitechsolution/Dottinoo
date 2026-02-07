-- Migration 019: Allow teachers to read student profiles in their classes
-- ============================================================================
--
-- Problem:
--   The `profiles` table RLS only allows `auth.uid() = id` (users can view
--   their OWN profile). Teachers CANNOT see student profiles, so any query
--   that joins class_memberships → profiles returns 0 rows for teachers.
--   This breaks: student picker on Create Task, class management, reports, etc.
--
-- Fix:
--   Add a SECURITY DEFINER helper function + a new SELECT policy so teachers
--   can read profiles of students who are members of their classes.
--
-- Pattern: matches the existing helper functions in migration 008
--   (is_member_of_class, is_teacher_of_class).
--
-- Idempotent: CREATE OR REPLACE + DROP POLICY IF EXISTS.
-- ============================================================================

-- ── Helper function (SECURITY DEFINER — bypasses RLS on inner tables) ───────
CREATE OR REPLACE FUNCTION public.is_student_in_teacher_class(p_student_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM class_memberships cm
    JOIN classes c ON c.id = cm.class_id
    WHERE cm.student_id = p_student_id
      AND c.teacher_id = auth.uid()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_student_in_teacher_class(uuid) TO authenticated;

-- ── SELECT policy on profiles ───────────────────────────────────────────────
-- Teachers can view profiles of students in classes they own.
DROP POLICY IF EXISTS "Teachers can view student profiles in own classes" ON profiles;
CREATE POLICY "Teachers can view student profiles in own classes"
  ON profiles
  FOR SELECT
  USING (public.is_student_in_teacher_class(id));

-- Refresh PostgREST schema cache
SELECT pg_notify('pgrst', 'reload schema');
