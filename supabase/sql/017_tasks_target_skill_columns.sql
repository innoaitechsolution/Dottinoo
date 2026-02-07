-- ============================================================================
-- ADD TARGET SKILL COLUMNS TO TASKS TABLE (SAFE/IDEMPOTENT)
-- ============================================================================
-- Migration 013 bundles these columns with the skill profiles table, but they
-- may not have been applied in every environment. This standalone migration
-- ensures the columns exist so PostgREST can resolve them.
--
-- Both statements use IF NOT EXISTS, making this safe to run even if 013 was
-- already applied.
-- ============================================================================

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS target_skill text NULL;

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS target_level text NULL;

-- Optional CHECK constraints (safe to add; silently skipped if already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_target_skill_check'
  ) THEN
    ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_target_skill_check
    CHECK (target_skill IS NULL OR target_skill IN (
      'digital_safety', 'search_information', 'communication', 'productivity', 'ai_literacy'
    ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_target_level_check'
  ) THEN
    ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_target_level_check
    CHECK (target_level IS NULL OR target_level IN (
      'beginner', 'developing', 'confident'
    ));
  END IF;
END $$;

-- Indexes (IF NOT EXISTS is built in)
CREATE INDEX IF NOT EXISTS idx_tasks_class_target_skill
  ON public.tasks(class_id, target_skill)
  WHERE target_skill IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_target_skill_level
  ON public.tasks(target_skill, target_level)
  WHERE target_skill IS NOT NULL AND target_level IS NOT NULL;

-- ============================================================================
-- POST-MIGRATION: REFRESH POSTGREST SCHEMA CACHE
-- ============================================================================
-- After running this migration you must refresh the PostgREST schema cache
-- so the new columns are visible to the API:
--
--   Hosted Supabase (dashboard):
--     Run in SQL Editor:  SELECT pg_notify('pgrst', 'reload schema');
--     Or use the API: POST /rest/v1/rpc/reload_schema (if available)
--
--   Local supabase CLI:
--     supabase stop && supabase start
--
-- Without this step PostgREST will return:
--   "Could not find the 'target_level' column of 'tasks' in the schema cache"
-- ============================================================================

-- Emit the reload notification automatically when this migration runs:
SELECT pg_notify('pgrst', 'reload schema');
