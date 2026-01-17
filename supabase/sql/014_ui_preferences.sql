-- ============================================================================
-- UI PREFERENCES FOR STUDENTS
-- ============================================================================
-- This migration adds a ui_preferences JSONB column to profiles table
-- for storing student accessibility and UI customization settings.

-- Add ui_preferences column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS ui_preferences jsonb DEFAULT NULL;

-- Add index for faster queries (optional, but helpful if filtering by preferences)
CREATE INDEX IF NOT EXISTS idx_profiles_ui_preferences 
  ON profiles USING gin (ui_preferences);

-- ============================================================================
-- NOTES
-- ============================================================================
-- ui_preferences structure:
-- {
--   "colorTheme": "default" | "high-contrast" | "pastel" | "dyslexia-friendly",
--   "fontSize": "small" | "medium" | "large",
--   "lineSpacing": "normal" | "relaxed" | "loose",
--   "letterCase": "normal" | "lowercase" | "uppercase",
--   "simplifiedLayout": boolean
-- }
--
-- This allows students to customize their UI experience for accessibility
-- and personal preference. Settings are persisted per user.
-- ============================================================================
