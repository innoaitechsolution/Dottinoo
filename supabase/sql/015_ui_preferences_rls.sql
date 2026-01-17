-- ============================================================================
-- RLS POLICY FOR UI_PREFERENCES UPDATE
-- ============================================================================
-- Ensure users can update their own ui_preferences column
-- This migration should be run after 014_ui_preferences.sql
-- ============================================================================

-- Policy: Users can UPDATE their own ui_preferences
-- The existing "Users can update own profile" policy should cover this,
-- but we ensure it explicitly allows ui_preferences updates

-- Check if the policy exists and update it, or create a new one
-- Note: If the existing policy uses FOR ALL, it should already cover ui_preferences
-- This is a safety check to ensure ui_preferences is explicitly allowed

-- Drop existing update policy if it's too restrictive
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create a more explicit policy that includes ui_preferences
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- To verify this works, run as a signed-in student:
-- UPDATE profiles SET ui_preferences = '{"colorTheme": "high-contrast"}'::jsonb WHERE id = auth.uid();
-- Should succeed without RLS errors.
-- ============================================================================
