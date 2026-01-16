'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { getMyProfile, Profile } from '@/lib/supabase/profile'
import { listTasksForTeacher, listTasksForStudent, TaskWithClass, getAssignmentStatusForTask, getSubmissionCountsForTask } from '@/lib/supabase/tasks'
import StatusChip from '@/components/StatusChip'
import Button from '@/components/Button'
import styles from './page.module.css'

export default function TasksPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [tasks, setTasks] = useState<TaskWithClass[]>([])
  const [taskStatuses, setTaskStatuses] = useState<Record<string, { status: string; stars_awarded: number }>>({})
  const [taskCounts, setTaskCounts] = useState<Record<string, { submitted: number; reviewed: number }>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          router.push('/login')
          return
        }

        // Load profile
        const { data: profileData } = await getMyProfile()
        if (!profileData) {
          router.push('/login')
          return
        }
        setProfile(profileData)

        // Load tasks based on role
        if (profileData.role === 'teacher') {
          const { data: tasksData, error: tasksError } = await listTasksForTeacher()
          if (tasksError) {
            setError('Failed to load tasks')
          } else {
            setTasks(tasksData || [])
            // Load submission counts for each task
            const counts: Record<string, { submitted: number; reviewed: number }> = {}
            for (const task of tasksData || []) {
              const { data: countData } = await getSubmissionCountsForTask(task.id)
              if (countData) {
                counts[task.id] = countData
              }
            }
            setTaskCounts(counts)
          }
        } else {
          const { data: tasksData, error: tasksError } = await listTasksForStudent()
          if (tasksError) {
            setError('Failed to load tasks')
          } else {
            setTasks(tasksData || [])
            // Load assignment status for each task
            const statuses: Record<string, { status: string; stars_awarded: number }> = {}
            for (const task of tasksData || []) {
              const { data: statusData } = await getAssignmentStatusForTask(task.id)
              if (statusData) {
                statuses[task.id] = statusData
              }
            }
            setTaskStatuses(statuses)
          }
        }
      } catch (err) {
        console.error('Error loading data:', err)
        setError('An unexpected error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [router])

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            {profile.role === 'teacher' ? 'My Tasks' : 'Assigned Tasks'}
          </h1>
          {profile.role === 'teacher' && (
            <Link href="/app/tasks/new">
              <Button variant="primary" size="lg">
                Create Task
              </Button>
            </Link>
          )}
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        {tasks.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyMessage}>
              {profile.role === 'teacher'
                ? 'No tasks yet. Create your first task to get started!'
                : 'No tasks assigned yet. Tasks will appear here when your teacher assigns them.'}
            </p>
          </div>
        ) : (
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
                    {profile.role === 'student' && taskStatuses[task.id] && (
                      <StatusChip status={taskStatuses[task.id].status as any} />
                    )}
                    {profile.role === 'teacher' && taskCounts[task.id] && (
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

