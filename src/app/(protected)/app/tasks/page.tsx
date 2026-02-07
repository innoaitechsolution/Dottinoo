'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { getMyProfile, Profile } from '@/lib/supabase/profile'
import { listTasksForTeacher, listTasksForStudent, TaskWithClass, getBatchSubmissionCounts } from '@/lib/supabase/tasks'
import { DIGITAL_SKILLS, SKILL_LEVELS } from '@/lib/supabase/skillProfiles'
import { useStudentUiPrefs, getUiPrefsClasses } from '@/lib/ui/useStudentUiPrefs'
import StatusChip from '@/components/StatusChip'
import Button from '@/components/Button'
import BackButton from '@/components/BackButton'
import styles from './page.module.css'

const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development'

// ---------------------------------------------------------------------------
// Skeleton placeholder rendered while tasks are loading
// ---------------------------------------------------------------------------
function TaskSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={styles.tasksList}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${styles.taskCard} ${styles.skeleton}`} aria-hidden>
          <div className={styles.taskHeader}>
            <div className={styles.skeletonLine} style={{ width: '55%', height: '1.2rem' }} />
            <div className={styles.skeletonLine} style={{ width: '90px', height: '1rem' }} />
          </div>
          <div className={styles.taskInfoRow}>
            <div className={styles.skeletonLine} style={{ width: '120px', height: '0.85rem' }} />
            <div className={styles.skeletonLine} style={{ width: '140px', height: '0.85rem', marginLeft: 'auto' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function TasksPage() {
  const router = useRouter()
  const didRun = useRef(false) // prevent double-run in StrictMode

  // --- Auth / profile ---
  const [profile, setProfile] = useState<Profile | null>(null)
  const [authReady, setAuthReady] = useState(false) // true once session + profile resolved

  // --- Tasks (primary data — shown as soon as available) ---
  const [tasks, setTasks] = useState<TaskWithClass[]>([])
  const [tasksLoading, setTasksLoading] = useState(true) // controls skeleton vs list
  const [tasksError, setTasksError] = useState<string | null>(null)

  // --- Submission counts (secondary — loaded progressively after tasks) ---
  const [taskCounts, setTaskCounts] = useState<Record<string, { submitted: number; reviewed: number }>>({})

  // --- Student statuses (already embedded in task data from listTasksForStudent) ---
  const [taskStatuses, setTaskStatuses] = useState<Record<string, { status: string; stars_awarded: number }>>({})

  // UI preferences for students
  const { prefs: uiPrefs } = useStudentUiPrefs()
  const uiPrefsClasses = getUiPrefsClasses(uiPrefs)

  // ------------------------------------------------------------------
  // Phase 1 + 2: Auth check → parallel profile + tasks fetch
  // ------------------------------------------------------------------
  const loadData = useCallback(async () => {
    const t0 = isDev && typeof performance !== 'undefined' ? performance.now() : 0

    try {
      // Phase 1: session check (must happen first for auth gate)
      const tAuth = isDev && typeof performance !== 'undefined' ? performance.now() : 0
      const { data: { session } } = await supabase.auth.getSession()
      if (isDev && tAuth > 0) console.log(`[perf] getSession: ${(performance.now() - tAuth).toFixed(1)}ms`)

      if (!session) {
        router.push('/login')
        return
      }

      const userId = session.user.id

      // Phase 2: profile + tasks in PARALLEL (no serial awaits)
      const tParallel = isDev && typeof performance !== 'undefined' ? performance.now() : 0

      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
        .then(res => res.data as Profile | null)

      // We don't know the role yet, but start the teacher fetch optimistically
      // (if student, we'll also fetch student tasks — the unused one is just wasted
      //  but usually the teacher dashboard sends teachers here, so it's a good bet)
      const teacherTasksPromise = listTasksForTeacher(userId)

      const [profileData, teacherResult] = await Promise.all([
        profilePromise,
        teacherTasksPromise,
      ])

      if (isDev && tParallel > 0) console.log(`[perf] parallel profile+tasks: ${(performance.now() - tParallel).toFixed(1)}ms`)

      if (!profileData) {
        router.push('/login')
        return
      }
      setProfile(profileData)
      setAuthReady(true)

      // --- Role-specific rendering ---
      if (profileData.role === 'teacher' || profileData.role === 'admin') {
        // Teacher: use the result we already have
        if (teacherResult.error) {
          setTasksError('Failed to load tasks')
          setTasksLoading(false)
          return
        }

        const teacherTasks = teacherResult.data || []
        setTasks(teacherTasks)
        setTasksLoading(false) // ← tasks list visible NOW

        // Phase 3 (progressive): load submission counts in background
        if (teacherTasks.length > 0) {
          const taskIds = teacherTasks.map(t => t.id)
          getBatchSubmissionCounts(taskIds, userId).then(({ data: counts }) => {
            if (counts) setTaskCounts(counts)
          })
        }
      } else {
        // Student / external: need student-specific query
        const tStudent = isDev && typeof performance !== 'undefined' ? performance.now() : 0
        const { data: tasksData, error: tasksError } = await listTasksForStudent()
        if (isDev && tStudent > 0) console.log(`[perf] listTasksForStudent: ${(performance.now() - tStudent).toFixed(1)}ms`)

        if (tasksError) {
          const msg = tasksError.message || 'Failed to load tasks'
          const details = tasksError.details ? ` (${tasksError.details})` : ''
          const hint = tasksError.hint ? ` Hint: ${tasksError.hint}` : ''
          setTasksError(`Failed to load tasks: ${msg}${details}${hint}`)
          setTasks([])
        } else {
          setTasks(tasksData || [])
          // Extract embedded statuses
          const statuses: Record<string, { status: string; stars_awarded: number }> = {}
          for (const task of tasksData || []) {
            if (task.assignmentStatus !== undefined) {
              statuses[task.id] = {
                status: task.assignmentStatus,
                stars_awarded: task.starsAwarded || 0,
              }
            }
          }
          setTaskStatuses(statuses)
        }
        setTasksLoading(false)
      }

      if (isDev && t0 > 0) console.log(`[perf] TasksPage total load: ${(performance.now() - t0).toFixed(1)}ms`)
    } catch (err: any) {
      if (isDev) console.error('[TasksPage] Error:', err?.message, err?.code, err?.details, err?.hint)
      setTasksError(err?.message || 'An unexpected error occurred')
      setTasksLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (didRun.current) return
    didRun.current = true
    loadData()
  }, [loadData])

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // ------------------------------------------------------------------
  // Render: immediate shell → skeleton → content
  // ------------------------------------------------------------------

  // The page shell (header + create button) renders IMMEDIATELY, no waiting
  const isTeacher = profile?.role === 'teacher' || profile?.role === 'admin'

  return (
    <div className={`${styles.container} ${uiPrefsClasses}`} data-font={uiPrefs?.font_scale} data-spacing={uiPrefs?.spacing}>
      <div className={styles.content}>
        <BackButton fallbackHref="/app" className={styles.backButton} />
        <div className={styles.header}>
          <h1 className={styles.title}>
            {/* Show generic title until profile loads, then role-specific */}
            {!authReady ? 'Tasks' : isTeacher ? 'My Tasks' : 'Assigned Tasks'}
          </h1>
          {(isTeacher || !authReady) && (
            <Link href="/app/tasks/new" style={authReady && !isTeacher ? { display: 'none' } : undefined}>
              <Button variant="primary" size="lg">
                Create Task
              </Button>
            </Link>
          )}
        </div>

        {tasksError && <div className={styles.errorMessage}>{tasksError}</div>}

        {/* Loading: show skeleton cards */}
        {tasksLoading && !tasksError && <TaskSkeleton count={4} />}

        {/* Loaded: empty state */}
        {!tasksLoading && !tasksError && tasks.length === 0 && (
          <div className={styles.emptyState}>
            <p className={styles.emptyMessage}>
              {isTeacher
                ? 'No tasks yet. Create your first task to get started!'
                : 'No tasks assigned yet. Tasks will appear here when your teacher assigns them.'}
            </p>
          </div>
        )}

        {/* Loaded: task list */}
        {!tasksLoading && !tasksError && tasks.length > 0 && (
          <div className={styles.tasksList}>
            {tasks.map((task) => (
              <Link key={task.id} href={`/app/tasks/${task.id}`} className={styles.taskLink}>
                <div className={styles.taskCard}>
                  <div className={styles.taskHeader}>
                    <h3 className={styles.taskTitle}>{task.title}</h3>
                    {task.due_date && (
                      <span className={styles.dueDate}>
                        Due: {formatDate(task.due_date)}
                      </span>
                    )}
                  </div>
                  <div className={styles.taskInfoRow}>
                    {task.classes && (
                      <span className={styles.className}>
                        {task.classes.name}
                      </span>
                    )}
                    {task.target_skill && task.target_level && (
                      <span className={styles.skillLabel}>
                        Skill: {DIGITAL_SKILLS.find(s => s.key === task.target_skill)?.label || task.target_skill} ({SKILL_LEVELS.find(l => l.value === task.target_level)?.label || task.target_level})
                      </span>
                    )}
                    {!isTeacher && taskStatuses[task.id] && (
                      <StatusChip status={taskStatuses[task.id].status as any} />
                    )}
                    {isTeacher && taskCounts[task.id] && (
                      <span className={styles.counts}>
                        {taskCounts[task.id].submitted} submitted, {taskCounts[task.id].reviewed} reviewed
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
