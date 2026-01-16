-- Ensure required extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  invite_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Class memberships table
CREATE TABLE IF NOT EXISTS class_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id)
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  instructions text NOT NULL,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  differentiation jsonb NOT NULL DEFAULT '{}'::jsonb,
  success_criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  due_date date NULL,
  creation_mode text NOT NULL DEFAULT 'manual' CHECK (creation_mode IN ('manual', 'template', 'ai')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Task assignments table
CREATE TABLE IF NOT EXISTS task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'submitted', 'reviewed')),
  feedback text NULL,
  stars_awarded int NOT NULL DEFAULT 0,
  reviewed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, student_id)
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger function to update updated_at on task_assignments
CREATE OR REPLACE FUNCTION update_task_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_assignments_updated_at
  BEFORE UPDATE ON task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_task_assignments_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - CLASSES
-- ============================================================================

-- Teacher can SELECT/INSERT/UPDATE/DELETE their own classes
CREATE POLICY "Teachers can manage own classes"
  ON classes
  FOR ALL
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Students can SELECT classes they are members of
CREATE POLICY "Students can view joined classes"
  ON classes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_memberships m
      WHERE m.class_id = classes.id AND m.student_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES - CLASS_MEMBERSHIPS
-- ============================================================================

-- Students can SELECT their own memberships
CREATE POLICY "Students can view own memberships"
  ON class_memberships
  FOR SELECT
  USING (student_id = auth.uid());

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

-- Teachers can INSERT memberships for their classes
CREATE POLICY "Teachers can add memberships to own classes"
  ON class_memberships
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = class_memberships.class_id AND c.teacher_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES - TASKS
-- ============================================================================

-- Teachers can SELECT/INSERT/UPDATE/DELETE tasks they created
CREATE POLICY "Teachers can manage own tasks"
  ON tasks
  FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Students can SELECT tasks for classes they belong to
CREATE POLICY "Students can view tasks in joined classes"
  ON tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_memberships m
      WHERE m.class_id = tasks.class_id AND m.student_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES - TASK_ASSIGNMENTS
-- ============================================================================

-- Students can SELECT their own assignments
CREATE POLICY "Students can view own assignments"
  ON task_assignments
  FOR SELECT
  USING (student_id = auth.uid());

-- Teachers can SELECT assignments for tasks they created
CREATE POLICY "Teachers can view assignments for own tasks"
  ON task_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_assignments.task_id AND t.created_by = auth.uid()
    )
  );

-- Teachers can UPDATE assignments for tasks they created (for feedback/stars)
CREATE POLICY "Teachers can update assignments for own tasks"
  ON task_assignments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_assignments.task_id AND t.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_assignments.task_id AND t.created_by = auth.uid()
    )
  );

-- ============================================================================
-- RPC FUNCTION - JOIN CLASS BY CODE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.join_class_by_code(p_invite_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_class_id uuid;
  v_task_id uuid;
BEGIN
  -- Find class by invite_code
  SELECT id INTO v_class_id
  FROM classes
  WHERE invite_code = p_invite_code;

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  -- Insert membership if not exists
  INSERT INTO class_memberships (class_id, student_id)
  VALUES (v_class_id, auth.uid())
  ON CONFLICT (class_id, student_id) DO NOTHING;

  -- Insert task_assignments for existing tasks in that class
  FOR v_task_id IN
    SELECT id FROM tasks WHERE class_id = v_class_id
  LOOP
    INSERT INTO task_assignments (task_id, student_id)
    VALUES (v_task_id, auth.uid())
    ON CONFLICT (task_id, student_id) DO NOTHING;
  END LOOP;

  RETURN v_class_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.join_class_by_code(text) TO authenticated;

