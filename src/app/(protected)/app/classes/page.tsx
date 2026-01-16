'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getMyProfile, Profile } from '@/lib/supabase/profile'
import { createClass, listMyClasses, joinClassByCode, Class } from '@/lib/supabase/classes'
import { getStudentsWithSkills, upsertSkillProfile, bulkUpsertSkillProfiles, StudentWithSkills, DIGITAL_SKILLS, SKILL_LEVELS, DigitalSkill, SkillLevel } from '@/lib/supabase/skillProfiles'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Select from '@/components/Select'
import BackButton from '@/components/BackButton'
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

  // Students with skills state (per class)
  const [studentsByClass, setStudentsByClass] = useState<Record<string, StudentWithSkills[]>>({})
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null)
  const [isLoadingStudents, setIsLoadingStudents] = useState<Record<string, boolean>>({})
  const [isSavingSkills, setIsSavingSkills] = useState<Record<string, boolean>>({})
  const [isBulkSaving, setIsBulkSaving] = useState<Record<string, boolean>>({})
  const [localSkillEdits, setLocalSkillEdits] = useState<Record<string, Record<string, SkillLevel | null>>>({})

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
          const errorMsg = classesError.message || 'Failed to load classes'
          const errorDetails = classesError.details ? ` (${classesError.details})` : ''
          setError(`Failed to load classes: ${errorMsg}${errorDetails}`)
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

  const handleExpandStudents = async (classId: string) => {
    if (expandedClassId === classId) {
      setExpandedClassId(null)
      return
    }

    setExpandedClassId(classId)
    setIsLoadingStudents({ ...isLoadingStudents, [classId]: true })

    const { data, error } = await getStudentsWithSkills(classId)
    if (error) {
      setError(`Failed to load students: ${error.message}`)
      setIsLoadingStudents({ ...isLoadingStudents, [classId]: false })
      return
    }

    const students = data || []
    setStudentsByClass({ ...studentsByClass, [classId]: students })
    setIsLoadingStudents({ ...isLoadingStudents, [classId]: false })
    
    // Initialize local edits with current values
    const edits: Record<string, Record<string, SkillLevel | null>> = {}
    students.forEach(student => {
      edits[student.id] = { ...student.skills }
    })
    setLocalSkillEdits(prev => ({ ...prev, [classId]: edits }))
  }

  const handleSkillChange = (
    classId: string,
    studentId: string,
    skillKey: DigitalSkill,
    level: SkillLevel | null
  ) => {
    // Update local state immediately (optimistic update)
    setLocalSkillEdits(prev => {
      const classEdits = prev[classId] || {}
      return {
        ...prev,
        [classId]: {
          ...classEdits,
          [studentId]: {
            ...(classEdits[studentId] || {}),
            [skillKey]: level,
          },
        },
      }
    })
  }

  const handleBulkSave = async (classId: string) => {
    setIsBulkSaving({ ...isBulkSaving, [classId]: true })
    setError(null)

    const classEdits = localSkillEdits[classId] || {}
    const students = studentsByClass[classId] || []
    
    // Build updates array
    const updates: Array<{
      studentId: string
      skillKey: DigitalSkill
      level: SkillLevel | null
    }> = []

    for (const student of students) {
      const studentEdits = classEdits[student.id] || {}
      for (const skill of DIGITAL_SKILLS) {
        const newLevel = studentEdits[skill.key] !== undefined 
          ? studentEdits[skill.key] 
          : student.skills[skill.key]
        
        // Only include if changed
        if (newLevel !== student.skills[skill.key]) {
          updates.push({
            studentId: student.id,
            skillKey: skill.key,
            level: newLevel,
          })
        }
      }
    }

    if (updates.length === 0) {
      setIsBulkSaving({ ...isBulkSaving, [classId]: false })
      setSuccess('No changes to save')
      setTimeout(() => setSuccess(null), 2000)
      return
    }

    const { error } = await bulkUpsertSkillProfiles(classId, updates)
    if (error) {
      setError(`Failed to save skill profiles: ${error.message}`)
      setIsBulkSaving({ ...isBulkSaving, [classId]: false })
      return
    }

    // Reload students to get fresh data
    const { data, error: reloadError } = await getStudentsWithSkills(classId)
    if (reloadError) {
      setError(`Saved but failed to reload: ${reloadError.message}`)
    } else {
      const reloadedStudents = data || []
      setStudentsByClass({ ...studentsByClass, [classId]: reloadedStudents })
      
      // Reset local edits
      const edits: Record<string, Record<string, SkillLevel | null>> = {}
      reloadedStudents.forEach(student => {
        edits[student.id] = { ...student.skills }
      })
      setLocalSkillEdits(prev => ({ ...prev, [classId]: edits }))
      
      setSuccess(`Successfully saved ${updates.length} skill profile update(s)`)
      setTimeout(() => setSuccess(null), 3000)
    }

    setIsBulkSaving({ ...isBulkSaving, [classId]: false })
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
        <BackButton fallbackHref="/app" className={styles.backButton} />
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
                  {isTeacher && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => router.push(`/app/tasks/new?classId=${classItem.id}`)}
                        className={styles.createTaskButton}
                      >
                        Create Task
                      </Button>
                      <Button
                        variant="reward"
                        size="sm"
                        onClick={() => handleExpandStudents(classItem.id)}
                        className={styles.manageStudentsButton}
                      >
                        {expandedClassId === classItem.id ? 'Hide Students' : 'Manage Students'}
                      </Button>
                    </>
                  )}
                  {isTeacher && expandedClassId === classItem.id && (
                    <div className={styles.studentsSection}>
                      <h4 className={styles.studentsSectionTitle}>Student Digital Skills</h4>
                      {isLoadingStudents[classItem.id] ? (
                        <div className={styles.loadingState}>
                          <p className={styles.loadingText}>Loading students...</p>
                        </div>
                      ) : (studentsByClass[classItem.id] || []).length === 0 ? (
                        <div className={styles.emptyState}>
                          <p className={styles.emptyMessage}>No students in this class yet.</p>
                        </div>
                      ) : (
                        <>
                          <div className={styles.studentsTable}>
                            <div className={styles.tableHeader}>
                              <div className={styles.tableCell}>Student</div>
                              {DIGITAL_SKILLS.map((skill) => (
                                <div key={skill.key} className={styles.tableCell}>
                                  {skill.label}
                                </div>
                              ))}
                            </div>
                            {(studentsByClass[classItem.id] || []).map((student) => {
                              const classEdits = localSkillEdits[classItem.id] || {}
                              const studentEdits = classEdits[student.id] || {}
                              const displayName = student.full_name || `Student ${student.id.slice(0, 8)}`
                              
                              return (
                                <div key={student.id} className={styles.tableRow}>
                                  <div className={styles.tableCell}>
                                    <span className={styles.studentName}>{displayName}</span>
                                    {!student.full_name && (
                                      <span className={styles.studentId}>ID: {student.id.slice(0, 8)}...</span>
                                    )}
                                  </div>
                                  {DIGITAL_SKILLS.map((skill) => {
                                    const currentValue = studentEdits[skill.key] !== undefined
                                      ? studentEdits[skill.key]
                                      : student.skills[skill.key]
                                    
                                    return (
                                      <div key={skill.key} className={styles.tableCell}>
                                        <Select
                                          value={currentValue || ''}
                                          onChange={(e) => {
                                            const level = e.target.value as SkillLevel | ''
                                            handleSkillChange(
                                              classItem.id,
                                              student.id,
                                              skill.key,
                                              level === '' ? null : level
                                            )
                                          }}
                                          disabled={isBulkSaving[classItem.id]}
                                          className={styles.skillSelect}
                                        >
                                          <option value="">—</option>
                                          {SKILL_LEVELS.map((lvl) => (
                                            <option key={lvl.value} value={lvl.value}>
                                              {lvl.label}
                                            </option>
                                          ))}
                                        </Select>
                                      </div>
                                    )
                                  })}
                                </div>
                              )
                            })}
                          </div>
                          <div className={styles.saveActions}>
                            <Button
                              variant="primary"
                              size="md"
                              onClick={() => handleBulkSave(classItem.id)}
                              isLoading={isBulkSaving[classItem.id]}
                              disabled={isBulkSaving[classItem.id]}
                            >
                              Save All Changes
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

