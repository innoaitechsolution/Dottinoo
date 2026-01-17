# Bug Fix: PostgREST Order Parse Error

## Root Cause
PostgREST doesn't support dot notation (`tasks.due_date`) for ordering foreign table columns. When using supabase-js, we must use the `foreignTable` option instead.

## Where It Was Called

### 1. Student Task List (Main Issue)
- **File:** `src/lib/supabase/tasks.ts`
- **Line:** 100
- **Function:** `listTasksForStudent()`
- **Used by:** `/app/tasks` page (student view), "View Tasks" from student dashboard

### 2. Student Next Tasks (Dashboard)
- **File:** `src/lib/supabase/dashboard.ts`
- **Line:** 130
- **Function:** `listStudentNextTasks()`
- **Used by:** `/app/student` dashboard (next tasks widget)

## Error Message
```
failed to parse order (tasks.due_date.asc.nullslast,created_at.desc)
unexpected "d" expecting "asc", "desc", "nullsfirst" or "nullslast"
```

PostgREST was trying to parse `tasks.due_date.asc.nullslast` but expected either:
- Parentheses notation: `tasks(due_date).asc.nullslast`
- Or supabase-js `foreignTable` option (preferred)

## Fix Applied

**Strategy:** Use supabase-js `foreignTable` option for ordering foreign table columns.

### Code Changes

#### File 1: `src/lib/supabase/tasks.ts` (Line 100)

**Before:**
```typescript
.order('tasks.due_date', { ascending: true, nullsFirst: false })
.order('created_at', { ascending: false })
```

**After:**
```typescript
.order('due_date', { foreignTable: 'tasks', ascending: true, nullsFirst: false })
.order('created_at', { ascending: false })
```

#### File 2: `src/lib/supabase/dashboard.ts` (Line 130)

**Before:**
```typescript
.order('tasks.due_date', { ascending: true, nullsFirst: false })
```

**After:**
```typescript
.order('due_date', { foreignTable: 'tasks', ascending: true, nullsFirst: false })
```

## Final Working Order Expression

**For `listTasksForStudent()`:**
```typescript
.order('due_date', { foreignTable: 'tasks', ascending: true, nullsFirst: false })
.order('created_at', { ascending: false })
```

**PostgREST equivalent:**
```
tasks(due_date).asc.nullslast,created_at.desc
```

**Sorting behavior:**
1. Primary: `tasks.due_date` ascending (NULLs last)
2. Secondary: `created_at` descending (newest first)
3. Tasks with NULL due_date appear after all dated tasks
4. Stable sorting by creation time for same due_date

## Verification

**Test the fix:**
1. ✅ Login as a student
2. ✅ Navigate to `/app/tasks` → Verify tasks load without parse error
3. ✅ Check sorting: tasks with due dates appear first (ascending), NULL due dates last
4. ✅ Verify `/app/student` dashboard → "Next Tasks" widget loads correctly
5. ✅ Click a task from the list → Verify `/app/tasks/[taskId]` opens normally
6. ✅ Verify RLS: student only sees their own assigned tasks

**Expected behavior:**
- Tasks sorted by due_date (ascending), NULLs last
- Secondary sort by created_at (descending) for same due_date
- All tasks visible (including NULL due_date)
- No PostgREST parse errors

## Status

✅ **FIXED** - Both ordering calls updated to use `foreignTable` option
- No database changes required
- No breaking changes to query results
- Sorting behavior preserved
- Ready for demo
