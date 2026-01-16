'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { signOut } from '@/lib/supabase/auth'
import { getMyProfile, Profile } from '@/lib/supabase/profile'
import { getTeacherStats, TeacherStats } from '@/lib/supabase/stats'
import { getStudentStats, StudentStats } from '@/lib/supabase/stats'
import { listMyClasses } from '@/lib/supabase/classes'
import { listTeacherNeedsReview, NeedsReviewItem } from '@/lib/supabase/dashboard'
import { listStudentNextTasks, NextTaskItem } from '@/lib/supabase/dashboard'
import Button from '@/components/Button'
import StatusChip from '@/components/StatusChip'
import styles from './page.module.css'

export default function AppPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [teacherStats, setTeacherStats] = useState<TeacherStats | null>(null)
  const [studentStats, setStudentStats] = useState<StudentStats | null>(null)
  const [teacherClasses, setTeacherClasses] = useState<any[]>([])
  const [needsReview, setNeedsReview] = useState<NeedsReviewItem[]>([])
  const [nextTasks, setNextTasks] = useState<NextTaskItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [demoSeedEnabled, setDemoSeedEnabled] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState<any>(null)
  const [seedError, setSeedError] = useState<string | null>(null)
  const [isCreatingDemoUsers, setIsCreatingDemoUsers] = useState(false)
  const [demoUsersResult, setDemoUsersResult] = useState<any>(null)
  const [demoUsersError, setDemoUsersError] = useState<string | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Error checking session:', error)
          router.push('/login')
          return
        }

        if (!session) {
          router.push('/login')
          return
        }

        // Get user with full metadata (including app_metadata for provider info)
        const { data: { user: userData } } = await supabase.auth.getUser()
        setUser(userData || session.user)

        // Load user profile
        const { data: profileData, error: profileError } = await getMyProfile()

        if (profileError) {
          console.error('Error loading profile:', profileError)
          // Don't redirect, just show that profile is missing
        }

        setProfile(profileData)

        // Demo seed is available for teachers/admins (API will check if enabled)
        setDemoSeedEnabled(true)

        // Load stats and role-specific data
        if (profileData) {
          if (profileData.role === 'teacher') {
            const { data: stats } = await getTeacherStats()
            setTeacherStats(stats)
            // Load classes for teacher hints
            const { data: classes } = await listMyClasses()
            setTeacherClasses(classes || [])
            // Load needs review
            const { data: reviewData } = await listTeacherNeedsReview(3)
            setNeedsReview(reviewData || [])
          } else if (profileData.role === 'student') {
            const { data: stats } = await getStudentStats()
            setStudentStats(stats)
            // Load next tasks
            const { data: tasksData } = await listStudentNextTasks(3)
            setNextTasks(tasksData || [])
            // Load classes for empty state check
            const { data: classes } = await listMyClasses()
            setTeacherClasses(classes || [])
          } else if (profileData.role === 'admin') {
            // Admin uses teacher stats for now
            const { data: stats } = await getTeacherStats()
            setTeacherStats(stats)
          } else if (profileData.role === 'external') {
            // External uses student stats for read-only view
            const { data: stats } = await getStudentStats()
            setStudentStats(stats)
          }
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        router.push('/login')
      } else {
        // Get user with full metadata
        const { data: { user: userData } } = await supabase.auth.getUser()
        setUser(userData || session.user)
        // Reload profile on auth change
        getMyProfile().then(({ data }) => setProfile(data))
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  const handleSignOut = async () => {
    setIsSigningOut(true)
    const { error } = await signOut()
    
    if (error) {
      console.error('Error signing out:', error)
    } else {
      router.push('/login')
      router.refresh()
    }
    
    setIsSigningOut(false)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const handleCardClick = (href: string) => {
    router.push(href)
  }

  const handleCardKeyDown = (e: React.KeyboardEvent, href: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      router.push(href)
    }
  }

  const handleDemoSeed = async () => {
    if (!user?.id) {
      setSeedError('User ID not available')
      return
    }

    const confirmed = window.confirm(
      'This will create:\n' +
      '- 1 demo class\n' +
      '- 3 demo student accounts\n' +
      '- 2 demo tasks\n' +
      '- Task assignments for all students\n' +
      '- 1 sample submission\n\n' +
      'Continue?'
    )

    if (!confirmed) return

    setIsSeeding(true)
    setSeedError(null)
    setSeedResult(null)

    try {
      const response = await fetch('/api/demo/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        setSeedError(data.error || 'Failed to seed demo data')
        setIsSeeding(false)
        return
      }

      setSeedResult(data)
      setIsSeeding(false)
    } catch (error: any) {
      setSeedError(error.message || 'Failed to seed demo data')
      setIsSeeding(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could show a toast here, but keeping it simple for MVP
    })
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.profileWarning}>
            <p>Profile not found. Please sign up again or contact support.</p>
          </div>
        </div>
      </div>
    )
  }

  const isTeacher = profile.role === 'teacher'
  const isStudent = profile.role === 'student'
  const isAdmin = profile.role === 'admin'
  const isExternal = profile.role === 'external'

          // Determine teacher CTA
          const teacherCTA = teacherClasses.length === 0
            ? { href: '/app/classes#create', title: 'Create your first class', text: 'Create a class, share the invite code with students, then create tasks.' }
            : teacherStats && teacherStats.totalTasks === 0
            ? { 
                href: teacherClasses.length === 1 
                  ? `/app/tasks/new?classId=${teacherClasses[0].id}` 
                  : '/app/tasks/new', 
                title: 'Create your first task', 
                text: 'Start engaging your students by creating a task for your class.' 
              }
            : needsReview.length > 0
            ? { href: `/app/tasks/${needsReview[0].task_id}`, title: 'Review submissions', text: `You have ${needsReview.length} submission${needsReview.length > 1 ? 's' : ''} waiting for review.` }
            : null

  // Determine student CTA
  const studentCTA = teacherClasses.length === 0
    ? { href: '/app/classes#join', title: 'Join a class', text: 'Join a class with the invite code from your teacher.' }
    : nextTasks.length === 0
    ? { href: '/app/tasks', title: 'View tasks', text: 'Tasks will appear here when your teacher assigns them.' }
    : null

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Dashboard</h1>
        <div className={styles.welcomeSection}>
          <p className={styles.welcomeText}>
            Welcome back, {profile.full_name || user?.email || 'User'}!
          </p>
          {/* Compact Account Info */}
          <div className={styles.accountInfoCompact}>
            <span className={styles.accountItemCompact}>
              {user?.email || 'Not available'}
            </span>
            <span className={styles.accountSeparator}>•</span>
            <span className={styles.accountItemCompact}>
              {(() => {
                const provider = user?.app_metadata?.provider
                const providers = user?.app_metadata?.providers
                
                if (provider) {
                  return provider.charAt(0).toUpperCase() + provider.slice(1)
                } else if (providers && Array.isArray(providers) && providers.length > 0) {
                  return providers[0].charAt(0).toUpperCase() + providers[0].slice(1)
                } else if (user?.email) {
                  return 'Email'
                }
                return 'Unknown'
              })()}
            </span>
            {profile && (
              <>
                <span className={styles.accountSeparator}>•</span>
                <span className={styles.accountItemCompact}>{profile.role}</span>
              </>
            )}
          </div>
        </div>

        {/* Teacher Dashboard */}
        {isTeacher && (
          <>
            {/* Create Demo Users Card */}
            {demoSeedEnabled && (
              <div className={styles.demoSeedCard}>
                <h2 className={styles.sectionTitle}>Create Demo Users</h2>
                <p className={styles.demoSeedDescription}>
                  Quickly create a demo teacher and student account for testing.
                </p>
                {!demoUsersResult && !demoUsersError && (
                  <Button
                    variant="primary"
                    onClick={handleCreateDemoUsers}
                    isLoading={isCreatingDemoUsers}
                    disabled={isCreatingDemoUsers}
                  >
                    Create demo teacher + student
                  </Button>
                )}
                {demoUsersError && (
                  <div className={styles.seedError}>
                    <p>{demoUsersError}</p>
                    <Button variant="primary" onClick={handleCreateDemoUsers} disabled={isCreatingDemoUsers}>
                      Try Again
                    </Button>
                  </div>
                )}
                {demoUsersResult && (
                  <div className={styles.seedResult}>
                    <h3 className={styles.seedResultTitle}>Demo users created successfully!</h3>
                    <p className={styles.demoTip}>
                      💡 <strong>Tip:</strong> Use an Incognito window for student login to avoid switching sessions.
                    </p>
                    
                    <div className={styles.seedResultSection}>
                      <h4 className={styles.seedResultSubtitle}>Teacher Login</h4>
                      <div className={styles.seedCodeBlock}>
                        <div className={styles.seedLoginInfo}>
                          <div><strong>Email:</strong> <code className={styles.seedCode}>{demoUsersResult.teacher.email}</code></div>
                          <div><strong>Password:</strong> <code className={styles.seedCode}>{demoUsersResult.teacher.password}</code></div>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => copyToClipboard(`${demoUsersResult.teacher.email}\nPassword: ${demoUsersResult.teacher.password}`)}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>

                    <div className={styles.seedResultSection}>
                      <h4 className={styles.seedResultSubtitle}>Student Login</h4>
                      <div className={styles.seedCodeBlock}>
                        <div className={styles.seedLoginInfo}>
                          <div><strong>Email:</strong> <code className={styles.seedCode}>{demoUsersResult.student.email}</code></div>
                          <div><strong>Password:</strong> <code className={styles.seedCode}>{demoUsersResult.student.password}</code></div>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => copyToClipboard(`${demoUsersResult.student.email}\nPassword: ${demoUsersResult.student.password}`)}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Demo Seed Card */}
            {demoSeedEnabled && (
              <div className={styles.demoSeedCard}>
                <h2 className={styles.sectionTitle}>Demo Seed</h2>
                <p className={styles.demoSeedDescription}>
                  Quickly create a demo class with student accounts and tasks for testing.
                </p>
                {!seedResult && !seedError && (
                  <Button
                    variant="primary"
                    onClick={handleDemoSeed}
                    isLoading={isSeeding}
                    disabled={isSeeding}
                  >
                    Create demo class & student accounts
                  </Button>
                )}
                {seedError && (
                  <div className={styles.seedError}>
                    <p>{seedError}</p>
                    <Button variant="primary" onClick={handleDemoSeed} disabled={isSeeding}>
                      Try Again
                    </Button>
                  </div>
                )}
                {seedResult && (
                  <div className={styles.seedResult}>
                    <h3 className={styles.seedResultTitle}>Demo data created successfully!</h3>
                    
                    <div className={styles.seedResultSection}>
                      <h4 className={styles.seedResultSubtitle}>Class Invite Code</h4>
                      <div className={styles.seedCodeBlock}>
                        <code className={styles.seedCode}>{seedResult.class.inviteCode}</code>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => copyToClipboard(seedResult.class.inviteCode)}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>

                    <div className={styles.seedResultSection}>
                      <h4 className={styles.seedResultSubtitle}>Student Logins</h4>
                      <div className={styles.seedStudentsList}>
                        {seedResult.students.map((student: any, index: number) => (
                          <div key={student.userId} className={styles.seedStudentItem}>
                            <div className={styles.seedStudentInfo}>
                              <strong>{student.fullName}</strong>
                              <span className={styles.seedStudentEmail}>{student.email}</span>
                              <span className={styles.seedStudentPassword}>Password: {student.password}</span>
                            </div>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => copyToClipboard(`${student.email}\nPassword: ${student.password}`)}
                            >
                              Copy
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          const allLogins = seedResult.students
                            .map((s: any) => `${s.email}\nPassword: ${s.password}`)
                            .join('\n\n')
                          copyToClipboard(allLogins)
                        }}
                      >
                        Copy All Logins
                      </Button>
                    </div>

                    <div className={styles.seedResultActions}>
                      <Button variant="primary" onClick={() => router.push('/app/classes')}>
                        Go to Classes
                      </Button>
                      <Button variant="primary" onClick={() => router.push('/app/tasks')}>
                        Go to Tasks
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Dynamic CTA */}
            {teacherCTA && (
              <div className={styles.actionHint}>
                <div className={styles.actionHintContent}>
                  <h3 className={styles.actionHintTitle}>{teacherCTA.title}</h3>
                  <p className={styles.actionHintText}>{teacherCTA.text}</p>
                  <Button variant="primary" onClick={() => router.push(teacherCTA.href)}>
                    {teacherCTA.title}
                  </Button>
                </div>
              </div>
            )}

            {/* Needs Review Panel */}
            {needsReview.length > 0 && (
              <div className={styles.panel}>
                <h2 className={styles.sectionTitle}>Needs Review</h2>
                <div className={styles.reviewList}>
                  {needsReview.map((item) => (
                    <div
                      key={item.assignment_id}
                      role="link"
                      tabIndex={0}
                      className={styles.reviewItem}
                      aria-label={`Review submission from ${item.student_name || item.student_email || 'student'} for ${item.task_title}`}
                      onClick={() => handleCardClick(`/app/tasks/${item.task_id}`)}
                      onKeyDown={(e) => handleCardKeyDown(e, `/app/tasks/${item.task_id}`)}
                    >
                      <div className={styles.reviewItemContent}>
                        <div className={styles.reviewItemHeader}>
                          <h4 className={styles.reviewItemTitle}>{item.task_title}</h4>
                          <StatusChip status="submitted" />
                        </div>
                        <p className={styles.reviewItemStudent}>
                          {item.student_name || item.student_email || 'Student'}
                        </p>
                        <p className={styles.reviewItemDate}>
                          Submitted {formatDate(item.submitted_at) || 'recently'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Student Dashboard */}
        {isStudent && (
          <>
            {/* Dynamic CTA */}
            {studentCTA && (
              <div className={styles.actionHint}>
                <div className={styles.actionHintContent}>
                  <h3 className={styles.actionHintTitle}>{studentCTA.title}</h3>
                  <p className={styles.actionHintText}>{studentCTA.text}</p>
                  <Button variant="primary" onClick={() => router.push(studentCTA.href)}>
                    {studentCTA.title}
                  </Button>
                </div>
              </div>
            )}

            {/* Next Tasks Panel */}
            {nextTasks.length > 0 ? (
              <div className={styles.panel}>
                <h2 className={styles.sectionTitle}>Your Next Tasks</h2>
                <div className={styles.tasksList}>
                  {nextTasks.map((task) => (
                    <div
                      key={task.task_id}
                      role="link"
                      tabIndex={0}
                      className={styles.taskItem}
                      aria-label={`View task: ${task.task_title}`}
                      onClick={() => handleCardClick(`/app/tasks/${task.task_id}`)}
                      onKeyDown={(e) => handleCardKeyDown(e, `/app/tasks/${task.task_id}`)}
                    >
                      <div className={styles.taskItemContent}>
                        <div className={styles.taskItemHeader}>
                          <h4 className={styles.taskItemTitle}>{task.task_title}</h4>
                          <StatusChip status={task.status} />
                        </div>
                        {task.class_name && (
                          <p className={styles.taskItemClass}>{task.class_name}</p>
                        )}
                        {task.due_date && (
                          <p className={styles.taskItemDue}>
                            Due: {formatDate(task.due_date)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : studentStats && studentStats.assignedTasksCount === 0 && (
              <div className={styles.emptyState}>
                <p className={styles.emptyStateText}>
                  Join a class with an invite code to see tasks
                </p>
                <Button variant="primary" onClick={() => router.push('/app/classes#join')}>
                  Join a Class
                </Button>
              </div>
            )}
          </>
        )}

        {/* Admin Dashboard */}
        {isAdmin && (
          <>
            {/* Demo Seed Card */}
            {demoSeedEnabled && (
              <div className={styles.demoSeedCard}>
                <h2 className={styles.sectionTitle}>Demo Seed</h2>
                <p className={styles.demoSeedDescription}>
                  Quickly create a demo class with student accounts and tasks for testing.
                </p>
                {!seedResult && !seedError && (
                  <Button
                    variant="primary"
                    onClick={handleDemoSeed}
                    isLoading={isSeeding}
                    disabled={isSeeding}
                  >
                    Create demo class & student accounts
                  </Button>
                )}
                {seedError && (
                  <div className={styles.seedError}>
                    <p>{seedError}</p>
                    <Button variant="primary" onClick={handleDemoSeed} disabled={isSeeding}>
                      Try Again
                    </Button>
                  </div>
                )}
                {seedResult && (
                  <div className={styles.seedResult}>
                    <h3 className={styles.seedResultTitle}>Demo data created successfully!</h3>
                    
                    <div className={styles.seedResultSection}>
                      <h4 className={styles.seedResultSubtitle}>Class Invite Code</h4>
                      <div className={styles.seedCodeBlock}>
                        <code className={styles.seedCode}>{seedResult.class.inviteCode}</code>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => copyToClipboard(seedResult.class.inviteCode)}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>

                    <div className={styles.seedResultSection}>
                      <h4 className={styles.seedResultSubtitle}>Student Logins</h4>
                      <div className={styles.seedStudentsList}>
                        {seedResult.students.map((student: any, index: number) => (
                          <div key={student.userId} className={styles.seedStudentItem}>
                            <div className={styles.seedStudentInfo}>
                              <strong>{student.fullName}</strong>
                              <span className={styles.seedStudentEmail}>{student.email}</span>
                              <span className={styles.seedStudentPassword}>Password: {student.password}</span>
                            </div>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => copyToClipboard(`${student.email}\nPassword: ${student.password}`)}
                            >
                              Copy
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          const allLogins = seedResult.students
                            .map((s: any) => `${s.email}\nPassword: ${s.password}`)
                            .join('\n\n')
                          copyToClipboard(allLogins)
                        }}
                      >
                        Copy All Logins
                      </Button>
                    </div>

                    <div className={styles.seedResultActions}>
                      <Button variant="primary" onClick={() => router.push('/app/classes')}>
                        Go to Classes
                      </Button>
                      <Button variant="primary" onClick={() => router.push('/app/tasks')}>
                        Go to Tasks
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className={styles.panel}>
              <h2 className={styles.sectionTitle}>Admin Overview</h2>
              <p className={styles.infoText}>
                Admin reporting is MVP scope and will expand.
              </p>
            </div>
          </>
        )}

        {/* External Dashboard */}
        {isExternal && (
          <>
            <div className={styles.panel}>
              <h2 className={styles.sectionTitle}>Read-only Overview</h2>
              <p className={styles.infoText}>
                Read-only dashboards are MVP previews.
              </p>
            </div>
          </>
        )}

        {/* Quick Links */}
        <div className={styles.quickLinks}>
          <h2 className={styles.sectionTitle}>Quick Links</h2>
          <div className={styles.linksGrid}>
            {isTeacher || isAdmin ? (
              <>
                <div
                  role="link"
                  tabIndex={0}
                  className={styles.linkCard}
                  aria-label="Go to Classes"
                  onClick={() => handleCardClick('/app/classes')}
                  onKeyDown={(e) => handleCardKeyDown(e, '/app/classes')}
                >
                  <h3>Classes</h3>
                  <p>Manage your classes</p>
                </div>
                <div
                  role="link"
                  tabIndex={0}
                  className={styles.linkCard}
                  aria-label="Go to Tasks"
                  onClick={() => handleCardClick('/app/tasks')}
                  onKeyDown={(e) => handleCardKeyDown(e, '/app/tasks')}
                >
                  <h3>Tasks</h3>
                  <p>View and create tasks</p>
                </div>
                <div
                  role="link"
                  tabIndex={0}
                  className={styles.linkCard}
                  aria-label="Create a new task"
                  onClick={() => {
                    const href = teacherClasses.length === 1 
                      ? `/app/tasks/new?classId=${teacherClasses[0].id}` 
                      : '/app/tasks/new'
                    handleCardClick(href)
                  }}
                  onKeyDown={(e) => {
                    const href = teacherClasses.length === 1 
                      ? `/app/tasks/new?classId=${teacherClasses[0].id}` 
                      : '/app/tasks/new'
                    handleCardKeyDown(e, href)
                  }}
                >
                  <h3>Create Task</h3>
                  <p>Create a new task</p>
                </div>
              </>
            ) : (
              <>
                <div
                  role="link"
                  tabIndex={0}
                  className={styles.linkCard}
                  aria-label="Go to My Tasks"
                  onClick={() => handleCardClick('/app/tasks')}
                  onKeyDown={(e) => handleCardKeyDown(e, '/app/tasks')}
                >
                  <h3>My Tasks</h3>
                  <p>View assigned tasks</p>
                </div>
                <div
                  role="link"
                  tabIndex={0}
                  className={styles.linkCard}
                  aria-label="Go to Stars"
                  onClick={() => handleCardClick('/app/stars')}
                  onKeyDown={(e) => handleCardKeyDown(e, '/app/stars')}
                >
                  <h3>Stars</h3>
                  <p>View your achievements</p>
                </div>
                <div
                  role="link"
                  tabIndex={0}
                  className={styles.linkCard}
                  aria-label="Go to Classes"
                  onClick={() => handleCardClick('/app/classes')}
                  onKeyDown={(e) => handleCardKeyDown(e, '/app/classes')}
                >
                  <h3>Classes</h3>
                  <p>View joined classes</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stats Section */}
        <div className={styles.statsSection}>
          <h2 className={styles.sectionTitle}>At a Glance</h2>
          <div className={styles.statsGrid}>
            {(isTeacher || isAdmin) && teacherStats ? (
              <>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{teacherStats.totalTasks}</div>
                  <div className={styles.statLabel}>Tasks Created</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{teacherStats.submissionsSubmitted}</div>
                  <div className={styles.statLabel}>Submissions Submitted</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{teacherStats.submissionsReviewed}</div>
                  <div className={styles.statLabel}>Submissions Reviewed</div>
                </div>
              </>
            ) : (isStudent || isExternal) && studentStats ? (
              <>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{studentStats.assignedTasksCount}</div>
                  <div className={styles.statLabel}>Assigned Tasks</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{studentStats.submittedCount}</div>
                  <div className={styles.statLabel}>Submitted</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{studentStats.reviewedCount}</div>
                  <div className={styles.statLabel}>Reviewed</div>
                </div>
                {isStudent && (
                  <div className={styles.statCard}>
                    <div className={styles.statValue}>{studentStats.totalStars} ⭐</div>
                    <div className={styles.statLabel}>Total Stars</div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
