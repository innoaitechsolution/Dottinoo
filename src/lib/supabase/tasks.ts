'use client'

import { supabase } from './client'

export interface Task {
  id: string
  class_id: string
  created_by: string
  title: string
  instructions: string
  steps: any[]
  differentiation: any
  success_criteria: any[]
  due_date: string | null
  creation_mode: 'manual' | 'template' | 'ai'
  /** Added by migration 013; may be absent if 013 is not applied. */
  target_skill?: string | null
  /** Added by migration 013; may be absent if 013 is not applied. */
  target_level?: string | null
  created_at: string
}

export interface TaskWithClass extends Task {
  classes?: {
    id: string
    name: string
  }
}

export interface TaskWithStatus extends TaskWithClass {
  assignmentStatus?: 'not_started' | 'in_progress' | 'submitted' | 'reviewed'
  starsAwarded?: number
}

export interface TaskWithCounts extends TaskWithClass {
  submittedCount?: number
  reviewedCount?: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Base columns that always exist on the tasks table (migration 002).
 * target_skill and target_level are optional (migration 013/017).
 */
const TASKS_BASE_COLUMNS = 'id, class_id, created_by, title, instructions, steps, differentiation, success_criteria, due_date, creation_mode, created_at'

// ---------------------------------------------------------------------------
// In-memory cache (module-level, per browser tab)
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  data: T
  ts: number
}

const CACHE_TTL_MS = 45_000 // 45 seconds

const teacherTasksCache = new Map<string, CacheEntry<TaskWithClass[]>>()
const submissionCountsCache = new Map<string, CacheEntry<Record<string, { submitted: number; reviewed: number }>>>()

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) return entry.data
  cache.delete(key)
  return null
}

function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
  cache.set(key, { data, ts: Date.now() })
}

/** Invalidate caches (call after creating/editing a task). */
export function invalidateTaskCaches(): void {
  teacherTasksCache.clear()
  submissionCountsCache.clear()
}

// ---------------------------------------------------------------------------
// Dev-only perf helpers
// ---------------------------------------------------------------------------

const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development'

function perfStart(label: string): number {
  if (isDev && typeof performance !== 'undefined') return performance.now()
  return 0
}

function perfEnd(label: string, start: number): void {
  if (isDev && typeof performance !== 'undefined' && start > 0) {
    const ms = (performance.now() - start).toFixed(1)
    console.log(`[perf] ${label}: ${ms}ms`)
  }
}

// ---------------------------------------------------------------------------
// Teacher tasks
// ---------------------------------------------------------------------------

/**
 * List tasks for a teacher (tasks they created).
 * Uses flat queries (no embedded joins) to avoid PostgREST 400s.
 * Accepts optional userId to skip redundant getUser() when caller already has it.
 */
export async function listTasksForTeacher(userId?: string): Promise<{ data: TaskWithClass[] | null; error: any }> {
  let uid = userId
  if (!uid) {
    const { data: { user } } = await supabase.auth.getUser()
    uid = user?.id
  }
  if (!uid) {
    return { data: null, error: { message: 'Not authenticated' } }
  }

  // Check cache
  const cached = getCached(teacherTasksCache, uid)
  if (cached) {
    if (isDev) console.log('[perf] listTasksForTeacher: cache hit')
    return { data: cached, error: null }
  }

  const t0 = perfStart('listTasksForTeacher total')

  try {
    // First try with optional target columns
    let data: any[] | null = null
    let error: any = null

    const tQuery = perfStart('tasks query')
    {
      const res = await supabase
        .from('tasks')
        .select(`${TASKS_BASE_COLUMNS}, target_skill, target_level`)
        .eq('created_by', uid)
        .order('created_at', { ascending: false })
      data = res.data
      error = res.error
    }

    // Fallback: if target_skill/target_level columns don't exist, retry without them
    if (error && (error.message?.includes('target_skill') || error.message?.includes('target_level'))) {
      if (isDev) console.warn('[listTasksForTeacher] target columns missing, retrying without them')
      const retry = await supabase
        .from('tasks')
        .select(TASKS_BASE_COLUMNS)
        .eq('created_by', uid)
        .order('created_at', { ascending: false })
      data = retry.data
      error = retry.error
    }
    perfEnd('tasks query', tQuery)

    if (error) {
      if (isDev) console.warn('[listTasksForTeacher] Query error:', error.message, error.code, error.details, error.hint)
      return { data: null, error }
    }

    // Get class names separately (flat lookup, no embedded join)
    const classIds = [...new Set((data || []).map((t: any) => t.class_id).filter(Boolean))]
    const classesMap = new Map<string, string>()

    if (classIds.length > 0) {
      const tClass = perfStart('classes lookup')
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name')
        .in('id', classIds)
      perfEnd('classes lookup', tClass)

      for (const c of classesData || []) {
        classesMap.set(c.id, c.name)
      }
    }

    // Attach class info
    const tasks: TaskWithClass[] = (data || []).map((t: any) => ({
      ...t,
      target_skill: t.target_skill ?? null,
      target_level: t.target_level ?? null,
      classes: t.class_id ? { id: t.class_id, name: classesMap.get(t.class_id) || 'Unknown Class' } : undefined,
    }))

    perfEnd('listTasksForTeacher total', t0)

    // Populate cache
    setCache(teacherTasksCache, uid, tasks)

    return { data: tasks, error: null }
  } catch (err: any) {
    return { data: null, error: { message: err.message || 'Failed to load teacher tasks' } }
  }
}

// ---------------------------------------------------------------------------
// Batch submission counts (replaces serial per-task calls)
// ---------------------------------------------------------------------------

/**
 * Get submission counts for ALL of a teacher's tasks in ONE query.
 * Returns a map of taskId → { submitted, reviewed }.
 * Accepts optional userId to skip redundant getUser().
 */
export async function getBatchSubmissionCounts(
  taskIds: string[],
  userId?: string
): Promise<{ data: Record<string, { submitted: number; reviewed: number }> | null; error: any }> {
  if (taskIds.length === 0) return { data: {}, error: null }

  let uid = userId
  if (!uid) {
    const { data: { user } } = await supabase.auth.getUser()
    uid = user?.id
  }
  if (!uid) return { data: null, error: { message: 'Not authenticated' } }

  // Check cache
  const cacheKey = uid
  const cached = getCached(submissionCountsCache, cacheKey)
  if (cached) {
    if (isDev) console.log('[perf] getBatchSubmissionCounts: cache hit')
    return { data: cached, error: null }
  }

  const t0 = perfStart('batch submission counts')

  try {
    // One query: get all assignments for these task IDs
    const { data: assignments, error } = await supabase
      .from('task_assignments')
      .select('task_id, status')
      .in('task_id', taskIds)

    perfEnd('batch submission counts', t0)

    if (error) {
      if (isDev) console.warn('[getBatchSubmissionCounts]', error.message, error.code)
      return { data: null, error }
    }

    // Tally counts per task
    const counts: Record<string, { submitted: number; reviewed: number }> = {}
    for (const id of taskIds) {
      counts[id] = { submitted: 0, reviewed: 0 }
    }
    for (const a of assignments || []) {
      const entry = counts[a.task_id]
      if (!entry) continue
      if (a.status === 'submitted') entry.submitted++
      if (a.status === 'reviewed') entry.reviewed++
    }

    setCache(submissionCountsCache, cacheKey, counts)
    return { data: counts, error: null }
  } catch (err: any) {
    return { data: null, error: { message: err.message || 'Failed to load counts' } }
  }
}

/**
 * List tasks for a student (ONLY tasks explicitly assigned to them via task_assignments)
 * Uses direct query with nested selects (same pattern as listStudentNextTasks)
 */
export async function listTasksForStudent(): Promise<{ data: TaskWithStatus[] | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } }
  }

  try {
    if (isDev) console.log(`[listTasksForStudent] Fetching assignments for user.id=${user.id}`)

    // Get student's assignments (flat select — no embedded join to avoid 400s from schema/RLS issues)
    const { data, error } = await supabase
      .from('task_assignments')
      .select('id, task_id, status, stars_awarded, created_at')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      if (isDev) console.warn('[listTasksForStudent] task_assignments query error:', error.message, error.code, error.details, error.hint)
      return { data: null, error }
    }

    if (isDev) console.log(`[listTasksForStudent] Found ${(data || []).length} assignment rows`)

    if (!data || data.length === 0) {
      // No assignments at all — return empty immediately
      return { data: [], error: null }
    }

    // Get task details separately
    const taskIds = [...new Set(data.map((d: any) => d.task_id))]

    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select(TASKS_BASE_COLUMNS)
      .in('id', taskIds)

    if (tasksError) {
      if (isDev) console.warn('[listTasksForStudent] tasks query error:', tasksError.message, tasksError.code, tasksError.details, tasksError.hint)
    }

    const taskMap = new Map<string, any>()
    for (const t of tasksData || []) {
      taskMap.set(t.id, t)
    }

    if (isDev) {
      const resolved = taskIds.filter(id => taskMap.has(id)).length
      const missing = taskIds.filter(id => !taskMap.has(id))
      console.log(`[listTasksForStudent] Resolved ${resolved}/${taskIds.length} tasks`)
      if (missing.length > 0) console.warn('[listTasksForStudent] Could not load task details for IDs (RLS?):', missing)
    }

    // Get class names separately
    const classIds = [...new Set([...taskMap.values()].map((t: any) => t.class_id).filter(Boolean))]
    const classesMap = new Map<string, string>()

    if (classIds.length > 0) {
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name')
        .in('id', classIds)

      for (const c of classesData || []) {
        classesMap.set(c.id, c.name)
      }
    }

    // Transform to TaskWithStatus format
    const tasks: TaskWithStatus[] = data.map((item: any) => {
      const t = taskMap.get(item.task_id)
      return {
        id: t?.id || item.task_id,
        class_id: t?.class_id || '',
        created_by: t?.created_by || '',
        title: t?.title || 'Unknown Task',
        instructions: t?.instructions || '',
        steps: t?.steps || [],
        differentiation: t?.differentiation || {},
        success_criteria: t?.success_criteria || [],
        due_date: t?.due_date || null,
        creation_mode: (t?.creation_mode || 'manual') as 'manual' | 'template' | 'ai',
        target_skill: t?.target_skill ?? null,
        target_level: t?.target_level ?? null,
        created_at: t?.created_at || item.created_at,
        classes: t?.class_id ? {
          id: t.class_id,
          name: classesMap.get(t.class_id) || 'Unknown Class',
        } : undefined,
        assignmentStatus: item.status as 'not_started' | 'in_progress' | 'submitted' | 'reviewed',
        starsAwarded: item.stars_awarded || 0,
      }
    })

    if (isDev) console.log(`[listTasksForStudent] Returning ${tasks.length} tasks`)
    return { data: tasks, error: null }
  } catch (err: any) {
    if (isDev) console.error('[listTasksForStudent] Unexpected error:', err)
    return { data: null, error: { message: err.message || 'Failed to load student tasks' } }
  }
}

/**
 * Get assignment status for a student's task
 */
export async function getAssignmentStatusForTask(
  taskId: string
): Promise<{ data: { status: string; stars_awarded: number } | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } }
  }

  const { data, error } = await supabase
    .from('task_assignments')
    .select('status, stars_awarded')
    .eq('task_id', taskId)
    .eq('student_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    return { data: null, error }
  }

  return { data: data || null, error: null }
}

/**
 * Get submission counts for a teacher's task
 */
export async function getSubmissionCountsForTask(
  taskId: string
): Promise<{ data: { submitted: number; reviewed: number } | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } }
  }

  // Verify task belongs to teacher
  const { data: task } = await supabase
    .from('tasks')
    .select('created_by')
    .eq('id', taskId)
    .single()

  if (!task || task.created_by !== user.id) {
    return { data: null, error: { message: 'Task not found or access denied' } }
  }

  const { count: submittedCount } = await supabase
    .from('task_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('task_id', taskId)
    .eq('status', 'submitted')

  const { count: reviewedCount } = await supabase
    .from('task_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('task_id', taskId)
    .eq('status', 'reviewed')

  return {
    data: {
      submitted: submittedCount || 0,
      reviewed: reviewedCount || 0,
    },
    error: null,
  }
}
