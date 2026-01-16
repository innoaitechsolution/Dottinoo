-- ============================================================================
-- FIX TASK ASSIGNMENTS ON CLASS JOIN
-- ============================================================================
-- This migration ensures that when a student joins a class by invite code,
-- task assignments are created for ALL existing tasks in that class.
--
-- Root Cause: The existing join_class_by_code function creates assignments
-- but uses a loop. This migration improves it to use a single INSERT...SELECT
-- and adds proper validation.
--
-- Also fixes: Demo seed (and any admin operations) that directly insert
-- memberships bypass the RPC, so assignments aren't created.
-- ============================================================================

-- ============================================================================
-- DROP AND RECREATE RPC FUNCTION (IDEMPOTENT)
-- ============================================================================

DROP FUNCTION IF EXISTS public.join_class_by_code(text);

-- ============================================================================
-- RPC FUNCTION - JOIN CLASS BY CODE (IMPROVED)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.join_class_by_code(p_invite_code text)
RETURNS TABLE(class_id uuid, class_name text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_class_id uuid;
  v_class_name text;
  v_user_role text;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user is a student (not teacher/admin)
  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = auth.uid();

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_user_role NOT IN ('student', 'external') THEN
    RAISE EXCEPTION 'Only students can join classes';
  END IF;

  -- Find class by invite_code (case-insensitive)
  SELECT id, name INTO v_class_id, v_class_name
  FROM classes
  WHERE LOWER(invite_code) = LOWER(p_invite_code);

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  -- Insert membership if not exists
  INSERT INTO class_memberships (class_id, student_id)
  VALUES (v_class_id, auth.uid())
  ON CONFLICT (class_id, student_id) DO NOTHING;

  -- Insert task_assignments for ALL existing tasks in that class
  -- Using single INSERT...SELECT for efficiency and atomicity
  INSERT INTO task_assignments (task_id, student_id, status)
  SELECT t.id, auth.uid(), 'not_started'
  FROM tasks t
  WHERE t.class_id = v_class_id
  ON CONFLICT (task_id, student_id) DO NOTHING;

  -- Return class info for UI confirmation
  RETURN QUERY SELECT v_class_id, v_class_name;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.join_class_by_code(text) TO authenticated;

-- ============================================================================
-- NOTES
-- ============================================================================
-- This migration fixes the issue where students who join a class after tasks
-- already exist don't see those tasks (because task_assignments weren't created).
--
-- Changes:
-- 1. Uses INSERT...SELECT instead of loop for better performance
-- 2. Validates caller is authenticated and is a student/external role
-- 3. Returns both class_id and class_name for UI confirmation
-- 4. Uses SECURITY DEFINER so it can insert task_assignments even though
--    students don't have direct INSERT permission (function runs with elevated
--    privileges)
--
-- The function now ensures:
-- - Membership is created (or already exists)
-- - ALL existing tasks get assignments created immediately
-- - New tasks created after join will get assignments via the existing
--   task creation flow in the UI
--
-- For demo seed: Since demo seed uses admin client and directly inserts
-- memberships, it should also directly insert task assignments. See the
-- updated demo seed route for the matching logic.
-- ============================================================================

