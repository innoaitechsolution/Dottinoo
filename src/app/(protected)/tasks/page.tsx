'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { Profile } from '@/lib/supabase/profile'
import { listTasksForTeacher, listTasksForStudent, TaskWithClass, getBatchSubmissionCounts } from '@/lib/supabase/tasks'
import StatusChip from '@/components/StatusChip'
import Button from '@/components/Button'
import styles from './page.module.css'

export default function TasksPage() {
  const router = useRouter()
  const didRun = useRef(false)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [tasks, setTasks] = useState<TaskWithClass[]>([])
  const [taskStatuses, setTaskStatuses] = useState<Record<string, { status: string; stars_awarded: number }>>({})
  const [taskCounts, setTaskCounts] = useState<Record<string, { submitted: number; reviewed: number }>>({})
  const [tasksLoading, setTasksLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const userId = session.user.id

      // Parallel: profile + teacher tasks
      const [profileRes, teacherResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        listTasksForTeacher(userId),
      ])

      const profileData = profileRes.data as Profile | null
      if (!profileData) { router.push('/login'); return }
      setProfile(profileData)

      if (profileData.role === 'teacher' || profileData.role === 'admin') {
        if (teacherResult.error) {
          setError('Failed to load tasks')
          setTasksLoading(false)
          return
        }
        const teacherTasks = teacherResult.data || []
        setTasks(teacherTasks)
        setTasksLoading(false)

        // Progressive: counts in background
        if (teacherTasks.length > 0) {
          getBatchSubmissionCounts(teacherTasks.map(t => t.id), userId).then(({ data: counts }) => {
            if (counts) setTaskCounts(counts)
          })
        }
      } else {
        const { data: tasksData, error: tasksError } = await listTasksForStudent()
        if (tasksError) {
          setError('Failed to load tasks')
          setTasks([])
        } else {
          setTasks(tasksData || [])
          const statuses: Record<string, { status: string; stars_awarded: number }> = {}
          for (const task of tasksData || []) {
            if (task.assignmentStatus !== undefined) {
              statuses[task.id] = { status: task.assignmentStatus, stars_awarded: task.starsAwarded || 0 }
            }
          }
          setTaskStatuses(statuses)
        }
        setTasksLoading(false)
      }
    } catch (err: any) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.error('[TasksPage] Error:', err?.message, err?.code, err?.details, err?.hint)
      }
      setError(err?.message || 'An unexpected error occurred')
      setTasksLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (didRun.current) return
    didRun.current = true
    loadData()
  }, [loadData])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const isTeacher = profile?.role === 'teacher' || profile?.role === 'admin'

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            {!profile ? 'Tasks' : isTeacher ? 'My Tasks' : 'Assigned Tasks'}
          </h1>
          {(isTeacher || !profile) && (
            <Link href="/app/tasks/new" style={profile && !isTeacher ? { display: 'none' } : undefined}>
              <Button variant="primary" size="lg">Create Task</Button>
            </Link>
          )}
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        {tasksLoading && !error && (
          <div className={styles.loading}>Loading...</div>
        )}

        {!tasksLoading && !error && tasks.length === 0 && (
          <div className={styles.emptyState}>
            <p className={styles.emptyMessage}>
              {isTeacher ? 'No tasks yet. Create your first task to get started!' : 'No tasks assigned yet. Tasks will appear here when your teacher assigns them.'}
            </p>
          </div>
        )}

        {!tasksLoading && !error && tasks.length > 0 && (
          <div className={styles.tasksList}>
            {tasks.map((task) => (
              <Link key={task.id} href={`/app/tasks/${task.id}`} className={styles.taskLink}>
                <div className={styles.taskCard}>
                  <div className={styles.taskHeader}>
                    <h3 className={styles.taskTitle}>{task.title}</h3>
                    {task.due_date && <span className={styles.dueDate}>Due: {formatDate(task.due_date)}</span>}
                  </div>
                  <div className={styles.taskInfoRow}>
                    {task.classes && <span className={styles.className}>{task.classes.name}</span>}
                    {!isTeacher && taskStatuses[task.id] && <StatusChip status={taskStatuses[task.id].status as any} />}
                    {isTeacher && taskCounts[task.id] && (
                      <span className={styles.counts}>{taskCounts[task.id].submitted} submitted, {taskCounts[task.id].reviewed} reviewed</span>
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
