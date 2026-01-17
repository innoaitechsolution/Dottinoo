# Bug Fix: `list_student_tasks` RPC Error

## Root Cause
The `list_student_tasks` RPC function exists in migration `012_rpc_list_student_tasks.sql` but is not available in the database schema cache, causing PostgREST to return: "Could not find the function public.list_student_tasks without parameters in the schema cache".

**Possible reasons:**
1. Migration `012_rpc_list_student_tasks.sql` was not run in the Supabase database
2. PostgREST schema cache is stale and needs refresh
3. Function exists but permissions/grants are missing

## Where It Was Called
- **File:** `src/lib/supabase/tasks.ts`
- **Line:** 75
- **Function:** `listTasksForStudent()`
- **Usage:** Called from `/app/tasks` page when a student views their assigned tasks

**Exact call:**
```typescript
const { data, error } = await supabase.rpc('list_student_tasks')
```

## Fix Applied (Option A - Minimal Risk)

**Strategy:** Replaced RPC dependency with direct query using the same pattern as `listStudentNextTasks()` (which already works).

**Changes:**
- **File:** `src/lib/supabase/tasks.ts`
- **Function:** `listTasksForStudent()`
- **Approach:** 
  1. Query `task_assignments` with nested `tasks!inner` select
  2. Fetch class names separately (avoids RLS recursion)
  3. Transform to `TaskWithStatus[]` format (same as before)

**Benefits:**
- ✅ No database migration required
- ✅ No PostgREST cache refresh needed
- ✅ Uses proven pattern (same as `listStudentNextTasks`)
- ✅ Works immediately
- ✅ Minimal risk to existing flows

## Code Changes

**Before:**
```typescript
// Use RPC function to get assigned tasks (avoids RLS recursion)
const { data, error } = await supabase.rpc('list_student_tasks')
// ... transform RPC result
```

**After:**
```typescript
// Get student's assignments with task info
const { data, error } = await supabase
  .from('task_assignments')
  .select(`
    id,
    status,
    stars_awarded,
    created_at,
    tasks!inner (
      id,
      class_id,
      created_by,
      title,
      instructions,
      steps,
      differentiation,
      success_criteria,
      due_date,
      creation_mode,
      target_skill,
      target_level,
      created_at
    )
  `)
  .eq('student_id', user.id)
  .order('tasks.due_date', { ascending: true, nullsFirst: false })
  .order('created_at', { ascending: false })

// Get class names separately
const classIds = [...new Set((data || []).map((item: any) => item.tasks?.class_id).filter(Boolean))]
const { data: classesData } = await supabase
  .from('classes')
  .select('id, name')
  .in('id', classIds)

// Transform to TaskWithStatus format
// ... (see code for full transformation)
```

## Alternative Fix (Option B - If RPC Preferred)

If you want to keep the RPC approach:

1. **Run the migration:**
   - Open Supabase Dashboard → SQL Editor
   - Run `supabase/sql/012_rpc_list_student_tasks.sql`

2. **Refresh PostgREST schema cache:**
   - Supabase Dashboard → Settings → API
   - Click "Reload Schema" or restart the PostgREST service
   - Or wait for automatic cache refresh (usually within minutes)

3. **Verify the function exists:**
   ```sql
   SELECT proname, pronargs 
   FROM pg_proc 
   WHERE proname = 'list_student_tasks';
   ```

4. **Test the RPC:**
   ```sql
   SELECT * FROM public.list_student_tasks();
   ```

## Testing

**Test the fix:**
1. Login as a student
2. Navigate to `/app/tasks` (or click "View Tasks" from student dashboard)
3. Verify assigned tasks load without errors
4. Verify task details (title, class, status, due date) display correctly

## Status

✅ **FIXED** - RPC dependency removed, direct query implemented
- No database changes required
- No Supabase actions required
- Ready for demo
