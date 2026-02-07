'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getMyProfile, Profile } from '@/lib/supabase/profile'
import { listMyClasses, Class } from '@/lib/supabase/classes'
import { getTemplate, getTemplateKeys, getTemplateDisplayName } from '@/lib/templates/taskTemplates'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Select from '@/components/Select'
import styles from './page.module.css'

type CreationMode = 'manual' | 'template' | 'ai'

export default function NewTaskPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [classes, setClasses] = useState<Class[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [classId, setClassId] = useState('')
  const [subject, setSubject] = useState('')
  const [timeEstimate, setTimeEstimate] = useState('30 minutes')
  const [supportNeeds, setSupportNeeds] = useState('')
  const [mode, setMode] = useState<CreationMode>('manual')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [aiBrief, setAiBrief] = useState('')
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false)

  // Task content
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [steps, setSteps] = useState<string[]>([''])
  const [differentiation, setDifferentiation] = useState({
    easier: '',
    standard: '',
    stretch: '',
  })
  const [successCriteria, setSuccessCriteria] = useState<string[]>([''])
  const [dueDate, setDueDate] = useState('')

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

        if (profileData.role !== 'teacher') {
          // Not a teacher, show message
          setIsLoading(false)
          return
        }

        setProfile(profileData)

        const { data: classesData } = await listMyClasses()
        setClasses(classesData || [])
      } catch (err) {
        console.error('Error loading data:', err)
        setError('Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [router])

  const handleTemplateSelect = (templateKey: string) => {
    if (!templateKey) return

    const template = getTemplate(templateKey, subject, timeEstimate)
    if (!template) return

    setTitle(template.title)
    setInstructions(template.instructions)
    setSteps(template.steps)
    setDifferentiation(template.differentiation)
    setSuccessCriteria(template.successCriteria)
  }

  const handleGenerateDraft = async () => {
    if (!aiBrief.trim()) {
      setError('Please provide a brief description for AI generation')
      return
    }

    setIsGeneratingDraft(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/task-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: aiBrief,
          subject,
          timeEstimate,
          supportNeeds: supportNeeds || null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate draft')
      }

      const draft = await response.json()

      setTitle(draft.title || '')
      setInstructions(draft.instructions || '')
      setSteps(draft.steps || [''])
      setDifferentiation(draft.differentiation || { easier: '', standard: '', stretch: '' })
      setSuccessCriteria(draft.successCriteria || [''])
    } catch (err) {
      console.error('Error generating draft:', err)
      setError('Failed to generate draft. Please try manual entry.')
    } finally {
      setIsGeneratingDraft(false)
    }
  }

  const addStep = () => {
    setSteps([...steps, ''])
  }

  const updateStep = (index: number, value: string) => {
    const newSteps = [...steps]
    newSteps[index] = value
    setSteps(newSteps)
  }

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index))
    }
  }

  const addCriterion = () => {
    setSuccessCriteria([...successCriteria, ''])
  }

  const updateCriterion = (index: number, value: string) => {
    const newCriteria = [...successCriteria]
    newCriteria[index] = value
    setSuccessCriteria(newCriteria)
  }

  const removeCriterion = (index: number) => {
    if (successCriteria.length > 1) {
      setSuccessCriteria(successCriteria.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!classId) {
      setError('Please select a class')
      return
    }

    if (!title.trim() || !instructions.trim()) {
      setError('Title and instructions are required')
      return
    }

    setIsSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      // Create task (base columns only; target_skill/target_level require migration 013/017)
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          class_id: classId,
          created_by: user.id,
          title: title.trim(),
          instructions: instructions.trim(),
          steps: steps.filter(s => s.trim()).map(s => s.trim()),
          differentiation: differentiation,
          success_criteria: successCriteria.filter(c => c.trim()).map(c => c.trim()),
          due_date: dueDate || null,
          creation_mode: mode,
        })
        .select()
        .maybeSingle()

      if (taskError) {
        throw taskError
      }
      if (!task) {
        throw new Error('Task was not created. Please try again.')
      }

      // Create task assignments for all students in the class
      const { data: memberships } = await supabase
        .from('class_memberships')
        .select('student_id')
        .eq('class_id', classId)

      if (memberships && memberships.length > 0) {
        const assignments = memberships.map(m => ({
          task_id: task.id,
          student_id: m.student_id,
          status: 'not_started',
        }))

        const { error: assignmentError } = await supabase
          .from('task_assignments')
          .insert(assignments)

        if (assignmentError) {
          throw assignmentError
        }
      }

      router.push('/app/tasks')
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to create task'
      const errDetails = err?.details ? ` (${err.details})` : ''
      const errHint = err?.hint ? ` Hint: ${err.hint}` : ''
      const errCode = err?.code ? ` [${err.code}]` : ''
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.error('Error creating task:', { message: err?.message, code: err?.code, details: err?.details, hint: err?.hint })
      }
      setError(`${errMsg}${errDetails}${errHint}${errCode}`)
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

  if (!profile || profile.role !== 'teacher') {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <p className={styles.notTeacherMessage}>
            Only teachers can create tasks. If you believe this is an error, please contact support.
          </p>
          <Button variant="primary" onClick={() => router.push('/app/tasks')}>
            Back to Tasks
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Create New Task</h1>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Class Selection */}
          <Select
            id="classId"
            label="Class *"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            required
            disabled={isSubmitting}
          >
            <option value="">Select a class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>

          {/* Subject/Topic */}
          <Input
            id="subject"
            type="text"
            label="Subject/Topic"
            placeholder="e.g., Fractions, Reading Comprehension"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={isSubmitting}
          />

          {/* Time Estimate */}
          <Select
            id="timeEstimate"
            label="Time Estimate"
            value={timeEstimate}
            onChange={(e) => setTimeEstimate(e.target.value)}
            disabled={isSubmitting}
          >
            <option value="15 minutes">15 minutes</option>
            <option value="30 minutes">30 minutes</option>
            <option value="45 minutes">45 minutes</option>
            <option value="1 hour">1 hour</option>
            <option value="1-2 hours">1-2 hours</option>
            <option value="2+ hours">2+ hours</option>
          </Select>

          {/* Support Needs */}
          <Input
            id="supportNeeds"
            type="text"
            label="Support Needs (Optional)"
            placeholder="e.g., Visual aids, Extra time"
            value={supportNeeds}
            onChange={(e) => setSupportNeeds(e.target.value)}
            disabled={isSubmitting}
          />

          {/* Creation Mode */}
          <div className={styles.modeSection}>
            <label className={styles.modeLabel}>Creation Mode *</label>
            <div className={styles.modeOptions}>
              <label className={styles.modeOption}>
                <input
                  type="radio"
                  name="mode"
                  value="manual"
                  checked={mode === 'manual'}
                  onChange={(e) => setMode(e.target.value as CreationMode)}
                  disabled={isSubmitting}
                />
                <span>Manual</span>
              </label>
              <label className={styles.modeOption}>
                <input
                  type="radio"
                  name="mode"
                  value="template"
                  checked={mode === 'template'}
                  onChange={(e) => setMode(e.target.value as CreationMode)}
                  disabled={isSubmitting}
                />
                <span>Template</span>
              </label>
              <label className={styles.modeOption}>
                <input
                  type="radio"
                  name="mode"
                  value="ai"
                  checked={mode === 'ai'}
                  onChange={(e) => setMode(e.target.value as CreationMode)}
                  disabled={isSubmitting}
                />
                <span>AI Assist</span>
              </label>
            </div>
          </div>

          {/* Template Selector */}
          {mode === 'template' && (
            <Select
              id="template"
              label="Choose Template"
              value={selectedTemplate}
              onChange={(e) => {
                setSelectedTemplate(e.target.value)
                handleTemplateSelect(e.target.value)
              }}
              disabled={isSubmitting}
            >
              <option value="">Select a template</option>
              {getTemplateKeys().map((key) => (
                <option key={key} value={key}>
                  {getTemplateDisplayName(key)}
                </option>
              ))}
            </Select>
          )}

          {/* AI Brief */}
          {mode === 'ai' && (
            <div className={styles.aiSection}>
              <Input
                id="aiBrief"
                type="text"
                label="Task Brief"
                placeholder="Describe what you want the task to cover..."
                value={aiBrief}
                onChange={(e) => setAiBrief(e.target.value)}
                disabled={isSubmitting || isGeneratingDraft}
              />
              <Button
                type="button"
                variant="reward"
                onClick={handleGenerateDraft}
                isLoading={isGeneratingDraft}
                disabled={isSubmitting || !aiBrief.trim()}
              >
                Generate Draft
              </Button>
            </div>
          )}

          {/* Title */}
          <Input
            id="title"
            type="text"
            label="Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={isSubmitting}
          />

          {/* Instructions */}
          <div className={styles.textAreaWrapper}>
            <label htmlFor="instructions" className={styles.label}>
              Instructions *
            </label>
            <textarea
              id="instructions"
              className={styles.textarea}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              required
              disabled={isSubmitting}
              rows={5}
            />
          </div>

          {/* Steps */}
          <div className={styles.listSection}>
            <label className={styles.label}>Steps</label>
            {steps.map((step, index) => (
              <div key={index} className={styles.listItem}>
                <Input
                  type="text"
                  value={step}
                  onChange={(e) => updateStep(index, e.target.value)}
                  placeholder={`Step ${index + 1}`}
                  disabled={isSubmitting}
                />
                {steps.length > 1 && (
                  <Button
                    type="button"
                    variant="energy"
                    size="sm"
                    onClick={() => removeStep(index)}
                    disabled={isSubmitting}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={addStep}
              disabled={isSubmitting}
            >
              Add Step
            </Button>
          </div>

          {/* Differentiation */}
          <div className={styles.differentiationSection}>
            <label className={styles.label}>Differentiation</label>
            <div className={styles.textAreaWrapper}>
              <label htmlFor="easier" className={styles.subLabel}>Easier</label>
              <textarea
                id="easier"
                className={styles.textarea}
                value={differentiation.easier}
                onChange={(e) => setDifferentiation({ ...differentiation, easier: e.target.value })}
                disabled={isSubmitting}
                rows={3}
              />
            </div>
            <div className={styles.textAreaWrapper}>
              <label htmlFor="standard" className={styles.subLabel}>Standard</label>
              <textarea
                id="standard"
                className={styles.textarea}
                value={differentiation.standard}
                onChange={(e) => setDifferentiation({ ...differentiation, standard: e.target.value })}
                disabled={isSubmitting}
                rows={3}
              />
            </div>
            <div className={styles.textAreaWrapper}>
              <label htmlFor="stretch" className={styles.subLabel}>Stretch</label>
              <textarea
                id="stretch"
                className={styles.textarea}
                value={differentiation.stretch}
                onChange={(e) => setDifferentiation({ ...differentiation, stretch: e.target.value })}
                disabled={isSubmitting}
                rows={3}
              />
            </div>
          </div>

          {/* Success Criteria */}
          <div className={styles.listSection}>
            <label className={styles.label}>Success Criteria</label>
            {successCriteria.map((criterion, index) => (
              <div key={index} className={styles.listItem}>
                <Input
                  type="text"
                  value={criterion}
                  onChange={(e) => updateCriterion(index, e.target.value)}
                  placeholder={`Criterion ${index + 1}`}
                  disabled={isSubmitting}
                />
                {successCriteria.length > 1 && (
                  <Button
                    type="button"
                    variant="energy"
                    size="sm"
                    onClick={() => removeCriterion(index)}
                    disabled={isSubmitting}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={addCriterion}
              disabled={isSubmitting}
            >
              Add Criterion
            </Button>
          </div>

          {/* Due Date */}
          <Input
            id="dueDate"
            type="date"
            label="Due Date (Optional)"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={isSubmitting}
          />

          <div className={styles.actions}>
            <Button
              type="button"
              variant="primary"
              onClick={() => router.push('/app/tasks')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
            >
              Create Task
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

