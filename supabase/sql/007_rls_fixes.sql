-- ============================================================================
-- RLS FIXES FOR CLASSES AND CLASS_MEMBERSHIPS
-- ============================================================================
-- This migration ensures teachers can SELECT their own classes and
-- class memberships, fixing the issue where classes fail to load after
-- demo seed or manual class creation.
--
-- Root Cause: The existing "FOR ALL" policy should work, but we're adding
-- explicit SELECT policies to ensure proper access control.
-- ============================================================================

-- Drop existing policies if they exist (to recreate them properly)
DROP POLICY IF EXISTS "Teachers can manage own classes" ON classes;
DROP POLICY IF EXISTS "Teachers can view memberships for own classes" ON class_memberships;

-- ============================================================================
-- RLS POLICIES - CLASSES (EXPLICIT POLICIES)
-- ============================================================================

-- Teachers can SELECT their own classes
CREATE POLICY "Teachers can select own classes"
  ON classes
  FOR SELECT
  USING (teacher_id = auth.uid());

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

-- Students can SELECT classes they are members of (keep existing)
-- This policy should already exist, but we ensure it's there
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'classes' 
    AND policyname = 'Students can view joined classes'
  ) THEN
    CREATE POLICY "Students can view joined classes"
      ON classes
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM class_memberships m
          WHERE m.class_id = classes.id AND m.student_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================================
-- RLS POLICIES - CLASS_MEMBERSHIPS (EXPLICIT POLICIES)
-- ============================================================================

-- Teachers can SELECT memberships for their classes
CREATE POLICY "Teachers can view memberships for own classes"
  ON class_memberships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = class_memberships.class_id AND c.teacher_id = auth.uid()
    )
  );

-- Students can SELECT their own memberships (keep existing)
-- This policy should already exist, but we ensure it's there
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'class_memberships' 
    AND policyname = 'Students can view own memberships'
  ) THEN
    CREATE POLICY "Students can view own memberships"
      ON class_memberships
      FOR SELECT
      USING (student_id = auth.uid());
  END IF;
END $$;

-- Teachers can INSERT memberships for their classes (keep existing)
-- This policy should already exist, but we ensure it's there
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'class_memberships' 
    AND policyname = 'Teachers can add memberships to own classes'
  ) THEN
    CREATE POLICY "Teachers can add memberships to own classes"
      ON class_memberships
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM classes c
          WHERE c.id = class_memberships.class_id AND c.teacher_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================
-- This migration fixes the issue where teachers cannot view their classes
-- after creating them (either via demo seed or manually).
--
-- The fix replaces the "FOR ALL" policy with explicit SELECT, INSERT, UPDATE,
-- DELETE policies. This ensures proper RLS evaluation and access control.
--
-- After running this migration:
-- - Teachers can SELECT their own classes (via listMyClasses)
-- - Teachers can SELECT class memberships for their classes
-- - Students can still SELECT their own memberships and joined classes
-- - All other existing policies remain intact
-- ============================================================================

