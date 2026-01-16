-- ============================================================================
-- STUDENT PROFILE TAGS FOR PERSONALIZATION
-- ============================================================================
-- This migration adds optional fields to profiles table for student
-- personalization without using sensitive medical data.
--
-- Fields added:
-- - support_needs_tags: text[] - Array of support need tags (e.g., 'visual_aids', 'extra_time')
-- - digital_skill_level: text - Skill level ('starter', 'intermediate', 'advanced')
-- - interests: text[] - Array of student interests (optional)
-- ============================================================================

-- Add support_needs_tags column (array of text)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS support_needs_tags text[] DEFAULT NULL;

-- Add digital_skill_level column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS digital_skill_level text DEFAULT NULL;

-- Add interests column (array of text, optional)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS interests text[] DEFAULT NULL;

-- Add check constraint for digital_skill_level
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_digital_skill_level_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_digital_skill_level_check
CHECK (digital_skill_level IS NULL OR digital_skill_level IN ('starter', 'intermediate', 'advanced'));

-- ============================================================================
-- NOTES
-- ============================================================================
-- These fields are optional and can be used for:
-- 1. Teacher personalization when assigning tasks
-- 2. Demo seed to create diverse student profiles
-- 3. Future AI-assisted task recommendations
--
-- Example values:
-- support_needs_tags: ARRAY['visual_aids', 'extra_time', 'quiet_space']
-- digital_skill_level: 'intermediate'
-- interests: ARRAY['coding', 'art', 'music']
--
-- These fields do NOT contain sensitive medical information and are
-- intended for educational personalization only.
-- ============================================================================
