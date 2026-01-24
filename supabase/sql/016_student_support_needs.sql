-- ============================================================================
-- STUDENT SUPPORT NEEDS AND UI PREFERENCES
-- ============================================================================
-- This migration creates two tables:
-- 1. student_support_needs: Teacher/admin only, stores sensitive diagnoses
-- 2. student_ui_prefs: Student can read own, teachers can manage
-- ============================================================================

-- ============================================================================
-- TABLE: student_support_needs
-- ============================================================================
-- Stores sensitive support needs information (teacher/admin only)
-- Students CANNOT read this table
CREATE TABLE IF NOT EXISTS student_support_needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id),
  dyslexia boolean NOT NULL DEFAULT false,
  adhd boolean NOT NULL DEFAULT false,
  autism boolean NOT NULL DEFAULT false,
  other_needs text NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_student_support_needs_student_id 
  ON student_support_needs(student_id);
CREATE INDEX IF NOT EXISTS idx_student_support_needs_created_by 
  ON student_support_needs(created_by);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_student_support_needs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER student_support_needs_updated_at
  BEFORE UPDATE ON student_support_needs
  FOR EACH ROW
  EXECUTE FUNCTION update_student_support_needs_updated_at();

-- ============================================================================
-- TABLE: student_ui_prefs
-- ============================================================================
-- Stores UI preferences that students can read (but not diagnoses)
CREATE TABLE IF NOT EXISTS student_ui_prefs (
  student_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  font_scale text NOT NULL DEFAULT 'md' CHECK (font_scale IN ('sm', 'md', 'lg', 'xl')),
  spacing text NOT NULL DEFAULT 'md' CHECK (spacing IN ('sm', 'md', 'lg')),
  reduce_clutter boolean NOT NULL DEFAULT false,
  simplified_language boolean NOT NULL DEFAULT false,
  high_contrast boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_student_ui_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER student_ui_prefs_updated_at
  BEFORE UPDATE ON student_ui_prefs
  FOR EACH ROW
  EXECUTE FUNCTION update_student_ui_prefs_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE student_support_needs ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_ui_prefs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: student_support_needs
-- ============================================================================
-- Students CANNOT access this table at all
-- Teachers can SELECT/UPSERT/UPDATE only for students in THEIR classes
-- Admins can do all

-- Teachers can SELECT support needs for students in their classes
CREATE POLICY "Teachers can view support needs for own class students"
  ON student_support_needs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role = 'teacher'
    )
    AND EXISTS (
      SELECT 1 FROM class_memberships cm
      INNER JOIN classes c ON c.id = cm.class_id
      WHERE cm.student_id = student_support_needs.student_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Admins can SELECT all
CREATE POLICY "Admins can view all support needs"
  ON student_support_needs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
    )
  );

-- Teachers can INSERT/UPSERT support needs for students in their classes
CREATE POLICY "Teachers can insert support needs for own class students"
  ON student_support_needs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role = 'teacher'
    )
    AND created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM class_memberships cm
      INNER JOIN classes c ON c.id = cm.class_id
      WHERE cm.student_id = student_support_needs.student_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Admins can INSERT all
CREATE POLICY "Admins can insert all support needs"
  ON student_support_needs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
    )
    AND created_by = auth.uid()
  );

-- Teachers can UPDATE support needs for students in their classes
CREATE POLICY "Teachers can update support needs for own class students"
  ON student_support_needs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role = 'teacher'
    )
    AND EXISTS (
      SELECT 1 FROM class_memberships cm
      INNER JOIN classes c ON c.id = cm.class_id
      WHERE cm.student_id = student_support_needs.student_id
      AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role = 'teacher'
    )
    AND EXISTS (
      SELECT 1 FROM class_memberships cm
      INNER JOIN classes c ON c.id = cm.class_id
      WHERE cm.student_id = student_support_needs.student_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Admins can UPDATE all
CREATE POLICY "Admins can update all support needs"
  ON student_support_needs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
    )
  );

-- ============================================================================
-- RLS POLICIES: student_ui_prefs
-- ============================================================================
-- Students can SELECT their own row (to apply UI)
-- Teachers can SELECT/UPSERT/UPDATE for students in their classes
-- Admins can do all

-- Students can SELECT their own UI prefs
CREATE POLICY "Students can view own UI prefs"
  ON student_ui_prefs
  FOR SELECT
  USING (student_id = auth.uid());

-- Teachers can SELECT UI prefs for students in their classes
CREATE POLICY "Teachers can view UI prefs for own class students"
  ON student_ui_prefs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role = 'teacher'
    )
    AND EXISTS (
      SELECT 1 FROM class_memberships cm
      INNER JOIN classes c ON c.id = cm.class_id
      WHERE cm.student_id = student_ui_prefs.student_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Admins can SELECT all
CREATE POLICY "Admins can view all UI prefs"
  ON student_ui_prefs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
    )
  );

-- Teachers can INSERT/UPSERT UI prefs for students in their classes
CREATE POLICY "Teachers can insert UI prefs for own class students"
  ON student_ui_prefs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role = 'teacher'
    )
    AND EXISTS (
      SELECT 1 FROM class_memberships cm
      INNER JOIN classes c ON c.id = cm.class_id
      WHERE cm.student_id = student_ui_prefs.student_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Students can INSERT their own UI prefs
CREATE POLICY "Students can insert own UI prefs"
  ON student_ui_prefs
  FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Admins can INSERT all
CREATE POLICY "Admins can insert all UI prefs"
  ON student_ui_prefs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
    )
  );

-- Teachers can UPDATE UI prefs for students in their classes
CREATE POLICY "Teachers can update UI prefs for own class students"
  ON student_ui_prefs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role = 'teacher'
    )
    AND EXISTS (
      SELECT 1 FROM class_memberships cm
      INNER JOIN classes c ON c.id = cm.class_id
      WHERE cm.student_id = student_ui_prefs.student_id
      AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role = 'teacher'
    )
    AND EXISTS (
      SELECT 1 FROM class_memberships cm
      INNER JOIN classes c ON c.id = cm.class_id
      WHERE cm.student_id = student_ui_prefs.student_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Students can UPDATE their own UI prefs
CREATE POLICY "Students can update own UI prefs"
  ON student_ui_prefs
  FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Admins can UPDATE all
CREATE POLICY "Admins can update all UI prefs"
  ON student_ui_prefs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
    )
  );

-- ============================================================================
-- NOTES
-- ============================================================================
-- Security:
-- - Students CANNOT read student_support_needs (no policies allow it)
-- - Students CAN read their own student_ui_prefs (to apply UI)
-- - Teachers can manage both for students in their classes only
-- - Admins have full access to both tables
--
-- RLS policies use EXISTS subqueries to avoid recursion:
-- - Check role via profiles table
-- - Check class membership via class_memberships + classes tables
-- - No direct queries to the same table being protected
-- ============================================================================
