'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getMyProfile, Profile } from '@/lib/supabase/profile'
import { createClass, listMyClasses, joinClassByCode, Class } from '@/lib/supabase/classes'
import Button from '@/components/Button'
import Input from '@/components/Input'
import styles from './page.module.css'

export default function ClassesPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [classes, setClasses] = useState<Class[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [className, setClassName] = useState('')
  const [inviteCode, setInviteCode] = useState('')

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

        // Load classes
        const { data: classesData, error: classesError } = await listMyClasses()
        if (classesError) {
          setError('Failed to load classes')
        } else {
          setClasses(classesData || [])
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

  const handleCreateClass = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    try {
      const { data, error: createError } = await createClass(className.trim())

      if (createError) {
        setError(createError.message || 'Failed to create class')
        setIsSubmitting(false)
        return
      }

      setSuccess(`Class "${data?.name}" created! Invite code: ${data?.invite_code}`)
      setClassName('')

      // Reload classes
      const { data: classesData } = await listMyClasses()
      setClasses(classesData || [])
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleJoinClass = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    try {
      const { data: classId, error: joinError } = await joinClassByCode(inviteCode.trim().toLowerCase())

      if (joinError) {
        setError(joinError.message || 'Invalid invite code')
        setIsSubmitting(false)
        return
      }

      setSuccess('Successfully joined class!')
      setInviteCode('')

      // Reload classes
      const { data: classesData } = await listMyClasses()
      setClasses(classesData || [])
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

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

  const isTeacher = profile.role === 'teacher'

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>
          {isTeacher ? 'My Classes' : 'Joined Classes'}
        </h1>

        {error && <div className={styles.errorMessage}>{error}</div>}
        {success && <div className={styles.successMessage}>{success}</div>}

        {/* Teacher: Create Class Form */}
        {isTeacher && (
          <div id="create" className={styles.section}>
            <h2 className={styles.sectionTitle}>Create New Class</h2>
            <form onSubmit={handleCreateClass} className={styles.form}>
              <Input
                id="className"
                type="text"
                label="Class Name"
                placeholder="e.g., Math 101"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                required
                disabled={isSubmitting}
              />
              <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting} className={styles.submitButton}>
                Create Class
              </Button>
            </form>
          </div>
        )}

        {/* Student: Join Class Form */}
        {!isTeacher && (
          <div id="join" className={styles.section}>
            <h2 className={styles.sectionTitle}>Join a Class</h2>
            <form onSubmit={handleJoinClass} className={styles.form}>
              <Input
                id="inviteCode"
                type="text"
                label="Invite Code"
                placeholder="Enter 8-character code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
                disabled={isSubmitting}
                maxLength={8}
              />
              <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting} className={styles.submitButton}>
                Join Class
              </Button>
            </form>
          </div>
        )}

        {/* Classes List */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {isTeacher ? 'Your Classes' : 'Your Joined Classes'}
          </h2>
          {classes.length === 0 ? (
            <p className={styles.emptyMessage}>
              {isTeacher ? 'No classes yet. Create your first class above!' : 'No classes yet. Join a class using an invite code above!'}
            </p>
          ) : (
            <div className={styles.classesList}>
              {classes.map((classItem) => (
                <div key={classItem.id} className={styles.classCard}>
                  <h3 className={styles.className}>{classItem.name}</h3>
                  {isTeacher && (
                    <div className={styles.inviteCode}>
                      <span className={styles.inviteLabel}>Invite Code:</span>
                      <code className={styles.code}>{classItem.invite_code}</code>
                    </div>
                  )}
                  <p className={styles.classDate}>
                    Created {new Date(classItem.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

