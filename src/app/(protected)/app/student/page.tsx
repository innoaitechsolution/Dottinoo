'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { signOut } from '@/lib/supabase/auth'
import { getMyProfile, Profile } from '@/lib/supabase/profile'
import { getStudentStats, StudentStats } from '@/lib/supabase/stats'
import { listMyClasses } from '@/lib/supabase/classes'
import { listStudentNextTasks, NextTaskItem } from '@/lib/supabase/dashboard'
import Button from '@/components/Button'
import StatusChip from '@/components/StatusChip'
import styles from '../page.module.css'

export default function StudentDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [studentStats, setStudentStats] = useState<StudentStats | null>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [nextTasks, setNextTasks] = useState<NextTaskItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [showAccessibilitySettings, setShowAccessibilitySettings] = useState(false)
  const [accessibilitySettings, setAccessibilitySettings] = useState({
    colorTheme: 'default',
    fontSize: 'medium',
    lineSpacing: 'normal',
    letterCase: 'normal',
    simplifiedLayout: false,
  })

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session) {
          router.push('/login')
          return
        }

        const { data: { user: userData } } = await supabase.auth.getUser()
        setUser(userData || session.user)

        const { data: profileData, error: profileError } = await getMyProfile()

        if (profileError || !profileData) {
          router.push('/login')
          return
        }

        // Redirect if not student/external
        if (profileData.role !== 'student' && profileData.role !== 'external') {
          router.push('/app/teacher')
          return
        }

        setProfile(profileData)

        // Load student data
        const { data: stats } = await getStudentStats()
        setStudentStats(stats)
        const { data: tasksData } = await listStudentNextTasks(3)
        setNextTasks(tasksData || [])
        const { data: classesData } = await listMyClasses()
        setClasses(classesData || [])

        // Load accessibility settings from profile
        if (profileData.ui_preferences) {
          setAccessibilitySettings({
            colorTheme: profileData.ui_preferences.colorTheme || 'default',
            fontSize: profileData.ui_preferences.fontSize || 'medium',
            lineSpacing: profileData.ui_preferences.lineSpacing || 'normal',
            letterCase: profileData.ui_preferences.letterCase || 'normal',
            simplifiedLayout: profileData.ui_preferences.simplifiedLayout || false,
          })
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        router.push('/login')
      } else {
        const { data: { user: userData } } = await supabase.auth.getUser()
        setUser(userData || session.user)
        getMyProfile().then(({ data }) => {
          if (data && data.role !== 'student' && data.role !== 'external') {
            router.push('/app/teacher')
          } else {
            setProfile(data)
          }
        })
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

  const saveAccessibilitySettings = async () => {
    if (!profile?.id) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ui_preferences: accessibilitySettings })
        .eq('id', profile.id)

      if (error) {
        console.error('Error saving settings:', error)
        alert('Failed to save settings')
      } else {
        setShowAccessibilitySettings(false)
        // Apply settings immediately
        applyAccessibilitySettings(accessibilitySettings)
      }
    } catch (err) {
      console.error('Error saving settings:', err)
    }
  }

  const applyAccessibilitySettings = (settings: typeof accessibilitySettings) => {
    const root = document.documentElement
    const body = document.body
    
    // Set role attribute on body for scoping
    body.setAttribute('data-role', 'student')
    
    // Color theme
    root.setAttribute('data-theme', settings.colorTheme)
    
    // Font size
    root.setAttribute('data-font-size', settings.fontSize)
    
    // Line spacing
    root.setAttribute('data-line-spacing', settings.lineSpacing)
    
    // Letter case
    root.setAttribute('data-letter-case', settings.letterCase)
    
    // Simplified layout
    if (settings.simplifiedLayout) {
      root.setAttribute('data-simplified', 'true')
    } else {
      root.removeAttribute('data-simplified')
    }
  }

  useEffect(() => {
    applyAccessibilitySettings(accessibilitySettings)
    
    // Cleanup on unmount
    return () => {
      const root = document.documentElement
      const body = document.body
      root.removeAttribute('data-theme')
      root.removeAttribute('data-font-size')
      root.removeAttribute('data-line-spacing')
      root.removeAttribute('data-letter-case')
      root.removeAttribute('data-simplified')
      body.removeAttribute('data-role')
    }
  }, [accessibilitySettings])

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

  const studentCTA = classes.length === 0
    ? { href: '/app/classes#join', title: 'Join a class', text: 'Join a class with the invite code from your teacher.' }
    : nextTasks.length === 0
    ? { href: '/app/tasks', title: 'View tasks', text: 'Tasks will appear here when your teacher assigns them.' }
    : null

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 className={styles.title}>Student Dashboard</h1>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ 
              padding: '0.25rem 0.75rem', 
              borderRadius: '12px', 
              backgroundColor: '#10b981', 
              color: 'white', 
              fontSize: '0.875rem',
              fontWeight: '600'
            }}>
              👤 Student
            </span>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {user?.email}
            </span>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => setShowAccessibilitySettings(!showAccessibilitySettings)}
            >
              ⚙️ Settings
            </Button>
            <Button variant="secondary" size="sm" onClick={handleSignOut} disabled={isSigningOut}>
              Sign Out
            </Button>
          </div>
        </div>

        <div className={styles.welcomeSection}>
          <p className={styles.welcomeText}>
            Welcome back, {profile.full_name || user?.email || 'Student'}!
          </p>
        </div>

        {/* Accessibility Settings Panel */}
        {showAccessibilitySettings && (
          <div className={styles.panel} style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
            <h2 className={styles.sectionTitle}>Accessibility Settings</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Color Theme
                </label>
                <select
                  value={accessibilitySettings.colorTheme}
                  onChange={(e) => setAccessibilitySettings({ ...accessibilitySettings, colorTheme: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px' }}
                >
                  <option value="default">Default</option>
                  <option value="high-contrast">High Contrast</option>
                  <option value="pastel">Pastel</option>
                  <option value="dyslexia-friendly">Dyslexia Friendly</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Font Size
                </label>
                <select
                  value={accessibilitySettings.fontSize}
                  onChange={(e) => setAccessibilitySettings({ ...accessibilitySettings, fontSize: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px' }}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Line Spacing
                </label>
                <select
                  value={accessibilitySettings.lineSpacing}
                  onChange={(e) => setAccessibilitySettings({ ...accessibilitySettings, lineSpacing: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px' }}
                >
                  <option value="normal">Normal</option>
                  <option value="relaxed">Relaxed</option>
                  <option value="loose">Loose</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Letter Case
                </label>
                <select
                  value={accessibilitySettings.letterCase}
                  onChange={(e) => setAccessibilitySettings({ ...accessibilitySettings, letterCase: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px' }}
                >
                  <option value="normal">Normal</option>
                  <option value="lowercase">lowercase</option>
                  <option value="uppercase">UPPERCASE</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={accessibilitySettings.simplifiedLayout}
                    onChange={(e) => setAccessibilitySettings({ ...accessibilitySettings, simplifiedLayout: e.target.checked })}
                  />
                  <span>Simplified Layout (Reduced clutter)</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button variant="primary" onClick={saveAccessibilitySettings}>
                  Save Settings
                </Button>
                <Button variant="secondary" onClick={() => setShowAccessibilitySettings(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

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

        {/* Quick Links */}
        <div className={styles.quickLinks}>
          <h2 className={styles.sectionTitle}>Quick Links</h2>
          <div className={styles.linksGrid}>
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
          </div>
        </div>

        {/* Stats Section */}
        <div className={styles.statsSection}>
          <h2 className={styles.sectionTitle}>At a Glance</h2>
          <div className={styles.statsGrid}>
            {studentStats ? (
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
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{studentStats.totalStars} ⭐</div>
                  <div className={styles.statLabel}>Total Stars</div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
