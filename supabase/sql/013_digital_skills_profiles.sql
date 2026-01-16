-- ============================================================================
-- DIGITAL SKILLS PROFILES FOR STUDENTS
-- ============================================================================
-- This migration creates a table for tracking student digital skills profiles
-- per class, enabling teachers to personalize task assignments.
--
-- Skills: digital_safety, search_information, communication, productivity, ai_literacy
-- Levels: beginner, developing, confident
-- ============================================================================

-- Create student_skill_profiles table
CREATE TABLE IF NOT EXISTS student_skill_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  skill_key text NOT NULL CHECK (skill_key IN ('digital_safety', 'search_information', 'communication', 'productivity', 'ai_literacy')),
  level text NOT NULL CHECK (level IN ('beginner', 'developing', 'confident')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, class_id, skill_key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_skill_profiles_class_student 
  ON student_skill_profiles(class_id, student_id);

CREATE INDEX IF NOT EXISTS idx_student_skill_profiles_student 
  ON student_skill_profiles(student_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_student_skill_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER student_skill_profiles_updated_at
  BEFORE UPDATE ON student_skill_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_student_skill_profiles_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE student_skill_profiles ENABLE ROW LEVEL SECURITY;

-- Teachers can SELECT/INSERT/UPDATE profiles for students in their classes
CREATE POLICY "Teachers can manage skill profiles for own classes"
  ON student_skill_profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = student_skill_profiles.class_id AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = student_skill_profiles.class_id AND c.teacher_id = auth.uid()
    )
  );

-- Students can SELECT their own profiles
CREATE POLICY "Students can view own skill profiles"
  ON student_skill_profiles
  FOR SELECT
  USING (student_id = auth.uid());

-- ============================================================================
-- ADD TARGET SKILL COLUMNS TO TASKS TABLE
-- ============================================================================

-- Add optional target skill and level columns to tasks
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS target_skill text NULL CHECK (target_skill IS NULL OR target_skill IN ('digital_safety', 'search_information', 'communication', 'productivity', 'ai_literacy'));

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS target_level text NULL CHECK (target_level IS NULL OR target_level IN ('beginner', 'developing', 'confident'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_class_target_skill 
  ON tasks(class_id, target_skill) 
  WHERE target_skill IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_target_skill_level 
  ON tasks(target_skill, target_level) 
  WHERE target_skill IS NOT NULL AND target_level IS NOT NULL;

-- ============================================================================
-- NOTES
-- ============================================================================
-- This table allows teachers to set digital skills profiles for each student
-- in each class. Skills are tracked per class because a student's skill level
-- may vary by context or class subject.
--
-- Skills:
-- - digital_safety: Online safety, privacy, security
-- - search_information: Finding and evaluating information online
-- - communication: Email, messaging, professional communication
-- - productivity: File organization, tools, time management
-- - ai_literacy: Understanding and using AI tools responsibly
--
-- Levels:
-- - beginner: Just starting to learn
-- - developing: Making progress, needs support
-- - confident: Comfortable and independent
--
-- Teachers can update profiles at any time. The unique constraint ensures
-- one profile per student/class/skill combination.
-- ============================================================================
