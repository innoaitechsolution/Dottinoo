'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getMyProfile, Profile } from '@/lib/supabase/profile'
import { TaskWithClass } from '@/lib/supabase/tasks'
import { getMyAssignmentForTask, listAssignmentsForTeacherTask, TaskAssignmentWithProfile } from '@/lib/supabase/assignments'
import { getSubmissionByAssignment, Submission } from '@/lib/supabase/submissions'
import { submitTask, reviewTask } from '@/lib/supabase/rpc'
import { uploadSubmissionFile, getSignedUrl } from '@/lib/supabase/storage'
import StatusChip from '@/components/StatusChip'
import Button from '@/components/Button'
import Input from '@/components/Input'
import BackButton from '@/components/BackButton'
import Link from 'next/link'
import styles from './page.module.css'

// Component for downloading attachments with signed URL
function AttachmentDownloadLink({ attachmentPath }: { attachmentPath: string }) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: urlError } = await getSignedUrl(attachmentPath)
      if (urlError) {
        setError('Failed to generate download link')
        setIsLoading(false)
        return
      }
      setDownloadUrl(data)
      if (data) {
        window.open(data, '_blank')
      }
    } catch (err) {
      setError('Failed to generate download link')
    } finally {
      setIsLoading(false)
    }
  }

  const fileName = attachmentPath.split('/').pop() || 'attachment'

  return (
    <div className={styles.attachmentDownload}>
      <Button
        variant="primary"
        size="sm"
        onClick={handleDownload}
        isLoading={isLoading}
        disabled={isLoading}
      >
        {isLoading ? 'Generating...' : 'Download Attachment'}
      </Button>
      {error && <span className={styles.error}>{error}</span>}
      <span className={styles.fileName}>{fileName}</span>
    </div>
  )
}

export default function TaskDetailPage() {
  const router = useRouter()
  const params = useParams()
  const taskId = params.taskId as string

  const [profile, setProfile] = useState<Profile | null>(null)
  const [task, setTask] = useState<TaskWithClass | null>(null)
  const [assignment, setAssignment] = useState<any>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [assignments, setAssignments] = useState<TaskAssignmentWithProfile[]>([])
  const [submissionsMap, setSubmissionsMap] = useState<Record<string, Submission>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Student submission form
  const [content, setContent] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Teacher review forms (indexed by student_id)
  const [reviewForms, setReviewForms] = useState<Record<string, { feedback: string; stars: number }>>({})
  const [isReviewing, setIsReviewing] = useState<Record<string, boolean>>({})
  
  // AI features state
  const [aiFeedbackLoading, setAiFeedbackLoading] = useState<Record<string, boolean>>({})
  const [aiFeedbackError, setAiFeedbackError] = useState<Record<string, string>>({})
  const [aiFeedbackSuggestions, setAiFeedbackSuggestions] = useState<Record<string, any>>({})
  
  // Student AI help state
  const [aiHelpLoading, setAiHelpLoading] = useState<Record<string, boolean>>({})
  const [aiHelpError, setAiHelpError] = useState<Record<string, string>>({})
  const [aiHelpResults, setAiHelpResults] = useState<Record<string, any>>({})
  const [simplifiedInstructions, setSimplifiedInstructions] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }

        const { data: profileData } = await getMyProfile()
        if (!profileData) {
          router.push('/login')
          return
        }
        setProfile(profileData)

        // Load task
        const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .select(`
            *,
            classes (
              id,
              name
            )
          `)
          .eq('id', taskId)
          .single()

        if (taskError || !taskData) {
          setError('Task not found')
          setIsLoading(false)
          return
        }
        setTask(taskData)

        if (profileData.role === 'student') {
          // Load student's assignment - students can ONLY access tasks they're assigned to
          const { data: assignmentData } = await getMyAssignmentForTask(taskId)
          
          if (!assignmentData) {
            setError('This task has not been assigned to you. Please contact your teacher if you believe this is an error.')
            setIsLoading(false)
            return
          }
          
          setAssignment(assignmentData)
          
          const { data: submissionData } = await getSubmissionByAssignment(assignmentData.id)
          setSubmission(submissionData)
          if (submissionData) {
            setContent(submissionData.content)
          }
        } else {
          // Load all assignments for teacher
          const { data: assignmentsData } = await listAssignmentsForTeacherTask(taskId)
          setAssignments(assignmentsData || [])

          // Load submissions and initialize review forms for each assignment
          const forms: Record<string, { feedback: string; stars: number }> = {}
          const submissions: Record<string, Submission> = {}
          
          for (const ass of assignmentsData || []) {
            forms[ass.student_id] = {
              feedback: ass.feedback || '',
              stars: ass.stars_awarded,
            }
            
            const { data: submissionData } = await getSubmissionByAssignment(ass.id)
            if (submissionData) {
              submissions[ass.id] = submissionData
            }
          }
          
          setReviewForms(forms)
          setSubmissionsMap(submissions)
        }
      } catch (err: any) {
        if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
          console.error('[TaskDetailPage] Error:', err?.message, err?.code, err?.details, err?.hint)
        }
        setError(err?.message || 'Failed to load task')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [taskId, router])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setUploadError(null)
    setIsSubmitting(true)

    try {
      let attachmentPath: string | null = null

      // Upload file if selected
      if (selectedFile && assignment) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          throw new Error('Not authenticated')
        }

        const { data: uploadData, error: uploadError } = await uploadSubmissionFile(
          selectedFile,
          user.id,
          assignment.id
        )

        if (uploadError) {
          setUploadError(uploadError.message || 'Failed to upload file')
          setIsSubmitting(false)
          return
        }

        attachmentPath = uploadData
      }

      // Submit task with attachment path
      const { data, error: submitError } = await submitTask(taskId, content, attachmentPath)

      if (submitError) {
        setError(submitError.message || 'Failed to submit task')
        setIsSubmitting(false)
        return
      }

      // Reload assignment and submission
      const { data: assignmentData } = await getMyAssignmentForTask(taskId)
      setAssignment(assignmentData)

      if (assignmentData) {
        const { data: submissionData } = await getSubmissionByAssignment(assignmentData.id)
        setSubmission(submissionData)
      }

      setSelectedFile(null)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReview = async (studentId: string) => {
    const form = reviewForms[studentId]
    if (!form) return

    setIsReviewing(prev => ({ ...prev, [studentId]: true }))
    setError(null)

    try {
      const { data, error: reviewError } = await reviewTask(
        taskId,
        studentId,
        form.feedback,
        form.stars
      )

      if (reviewError) {
        setError(reviewError.message || 'Failed to review task')
        setIsReviewing(prev => ({ ...prev, [studentId]: false }))
        return
      }

      // Reload assignments
      const { data: assignmentsData } = await listAssignmentsForTeacherTask(taskId)
      setAssignments(assignmentsData || [])
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsReviewing(prev => ({ ...prev, [studentId]: false }))
    }
  }

  const updateReviewForm = (studentId: string, field: 'feedback' | 'stars', value: string | number) => {
    setReviewForms(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }))
  }

  // AI Feedback Draft Handler (Teacher)
  const handleAIFeedbackDraft = async (studentId: string, submission: Submission | null) => {
    if (!submission || !task) return

    setAiFeedbackLoading(prev => ({ ...prev, [studentId]: true }))
    setAiFeedbackError(prev => ({ ...prev, [studentId]: '' }))

    try {
      // Get session token for auth
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch('/api/ai/feedback-draft', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          taskTitle: task.title,
          taskInstructions: task.instructions,
          successCriteria: task.success_criteria,
          studentSubmission: submission.content,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to generate feedback suggestions')
      }

      const data = await response.json()
      setAiFeedbackSuggestions(prev => ({ ...prev, [studentId]: data }))
    } catch (err: any) {
      setAiFeedbackError(prev => ({ ...prev, [studentId]: err.message || 'Failed to load AI suggestions' }))
    } finally {
      setAiFeedbackLoading(prev => ({ ...prev, [studentId]: false }))
    }
  }

  const insertAIFeedback = (studentId: string, feedbackText: string) => {
    const currentFeedback = reviewForms[studentId]?.feedback || ''
    const newFeedback = currentFeedback ? `${currentFeedback}\n\n${feedbackText}` : feedbackText
    updateReviewForm(studentId, 'feedback', newFeedback)
  }

  // AI Help Handlers (Student)
  const handleAIRewrite = async (mode: 'simplify' | 'bullet_points' | 'dyslexia_friendly' | 'shorten') => {
    if (!task) return

    const key = `rewrite-${mode}`
    setAiHelpLoading(prev => ({ ...prev, [key]: true }))
    setAiHelpError(prev => ({ ...prev, [key]: '' }))

    try {
      // Get session token for auth
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch('/api/ai/rewrite', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text: task.instructions,
          mode,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to rewrite instructions')
      }

      const data = await response.json()
      if (mode === 'simplify') {
        setSimplifiedInstructions(data.rewrittenText)
      } else {
        setAiHelpResults(prev => ({ ...prev, [key]: data.rewrittenText }))
      }
    } catch (err: any) {
      setAiHelpError(prev => ({ ...prev, [key]: err.message || 'Failed to rewrite' }))
    } finally {
      setAiHelpLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  const handleAIHint = async (requestType: 'next_step' | 'checklist' | 'questions') => {
    if (!task) return

    setAiHelpLoading(prev => ({ ...prev, [requestType]: true }))
    setAiHelpError(prev => ({ ...prev, [requestType]: '' }))

    try {
      // Get session token for auth
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch('/api/ai/hint', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          taskContext: `${task.title}: ${task.instructions}`,
          successCriteria: task.success_criteria,
          requestType,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to generate hints')
      }

      const data = await response.json()
      setAiHelpResults(prev => ({ ...prev, [requestType]: data }))
    } catch (err: any) {
      setAiHelpError(prev => ({ ...prev, [requestType]: err.message || 'Failed to load hints' }))
    } finally {
      setAiHelpLoading(prev => ({ ...prev, [requestType]: false }))
    }
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  if (!profile || !task) {
    return (
      <div className={styles.container}>
        <div className={styles.errorMessage}>
          {error || 'Task not found'}
        </div>
      </div>
    )
  }

  const isTeacher = profile.role === 'teacher'
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
        <BackButton fallbackHref="/app/tasks" className={styles.backButton} />
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/app" className={styles.breadcrumbLink}>Dashboard</Link>
          <span className={styles.breadcrumbSeparator}>→</span>
          <Link href="/app/tasks" className={styles.breadcrumbLink}>Tasks</Link>
          <span className={styles.breadcrumbSeparator}>→</span>
          <span className={styles.breadcrumbCurrent}>{task.title}</span>
        </nav>
        <div className={styles.header}>
          <h1 className={styles.title}>{task.title}</h1>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        {task.classes && (
          <p className={styles.className}>Class: {task.classes.name}</p>
        )}

        {task.due_date && (
          <p className={styles.dueDate}>Due: {formatDate(task.due_date)}</p>
        )}

        <div className={styles.taskContent}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Instructions</h2>
            <p className={styles.instructions}>{task.instructions}</p>
          </section>

          {task.steps && task.steps.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Steps</h2>
              <ol className={styles.stepsList}>
                {task.steps.map((step: string, index: number) => (
                  <li key={index} className={styles.stepItem}>{step}</li>
                ))}
              </ol>
            </section>
          )}

          {task.success_criteria && task.success_criteria.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Success Criteria</h2>
              <ul className={styles.criteriaList}>
                {task.success_criteria.map((criterion: string, index: number) => (
                  <li key={index} className={styles.criterionItem}>{criterion}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Differentiation: Teacher-only in MVP to avoid confusion/stigma for students.
              Teachers use this for planning; students receive guidance directly from teachers. */}
          {isTeacher && task.differentiation && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Differentiation</h2>
              <div className={styles.differentiation}>
                <div className={styles.diffItem}>
                  <h3 className={styles.diffLabel}>Easier</h3>
                  <p>{task.differentiation.easier || 'N/A'}</p>
                </div>
                <div className={styles.diffItem}>
                  <h3 className={styles.diffLabel}>Standard</h3>
                  <p>{task.differentiation.standard || 'N/A'}</p>
                </div>
                <div className={styles.diffItem}>
                  <h3 className={styles.diffLabel}>Stretch</h3>
                  <p>{task.differentiation.stretch || 'N/A'}</p>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Student View: AI Help Section */}
        {!isTeacher && (
          <div className={styles.section} style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--color-bg-blue-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-bg-blue-100)' }}>
            <h2 className={styles.sectionTitle}>AI Help</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-soft)', marginBottom: '1rem' }}>
              Hints guide you — they don't do the work for you.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Simplify Instructions */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Simplify Instructions</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAIRewrite('simplify')}
                    disabled={aiHelpLoading['rewrite-simplify']}
                    isLoading={aiHelpLoading['rewrite-simplify']}
                  >
                    Simplify
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAIRewrite('bullet_points')}
                    disabled={aiHelpLoading['rewrite-bullet_points']}
                    isLoading={aiHelpLoading['rewrite-bullet_points']}
                  >
                    Bullet Points
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAIRewrite('dyslexia_friendly')}
                    disabled={aiHelpLoading['rewrite-dyslexia_friendly']}
                    isLoading={aiHelpLoading['rewrite-dyslexia_friendly']}
                  >
                    Dyslexia-Friendly
                  </Button>
                </div>
                {aiHelpError['rewrite-simplify'] && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-energy-orange)', marginTop: '0.5rem' }}>
                    {aiHelpError['rewrite-simplify']}
                  </p>
                )}
                {simplifiedInstructions && (
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--color-white)', borderRadius: 'var(--radius-md)' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Simplified Version:</p>
                    <p style={{ fontSize: '0.875rem' }}>{simplifiedInstructions}</p>
                  </div>
                )}
              </div>

              {/* Get Hints */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Get a Hint</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAIHint('next_step')}
                    disabled={aiHelpLoading['next_step']}
                    isLoading={aiHelpLoading['next_step']}
                  >
                    Next Step
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAIHint('checklist')}
                    disabled={aiHelpLoading['checklist']}
                    isLoading={aiHelpLoading['checklist']}
                  >
                    Checklist
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAIHint('questions')}
                    disabled={aiHelpLoading['questions']}
                    isLoading={aiHelpLoading['questions']}
                  >
                    Questions
                  </Button>
                </div>
                {(aiHelpError['next_step'] || aiHelpError['checklist'] || aiHelpError['questions']) && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-energy-orange)', marginTop: '0.5rem' }}>
                    {aiHelpError['next_step'] || aiHelpError['checklist'] || aiHelpError['questions']}
                  </p>
                )}
                {(aiHelpResults['next_step'] || aiHelpResults['checklist'] || aiHelpResults['questions']) && (
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--color-white)', borderRadius: 'var(--radius-md)' }}>
                    {aiHelpResults['next_step']?.refusal && (
                      <p style={{ fontSize: '0.875rem', color: 'var(--color-energy-orange)', marginBottom: '0.5rem', fontStyle: 'italic' }}>
                        {aiHelpResults['next_step'].refusal}
                      </p>
                    )}
                    {aiHelpResults['next_step']?.hints && aiHelpResults['next_step'].hints.length > 0 && (
                      <div style={{ marginBottom: '0.75rem' }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>Hints:</p>
                        <ul style={{ fontSize: '0.875rem', paddingLeft: '1.25rem' }}>
                          {aiHelpResults['next_step'].hints.map((hint: string, idx: number) => (
                            <li key={idx} style={{ marginBottom: '0.25rem' }}>{hint}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiHelpResults['checklist']?.checklist && aiHelpResults['checklist'].checklist.length > 0 && (
                      <div style={{ marginBottom: '0.75rem' }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>Checklist:</p>
                        <ul style={{ fontSize: '0.875rem', paddingLeft: '1.25rem' }}>
                          {aiHelpResults['checklist'].checklist.map((item: string, idx: number) => (
                            <li key={idx} style={{ marginBottom: '0.25rem' }}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiHelpResults['questions']?.questions && aiHelpResults['questions'].questions.length > 0 && (
                      <div>
                        <p style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>Questions to Consider:</p>
                        <ul style={{ fontSize: '0.875rem', paddingLeft: '1.25rem' }}>
                          {aiHelpResults['questions'].questions.map((q: string, idx: number) => (
                            <li key={idx} style={{ marginBottom: '0.25rem' }}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Student View: Submission Form */}
        {!isTeacher && (
          <div className={styles.submissionSection}>
            <div className={styles.statusBanner}>
              {assignment?.status && (
                <>
                  <StatusChip status={assignment.status as any} />
                  {assignment.status === 'reviewed' && assignment.stars_awarded > 0 && (
                    <div className={styles.starsBanner}>
                      <span className={styles.starsLabel}>Stars earned:</span>
                      <span className={styles.starsValue}>{'⭐'.repeat(assignment.stars_awarded)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
            <h2 className={styles.sectionTitle}>
              {assignment?.status === 'submitted' || assignment?.status === 'reviewed'
                ? 'Your Submission'
                : 'Submit Your Work'}
            </h2>

            {assignment?.status === 'submitted' || assignment?.status === 'reviewed' ? (
              <div className={styles.submittedContent}>
                <div className={styles.submissionContent}>
                  <h3 className={styles.subLabel}>Your Response:</h3>
                  <p className={styles.submissionText}>{submission?.content || 'No content'}</p>
                </div>
                {submission?.attachment_path && (
                  <div className={styles.attachment}>
                    <h3 className={styles.subLabel}>Attachment:</h3>
                    <AttachmentDownloadLink attachmentPath={submission.attachment_path} />
                  </div>
                )}
                {assignment.status === 'reviewed' && (
                  <div className={styles.reviewFeedback}>
                    <h3 className={styles.subLabel}>Teacher Feedback:</h3>
                    <p className={styles.feedbackText}>{assignment.feedback || 'No feedback provided'}</p>
                    {assignment.stars_awarded > 0 && (
                      <div className={styles.stars}>
                        <span className={styles.starsLabel}>Stars: </span>
                        <span className={styles.starsValue}>{'⭐'.repeat(assignment.stars_awarded)}</span>
                      </div>
                    )}
                  </div>
                )}
                <p className={styles.statusBadge}>
                  Status: <strong>{assignment.status}</strong>
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className={styles.submissionForm}>
                <div className={styles.textAreaWrapper}>
                  <label htmlFor="content" className={styles.label}>
                    Your Response *
                  </label>
                  <textarea
                    id="content"
                    className={styles.textarea}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    disabled={isSubmitting}
                    rows={8}
                    placeholder="Write your response here..."
                  />
                </div>

                <div className={styles.fileInputWrapper}>
                  <label htmlFor="attachmentFile" className={styles.label}>
                    Attachment (Optional)
                  </label>
                  <input
                    id="attachmentFile"
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      setSelectedFile(file)
                      setUploadError(null)
                    }}
                    disabled={isSubmitting}
                    className={styles.fileInput}
                  />
                  {selectedFile && (
                    <p className={styles.fileName}>{selectedFile.name}</p>
                  )}
                  {uploadError && (
                    <span className={styles.error}>{uploadError}</span>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isSubmitting}
                  className={styles.submitButton}
                >
                  Submit Task
                </Button>
              </form>
            )}
          </div>
        )}

        {/* Teacher View: Review Section */}
        {isTeacher && (
          <div className={styles.reviewSection}>
            <h2 className={styles.sectionTitle}>Student Submissions</h2>
            {assignments.length === 0 ? (
              <p className={styles.emptyMessage}>No students assigned to this task yet.</p>
            ) : (
              <div className={styles.assignmentsList}>
                {assignments.map((ass) => {
                  const studentName = ass.profiles?.full_name || ass.profiles?.id || 'Unknown Student'
                  const form = reviewForms[ass.student_id] || { feedback: '', stars: 0 }
                  const isReviewingThis = isReviewing[ass.student_id] || false

                  return (
                    <div key={ass.id} className={styles.assignmentCard}>
                      <div className={styles.studentHeader}>
                        <h3 className={styles.studentName}>{studentName}</h3>
                        <div className={styles.studentStatusRow}>
                          <StatusChip status={ass.status as any} />
                          {ass.stars_awarded > 0 && (
                            <span className={styles.starsDisplay}>
                              {'⭐'.repeat(ass.stars_awarded)} stars
                            </span>
                          )}
                        </div>
                      </div>

                      {submissionsMap[ass.id] && (
                        <div className={styles.studentSubmission}>
                          <h4 className={styles.subLabel}>Submission:</h4>
                          <p className={styles.submissionText}>{submissionsMap[ass.id].content}</p>
                          {submissionsMap[ass.id].attachment_path && (
                            <div className={styles.attachment}>
                              <AttachmentDownloadLink attachmentPath={submissionsMap[ass.id].attachment_path!} />
                            </div>
                          )}
                        </div>
                      )}

                      {ass.status === 'submitted' || ass.status === 'reviewed' ? (
                        <div className={styles.reviewForm}>
                          <div className={styles.textAreaWrapper}>
                            <label htmlFor={`feedback-${ass.student_id}`} className={styles.label}>
                              Feedback
                            </label>
                            {ass.status === 'submitted' && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    const currentFeedback = reviewForms[ass.student_id]?.feedback || ''
                                    const newFeedback = currentFeedback ? `${currentFeedback}\n\nGreat job! You've demonstrated a good understanding of the topic.` : 'Great job! You\'ve demonstrated a good understanding of the topic.'
                                    updateReviewForm(ass.student_id, 'feedback', newFeedback)
                                  }}
                                  disabled={isReviewingThis}
                                >
                                  Great job
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    const currentFeedback = reviewForms[ass.student_id]?.feedback || ''
                                    const newFeedback = currentFeedback ? `${currentFeedback}\n\nNext step: Consider exploring this further by...` : 'Next step: Consider exploring this further by...'
                                    updateReviewForm(ass.student_id, 'feedback', newFeedback)
                                  }}
                                  disabled={isReviewingThis}
                                >
                                  Next step
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    const currentFeedback = reviewForms[ass.student_id]?.feedback || ''
                                    const newFeedback = currentFeedback ? `${currentFeedback}\n\nBe more specific: Please provide more detail about...` : 'Be more specific: Please provide more detail about...'
                                    updateReviewForm(ass.student_id, 'feedback', newFeedback)
                                  }}
                                  disabled={isReviewingThis}
                                >
                                  Be more specific
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    const currentFeedback = reviewForms[ass.student_id]?.feedback || ''
                                    const newFeedback = currentFeedback ? `${currentFeedback}\n\nPlease check your spelling and grammar.` : 'Please check your spelling and grammar.'
                                    updateReviewForm(ass.student_id, 'feedback', newFeedback)
                                  }}
                                  disabled={isReviewingThis}
                                >
                                  Check spelling
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    const currentFeedback = reviewForms[ass.student_id]?.feedback || ''
                                    const newFeedback = currentFeedback ? `${currentFeedback}\n\nTry the stretch task to challenge yourself further!` : 'Try the stretch task to challenge yourself further!'
                                    updateReviewForm(ass.student_id, 'feedback', newFeedback)
                                  }}
                                  disabled={isReviewingThis}
                                >
                                  Try stretch task
                                </Button>
                                <Button
                                  type="button"
                                  variant="primary"
                                  size="sm"
                                  onClick={() => {
                                    updateReviewForm(ass.student_id, 'feedback', 'Great job! You\'ve demonstrated a good understanding of the topic.')
                                    updateReviewForm(ass.student_id, 'stars', 4)
                                  }}
                                  disabled={isReviewingThis}
                                >
                                  Great job + 4⭐
                                </Button>
                                <Button
                                  type="button"
                                  variant="energy"
                                  size="sm"
                                  onClick={() => handleAIFeedbackDraft(ass.student_id, submissionsMap[ass.id])}
                                  disabled={isReviewingThis || aiFeedbackLoading[ass.student_id] || !submissionsMap[ass.id]}
                                  isLoading={aiFeedbackLoading[ass.student_id]}
                                >
                                  🤖 AI feedback suggestions
                                </Button>
                              </div>
                            )}
                            {aiFeedbackError[ass.student_id] && (
                              <div className={styles.error} style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                {aiFeedbackError[ass.student_id]}
                              </div>
                            )}
                            {aiFeedbackSuggestions[ass.student_id] && (
                              <div style={{ marginBottom: '0.75rem', padding: '0.75rem', background: 'var(--color-bg-blue-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-bg-blue-100)' }}>
                                <p style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>AI Suggestions:</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                  {aiFeedbackSuggestions[ass.student_id].options?.map((option: any, idx: number) => (
                                    <Button
                                      key={idx}
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => {
                                        insertAIFeedback(ass.student_id, option.text)
                                        if (aiFeedbackSuggestions[ass.student_id].starsSuggestion !== undefined) {
                                          updateReviewForm(ass.student_id, 'stars', aiFeedbackSuggestions[ass.student_id].starsSuggestion)
                                        }
                                      }}
                                      disabled={isReviewingThis}
                                    >
                                      {option.title}: {option.text.substring(0, 50)}...
                                    </Button>
                                  ))}
                                  {aiFeedbackSuggestions[ass.student_id].nextStep && (
                                    <p style={{ fontSize: '0.875rem', fontStyle: 'italic', marginTop: '0.25rem' }}>
                                      Next step: {aiFeedbackSuggestions[ass.student_id].nextStep}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                            <textarea
                              id={`feedback-${ass.student_id}`}
                              className={styles.textarea}
                              value={form.feedback}
                              onChange={(e) => updateReviewForm(ass.student_id, 'feedback', e.target.value)}
                              disabled={isReviewingThis || ass.status === 'reviewed'}
                              rows={4}
                              placeholder="Provide feedback to the student..."
                            />
                          </div>

                          <div className={styles.starsSelector}>
                            <label className={styles.label}>Stars (0-5):</label>
                            <select
                              value={form.stars}
                              onChange={(e) => updateReviewForm(ass.student_id, 'stars', parseInt(e.target.value))}
                              disabled={isReviewingThis || ass.status === 'reviewed'}
                              className={styles.starsSelect}
                            >
                              {[0, 1, 2, 3, 4, 5].map(num => (
                                <option key={num} value={num}>{num}</option>
                              ))}
                            </select>
                          </div>

                          {ass.status === 'submitted' && (
                            <Button
                              variant="primary"
                              onClick={() => handleReview(ass.student_id)}
                              isLoading={isReviewingThis}
                              disabled={isReviewingThis}
                            >
                              Mark Reviewed
                            </Button>
                          )}

                          {ass.status === 'reviewed' && (
                            <p className={styles.reviewedNote}>
                              Reviewed on {ass.reviewed_at ? formatDate(ass.reviewed_at) : 'N/A'}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className={styles.notSubmitted}>Not submitted yet</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

