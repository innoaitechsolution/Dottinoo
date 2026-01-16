-- ============================================================================
-- FIX RLS RECURSION FOR CLASSES AND CLASS_MEMBERSHIPS
-- ============================================================================
-- This migration fixes the "infinite recursion detected in policy" error
-- by using SECURITY DEFINER helper functions to break the circular dependency
-- between classes and class_memberships RLS policies.
--
-- Root Cause: Policies on classes check class_memberships, and policies on
-- class_memberships check classes, creating infinite recursion during RLS
-- evaluation.
--
-- Solution: Use SECURITY DEFINER functions that bypass RLS when checking
-- the other table, breaking the recursion cycle.
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS (SECURITY DEFINER - BYPASS RLS)
-- ============================================================================

-- Function to check if current user is a member of a class
CREATE OR REPLACE FUNCTION public.is_member_of_class(p_class_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM class_memberships
    WHERE class_id = p_class_id AND student_id = auth.uid()
  );
END;
$$;

-- Function to check if current user is the teacher of a class
CREATE OR REPLACE FUNCTION public.is_teacher_of_class(p_class_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM classes
    WHERE id = p_class_id AND teacher_id = auth.uid()
  );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.is_member_of_class(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher_of_class(uuid) TO authenticated;

-- ============================================================================
-- DROP EXISTING POLICIES (IDEMPOTENT)
-- ============================================================================

-- Drop all policies on classes
DROP POLICY IF EXISTS "Teachers can select own classes" ON classes;
DROP POLICY IF EXISTS "Teachers can insert own classes" ON classes;
DROP POLICY IF EXISTS "Teachers can update own classes" ON classes;
DROP POLICY IF EXISTS "Teachers can delete own classes" ON classes;
DROP POLICY IF EXISTS "Students can view joined classes" ON classes;
DROP POLICY IF EXISTS "Teachers can manage own classes" ON classes;

-- Drop all policies on class_memberships
DROP POLICY IF EXISTS "Students can view own memberships" ON class_memberships;
DROP POLICY IF EXISTS "Teachers can view memberships for own classes" ON class_memberships;
DROP POLICY IF EXISTS "Teachers can add memberships to own classes" ON class_memberships;

-- ============================================================================
-- RLS POLICIES - CLASSES (NO RECURSION)
-- ============================================================================

-- Teachers can SELECT their own classes
CREATE POLICY "Teachers can select own classes"
  ON classes
  FOR SELECT
  USING (teacher_id = auth.uid());

-- Students can SELECT classes they are members of (using helper function to avoid recursion)
CREATE POLICY "Students can view joined classes"
  ON classes
  FOR SELECT
  USING (public.is_member_of_class(id));

-- Teachers can INSERT their own classes
CREATE POLICY "Teachers can insert own classes"
  ON classes
  FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

-- Teachers can UPDATE their own classes
CREATE POLICY "Teachers can update own classes"
  ON classes
  FOR UPDATE
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Teachers can DELETE their own classes
CREATE POLICY "Teachers can delete own classes"
  ON classes
  FOR DELETE
  USING (teacher_id = auth.uid());

-- ============================================================================
-- RLS POLICIES - CLASS_MEMBERSHIPS (NO RECURSION)
-- ============================================================================

-- Students can SELECT their own memberships
CREATE POLICY "Students can view own memberships"
  ON class_memberships
  FOR SELECT
  USING (student_id = auth.uid());

-- Teachers can SELECT memberships for their classes (using helper function to avoid recursion)
CREATE POLICY "Teachers can view memberships for own classes"
  ON class_memberships
  FOR SELECT
  USING (public.is_teacher_of_class(class_id));

-- Teachers can INSERT memberships for their classes (using helper function to avoid recursion)
CREATE POLICY "Teachers can add memberships to own classes"
  ON class_memberships
  FOR INSERT
  WITH CHECK (public.is_teacher_of_class(class_id));

-- ============================================================================
-- NOTES
-- ============================================================================
-- This migration fixes the infinite recursion error by:
-- 1. Creating SECURITY DEFINER helper functions that bypass RLS when checking
--    the other table, breaking the circular dependency
-- 2. Replacing direct table checks in policies with calls to these functions
--
-- The helper functions:
-- - is_member_of_class(p_class_id): Checks if auth.uid() is a student member
-- - is_teacher_of_class(p_class_id): Checks if auth.uid() is the teacher
--
-- Both functions use SECURITY DEFINER, so they run with the privileges of the
-- function owner (typically postgres) and bypass RLS, preventing recursion.
--
-- The join_class_by_code RPC function already uses SECURITY DEFINER, so it
-- will continue to work correctly with these new policies.
--
-- After running this migration:
-- - Teachers can SELECT their own classes (no recursion)
-- - Students can SELECT classes they are members of (no recursion)
-- - Teachers can SELECT memberships for their classes (no recursion)
-- - Students can SELECT their own memberships (no recursion)
-- - All INSERT/UPDATE/DELETE operations remain properly secured
-- ============================================================================

