-- ============================================================================
-- AUTOMATIC PROFILE CREATION FROM AUTH METADATA
-- ============================================================================
-- This trigger automatically creates a profile when a user signs up
-- using the metadata passed during signUp (role, full_name)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NULLIF(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- NOTES
-- ============================================================================
-- This trigger will automatically create a profile when:
-- 1. User signs up via supabase.auth.signUp() with metadata:
--    options: { data: { role: 'student' | 'teacher', full_name: '...' } }
-- 2. User confirms their email (if email confirmation is enabled)
-- 3. Profile is created with role from metadata (defaults to 'student' if missing)
-- 4. Profile is created with full_name from metadata (can be null)
--
-- The trigger uses SECURITY DEFINER to bypass RLS when inserting into profiles.
-- This ensures profiles are created even if the user hasn't confirmed their email yet.

