'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getMyProfile, Profile } from '@/lib/supabase/profile'
import { createClass, listMyClasses, joinClassByCode, Class } from '@/lib/supabase/classes'
import { getStudentsWithSkills, upsertSkillProfile, bulkUpsertSkillProfiles, StudentWithSkills, DIGITAL_SKILLS, SKILL_LEVELS, DigitalSkill, SkillLevel } from '@/lib/supabase/skillProfiles'
import { listStudentsWithNeeds, upsertStudentSupportNeeds, upsertStudentUiPrefs, StudentWithNeeds, UpsertSupportNeedsPayload, UpsertUiPrefsPayload } from '@/lib/supabase/supportNeeds'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Select from '@/components/Select'
import BackButton from '@/components/BackButton'
import styles from './page.module.css'

// Type for local skill edits: classId -> studentId -> skillKey -> level
type SkillEditsByClass = Record<string, Record<string, Record<DigitalSkill, SkillLevel | null>>>

// Type for local support needs edits: classId -> studentId -> needs
type SupportNeedsEditsByClass = Record<string, Record<string, {
  dyslexia: boolean
  adhd: boolean
  autism: boolean
  other_needs: string
}>>

// Type for local UI prefs edits: classId -> studentId -> prefs
type UiPrefsEditsByClass = Record<string, Record<string, {
  font_scale: 'sm' | 'md' | 'lg' | 'xl'
  spacing: 'sm' | 'md' | 'lg'
  reduce_clutter: boolean
  simplified_language: boolean
  high_contrast: boolean
}>>

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
  const [studentsLoadError, setStudentsLoadError] = useState<string | null>(null)
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null)
  const [isLoadingStudents, setIsLoadingStudents] = useState<Record<string, boolean>>({})
  const [isSavingSkills, setIsSavingSkills] = useState<Record<string, boolean>>({})
  const [isBulkSaving, setIsBulkSaving] = useState<Record<string, boolean>>({})
  const [localSkillEdits, setLocalSkillEdits] = useState<SkillEditsByClass>({})
  
  // Students with support needs state (per class)
  const [studentsWithNeedsByClass, setStudentsWithNeedsByClass] = useState<Record<string, StudentWithNeeds[]>>({})
  const [isLoadingNeeds, setIsLoadingNeeds] = useState<Record<string, boolean>>({})
  const [isSavingNeeds, setIsSavingNeeds] = useState<Record<string, boolean>>({})
  const [expandedSupportNeedsClassId, setExpandedSupportNeedsClassId] = useState<string | null>(null)
  const [localNeedsEdits, setLocalNeedsEdits] = useState<SupportNeedsEditsByClass>({})
  const [localPrefsEdits, setLocalPrefsEdits] = useState<UiPrefsEditsByClass>({})

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
      setExpandedSupportNeedsClassId(null)
      return
    }

    setExpandedClassId(classId)
    setStudentsLoadError(null)
    setIsLoadingStudents({ ...isLoadingStudents, [classId]: true })

    // Load both skills and support needs in parallel
    const [skillsResult, needsResult] = await Promise.all([
      getStudentsWithSkills(classId),
      listStudentsWithNeeds(classId),
    ])

    if (skillsResult.error) {
      setStudentsLoadError(skillsResult.error.message || 'Couldn\'t load students.')
      setStudentsByClass({ ...studentsByClass, [classId]: [] })
      setIsLoadingStudents({ ...isLoadingStudents, [classId]: false })
    } else {
      const students = skillsResult.data || []
      setStudentsByClass({ ...studentsByClass, [classId]: students })
      setIsLoadingStudents({ ...isLoadingStudents, [classId]: false })
      // Initialize local edits with current values
      const edits: Record<string, Record<DigitalSkill, SkillLevel | null>> = {}
      students.forEach(student => {
        edits[student.id] = { ...student.skills }
      })
      setLocalSkillEdits(prev => ({ ...prev, [classId]: edits }))
    }

    // Load support needs (ignore errors, just show empty if fails)
    if (!needsResult.error && needsResult.data) {
      setStudentsWithNeedsByClass({ ...studentsWithNeedsByClass, [classId]: needsResult.data })
      // Initialize local edits
      const needsEdits: Record<string, { dyslexia: boolean; adhd: boolean; autism: boolean; other_needs: string }> = {}
      const prefsEdits: Record<string, { font_scale: 'sm' | 'md' | 'lg' | 'xl'; spacing: 'sm' | 'md' | 'lg'; reduce_clutter: boolean; simplified_language: boolean; high_contrast: boolean }> = {}
      needsResult.data.forEach(student => {
        needsEdits[student.id] = {
          dyslexia: student.support_needs?.dyslexia ?? false,
          adhd: student.support_needs?.adhd ?? false,
          autism: student.support_needs?.autism ?? false,
          other_needs: student.support_needs?.other_needs ?? '',
        }
        prefsEdits[student.id] = {
          font_scale: student.ui_prefs?.font_scale ?? 'md',
          spacing: student.ui_prefs?.spacing ?? 'md',
          reduce_clutter: student.ui_prefs?.reduce_clutter ?? false,
          simplified_language: student.ui_prefs?.simplified_language ?? false,
          high_contrast: student.ui_prefs?.high_contrast ?? false,
        }
      })
      setLocalNeedsEdits(prev => ({ ...prev, [classId]: needsEdits }))
      setLocalPrefsEdits(prev => ({ ...prev, [classId]: prefsEdits }))
    }
  }

  const handleExpandSupportNeeds = async (classId: string) => {
    if (expandedSupportNeedsClassId === classId) {
      setExpandedSupportNeedsClassId(null)
      return
    }

    setExpandedSupportNeedsClassId(classId)
    setIsLoadingNeeds({ ...isLoadingNeeds, [classId]: true })

    const { data, error } = await listStudentsWithNeeds(classId)
    if (error) {
      setError(`Failed to load support needs: ${error.message}`)
      setIsLoadingNeeds({ ...isLoadingNeeds, [classId]: false })
      return
    }

    setStudentsWithNeedsByClass({ ...studentsWithNeedsByClass, [classId]: data || [] })
    setIsLoadingNeeds({ ...isLoadingNeeds, [classId]: false })
    
    // Initialize local edits
    const needsEdits: Record<string, { dyslexia: boolean; adhd: boolean; autism: boolean; other_needs: string }> = {}
    const prefsEdits: Record<string, { font_scale: 'sm' | 'md' | 'lg' | 'xl'; spacing: 'sm' | 'md' | 'lg'; reduce_clutter: boolean; simplified_language: boolean; high_contrast: boolean }> = {}
    ;(data || []).forEach(student => {
      needsEdits[student.id] = {
        dyslexia: student.support_needs?.dyslexia ?? false,
        adhd: student.support_needs?.adhd ?? false,
        autism: student.support_needs?.autism ?? false,
        other_needs: student.support_needs?.other_needs ?? '',
      }
      prefsEdits[student.id] = {
        font_scale: student.ui_prefs?.font_scale ?? 'md',
        spacing: student.ui_prefs?.spacing ?? 'md',
        reduce_clutter: student.ui_prefs?.reduce_clutter ?? false,
        simplified_language: student.ui_prefs?.simplified_language ?? false,
        high_contrast: student.ui_prefs?.high_contrast ?? false,
      }
    })
    setLocalNeedsEdits(prev => ({ ...prev, [classId]: needsEdits }))
    setLocalPrefsEdits(prev => ({ ...prev, [classId]: prefsEdits }))
  }

  const handleSaveSupportNeeds = async (classId: string, studentId: string, payload: UpsertSupportNeedsPayload) => {
    setIsSavingNeeds({ ...isSavingNeeds, [studentId]: true })
    setError(null)

    const { data, error } = await upsertStudentSupportNeeds(studentId, payload)
    if (error) {
      setError(`Failed to save support needs: ${error.message}`)
      setIsSavingNeeds({ ...isSavingNeeds, [studentId]: false })
      return
    }

    // Reload needs for this class
    const { data: reloadedData } = await listStudentsWithNeeds(classId)
    if (reloadedData) {
      setStudentsWithNeedsByClass({ ...studentsWithNeedsByClass, [classId]: reloadedData })
    }

    setIsSavingNeeds({ ...isSavingNeeds, [studentId]: false })
    setSuccess('Support needs saved successfully')
    setTimeout(() => setSuccess(null), 2000)
  }

  const handleSaveUiPrefs = async (classId: string, studentId: string, payload: UpsertUiPrefsPayload) => {
    setIsSavingNeeds({ ...isSavingNeeds, [studentId]: true })
    setError(null)

    const { data, error } = await upsertStudentUiPrefs(studentId, payload)
    if (error) {
      setError(`Failed to save UI preferences: ${error.message}`)
      setIsSavingNeeds({ ...isSavingNeeds, [studentId]: false })
      return
    }

    // Reload needs for this class
    const { data: reloadedData } = await listStudentsWithNeeds(classId)
    if (reloadedData) {
      setStudentsWithNeedsByClass({ ...studentsWithNeedsByClass, [classId]: reloadedData })
    }

    setIsSavingNeeds({ ...isSavingNeeds, [studentId]: false })
    setSuccess('UI preferences saved successfully')
    setTimeout(() => setSuccess(null), 2000)
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
      const edits: Record<string, Record<DigitalSkill, SkillLevel | null>> = {}
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
        <BackButton className={styles.backButton} />
        <h1 className={styles.title}>
          {isTeacher ? 'My Classes' : 'Joined Classes'}
        </h1>

        {error && <div className={styles.errorMessage}>{error}</div>}
        {success && <div className={styles.successMessage}>{success}</div>}
        {studentsLoadError && (
          <div className={styles.studentsLoadBanner} role="alert">
            Couldn&apos;t load students. Please refresh.
          </div>
        )}

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
                      {/* Support Needs Section */}
                      <div className={styles.studentsSection}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                          <h4 className={styles.studentsSectionTitle}>Student Support Needs</h4>
                          <Button
                            variant="reward"
                            size="sm"
                            onClick={() => handleExpandSupportNeeds(classItem.id)}
                          >
                            {expandedSupportNeedsClassId === classItem.id ? 'Hide' : 'Show'}
                          </Button>
                        </div>
                        {expandedSupportNeedsClassId === classItem.id && (
                          <>
                            {isLoadingNeeds[classItem.id] ? (
                              <div className={styles.loadingState}>
                                <p className={styles.loadingText}>Loading support needs...</p>
                              </div>
                            ) : (studentsWithNeedsByClass[classItem.id] || []).length === 0 ? (
                              <div className={styles.emptyState}>
                                <p className={styles.emptyMessage}>No students in this class yet.</p>
                              </div>
                            ) : (
                              <div className={styles.supportNeedsList}>
                                {(studentsWithNeedsByClass[classItem.id] || []).map((student) => {
                                  const displayName = student.full_name || `Student ${student.id.slice(0, 8)}`
                                  const classNeedsEdits = localNeedsEdits[classItem.id] || {}
                                  const classPrefsEdits = localPrefsEdits[classItem.id] || {}
                                  const needsEdit = classNeedsEdits[student.id] || {
                                    dyslexia: student.support_needs?.dyslexia ?? false,
                                    adhd: student.support_needs?.adhd ?? false,
                                    autism: student.support_needs?.autism ?? false,
                                    other_needs: student.support_needs?.other_needs ?? '',
                                  }
                                  const prefsEdit = classPrefsEdits[student.id] || {
                                    font_scale: student.ui_prefs?.font_scale ?? 'md',
                                    spacing: student.ui_prefs?.spacing ?? 'md',
                                    reduce_clutter: student.ui_prefs?.reduce_clutter ?? false,
                                    simplified_language: student.ui_prefs?.simplified_language ?? false,
                                    high_contrast: student.ui_prefs?.high_contrast ?? false,
                                  }

                                  return (
                                    <div key={student.id} className={styles.studentCard}>
                                      <h5 className={styles.studentName}>{displayName}</h5>
                                      
                                      {/* Support Needs */}
                                      <div className={styles.supportNeedsSection}>
                                        <h6 className={styles.subsectionTitle}>Support Needs</h6>
                                        <div className={styles.checkboxGroup}>
                                          <label className={styles.checkboxLabel}>
                                            <input
                                              type="checkbox"
                                              checked={needsEdit.dyslexia}
                                              onChange={(e) => {
                                                setLocalNeedsEdits(prev => ({
                                                  ...prev,
                                                  [classItem.id]: {
                                                    ...prev[classItem.id],
                                                    [student.id]: { ...needsEdit, dyslexia: e.target.checked }
                                                  }
                                                }))
                                              }}
                                              disabled={isSavingNeeds[student.id]}
                                            />
                                            <span>Dyslexia</span>
                                          </label>
                                          <label className={styles.checkboxLabel}>
                                            <input
                                              type="checkbox"
                                              checked={needsEdit.adhd}
                                              onChange={(e) => {
                                                setLocalNeedsEdits(prev => ({
                                                  ...prev,
                                                  [classItem.id]: {
                                                    ...prev[classItem.id],
                                                    [student.id]: { ...needsEdit, adhd: e.target.checked }
                                                  }
                                                }))
                                              }}
                                              disabled={isSavingNeeds[student.id]}
                                            />
                                            <span>ADHD</span>
                                          </label>
                                          <label className={styles.checkboxLabel}>
                                            <input
                                              type="checkbox"
                                              checked={needsEdit.autism}
                                              onChange={(e) => {
                                                setLocalNeedsEdits(prev => ({
                                                  ...prev,
                                                  [classItem.id]: {
                                                    ...prev[classItem.id],
                                                    [student.id]: { ...needsEdit, autism: e.target.checked }
                                                  }
                                                }))
                                              }}
                                              disabled={isSavingNeeds[student.id]}
                                            />
                                            <span>Autism</span>
                                          </label>
                                        </div>
                                        <Input
                                          type="text"
                                          label="Other Needs"
                                          placeholder="e.g., visual impairment, hearing loss"
                                          value={needsEdit.other_needs}
                                          onChange={(e) => {
                                            setLocalNeedsEdits(prev => ({
                                              ...prev,
                                              [classItem.id]: {
                                                ...prev[classItem.id],
                                                [student.id]: { ...needsEdit, other_needs: e.target.value }
                                              }
                                            }))
                                          }}
                                          disabled={isSavingNeeds[student.id]}
                                        />
                                        <Button
                                          variant="primary"
                                          size="sm"
                                          onClick={() => handleSaveSupportNeeds(classItem.id, student.id, needsEdit)}
                                          isLoading={isSavingNeeds[student.id]}
                                          disabled={isSavingNeeds[student.id]}
                                          style={{ marginTop: 'var(--spacing-sm)' }}
                                        >
                                          Save Support Needs
                                        </Button>
                                      </div>

                                      {/* UI Preferences */}
                                      <div className={styles.uiPrefsSection}>
                                        <h6 className={styles.subsectionTitle}>UI Preferences</h6>
                                        <div className={styles.prefsGrid}>
                                          <div>
                                            <label className={styles.selectLabel}>Font Scale</label>
                                            <Select
                                              value={prefsEdit.font_scale}
                                              onChange={(e) => {
                                                setLocalPrefsEdits(prev => ({
                                                  ...prev,
                                                  [classItem.id]: {
                                                    ...prev[classItem.id],
                                                    [student.id]: { ...prefsEdit, font_scale: e.target.value as 'sm' | 'md' | 'lg' | 'xl' }
                                                  }
                                                }))
                                              }}
                                              disabled={isSavingNeeds[student.id]}
                                            >
                                              <option value="sm">Small</option>
                                              <option value="md">Medium</option>
                                              <option value="lg">Large</option>
                                              <option value="xl">Extra Large</option>
                                            </Select>
                                          </div>
                                          <div>
                                            <label className={styles.selectLabel}>Spacing</label>
                                            <Select
                                              value={prefsEdit.spacing}
                                              onChange={(e) => {
                                                setLocalPrefsEdits(prev => ({
                                                  ...prev,
                                                  [classItem.id]: {
                                                    ...prev[classItem.id],
                                                    [student.id]: { ...prefsEdit, spacing: e.target.value as 'sm' | 'md' | 'lg' }
                                                  }
                                                }))
                                              }}
                                              disabled={isSavingNeeds[student.id]}
                                            >
                                              <option value="sm">Small</option>
                                              <option value="md">Medium</option>
                                              <option value="lg">Large</option>
                                            </Select>
                                          </div>
                                        </div>
                                        <div className={styles.checkboxGroup}>
                                          <label className={styles.checkboxLabel}>
                                            <input
                                              type="checkbox"
                                              checked={prefsEdit.reduce_clutter}
                                              onChange={(e) => {
                                                setLocalPrefsEdits(prev => ({
                                                  ...prev,
                                                  [classItem.id]: {
                                                    ...prev[classItem.id],
                                                    [student.id]: { ...prefsEdit, reduce_clutter: e.target.checked }
                                                  }
                                                }))
                                              }}
                                              disabled={isSavingNeeds[student.id]}
                                            />
                                            <span>Reduce Clutter</span>
                                          </label>
                                          <label className={styles.checkboxLabel}>
                                            <input
                                              type="checkbox"
                                              checked={prefsEdit.simplified_language}
                                              onChange={(e) => {
                                                setLocalPrefsEdits(prev => ({
                                                  ...prev,
                                                  [classItem.id]: {
                                                    ...prev[classItem.id],
                                                    [student.id]: { ...prefsEdit, simplified_language: e.target.checked }
                                                  }
                                                }))
                                              }}
                                              disabled={isSavingNeeds[student.id]}
                                            />
                                            <span>Simplified Language</span>
                                          </label>
                                          <label className={styles.checkboxLabel}>
                                            <input
                                              type="checkbox"
                                              checked={prefsEdit.high_contrast}
                                              onChange={(e) => {
                                                setLocalPrefsEdits(prev => ({
                                                  ...prev,
                                                  [classItem.id]: {
                                                    ...prev[classItem.id],
                                                    [student.id]: { ...prefsEdit, high_contrast: e.target.checked }
                                                  }
                                                }))
                                              }}
                                              disabled={isSavingNeeds[student.id]}
                                            />
                                            <span>High Contrast</span>
                                          </label>
                                        </div>
                                        <Button
                                          variant="primary"
                                          size="sm"
                                          onClick={() => handleSaveUiPrefs(classItem.id, student.id, prefsEdit)}
                                          isLoading={isSavingNeeds[student.id]}
                                          disabled={isSavingNeeds[student.id]}
                                          style={{ marginTop: 'var(--spacing-sm)' }}
                                        >
                                          Save UI Preferences
                                        </Button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </>
                        )}
                      </div>
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

