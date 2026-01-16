'use client'

import { useEffect, useState, FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getMyProfile, Profile } from '@/lib/supabase/profile'
import { listMyClasses, Class, getClassStudents, ClassStudent } from '@/lib/supabase/classes'
import { DIGITAL_SKILLS, SKILL_LEVELS, DigitalSkill, SkillLevel, getStudentsWithSkills, StudentWithSkills } from '@/lib/supabase/skillProfiles'
import { getTemplate, getTemplateKeys, getTemplateDisplayName } from '@/lib/templates/taskTemplates'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Select from '@/components/Select'
import BackButton from '@/components/BackButton'
import styles from './page.module.css'

type CreationMode = 'manual' | 'template' | 'ai'

function NewTaskPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
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
  
  // Assignment state
  const [assignTo, setAssignTo] = useState<'whole_class' | 'selected_students'>('whole_class')
  const [classStudents, setClassStudents] = useState<ClassStudent[]>([])
  const [studentsWithSkills, setStudentsWithSkills] = useState<StudentWithSkills[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  
  // Digital skills targeting
  const [targetSkill, setTargetSkill] = useState<DigitalSkill | ''>('')
  const [targetLevel, setTargetLevel] = useState<SkillLevel | ''>('')

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

        const { data: classesData, error: classesError } = await listMyClasses()
        if (classesError) {
          const errorMsg = classesError.message || 'Failed to load classes'
          const errorDetails = classesError.details ? ` (${classesError.details})` : ''
          setError(`Failed to load classes: ${errorMsg}${errorDetails}`)
        } else {
          setClasses(classesData || [])
        }

        // Handle class selection from query param or auto-select single class
        const classIdParam = searchParams.get('classId')
        if (classesData && classesData.length > 0) {
          if (classIdParam) {
            // Validate that classId exists in teacher's classes
            const isValidClass = classesData.some(c => c.id === classIdParam)
            if (isValidClass) {
              setClassId(classIdParam)
            }
          } else if (classesData.length === 1) {
            // Auto-select if teacher has exactly one class
            setClassId(classesData[0].id)
          }
        }
      } catch (err) {
        console.error('Error loading data:', err)
        setError('Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [router, searchParams])

  // Load students when class is selected
  useEffect(() => {
    const loadStudents = async () => {
      if (!classId) {
        setClassStudents([])
        setStudentsWithSkills([])
        setSelectedStudentIds(new Set())
        return
      }

      setIsLoadingStudents(true)
      
      // Load basic student list
      const { data: studentsData, error: studentsError } = await getClassStudents(classId)
      if (studentsError) {
        console.error('Error loading students:', studentsError)
        setClassStudents([])
      } else {
        setClassStudents(studentsData || [])
      }

      // Load students with skill profiles
      const { data: skillsData, error: skillsError } = await getStudentsWithSkills(classId)
      if (skillsError) {
        console.error('Error loading student skills:', skillsError)
        setStudentsWithSkills([])
      } else {
        setStudentsWithSkills(skillsData || [])
      }
      
      setIsLoadingStudents(false)
    }

    loadStudents()
  }, [classId])

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

  // Auto-suggest students when target skill/level is selected (if "Selected students" is chosen)
  useEffect(() => {
    if (targetSkill && targetLevel && assignTo === 'selected_students' && studentsWithSkills.length > 0 && classId) {
      // Find students who match the skill and level
      const matchingStudentIds = studentsWithSkills
        .filter(student => student.skills[targetSkill] === targetLevel)
        .map(student => student.id)

      if (matchingStudentIds.length > 0) {
        // Preselect matching students (but keep any manually selected ones that don't match)
        setSelectedStudentIds(prev => {
          const newSelection = new Set(prev)
          matchingStudentIds.forEach(id => newSelection.add(id))
          return newSelection
        })
      }
    } else if (assignTo === 'whole_class') {
      // Clear selection when switching to whole class
      setSelectedStudentIds(new Set())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetSkill, targetLevel, assignTo, classId]) // Trigger when skill/level/assignTo/classId changes

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

    if (assignTo === 'selected_students' && selectedStudentIds.size === 0) {
      setError('Please select at least one student')
      return
    }

    setIsSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      // Create task
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
          target_skill: targetSkill || null,
          target_level: targetLevel || null,
        })
        .select()
        .single()

      if (taskError) {
        throw taskError
      }

      // Create task assignments based on assignment type
      let studentIdsToAssign: string[] = []
      
      if (assignTo === 'whole_class') {
        // Assign to all students in the class
        const { data: memberships } = await supabase
          .from('class_memberships')
          .select('student_id')
          .eq('class_id', classId)

        if (memberships && memberships.length > 0) {
          studentIdsToAssign = memberships.map(m => m.student_id)
        }
      } else {
        // Assign only to selected students
        studentIdsToAssign = Array.from(selectedStudentIds)
      }

      if (studentIdsToAssign.length > 0) {
        const assignments = studentIdsToAssign.map(studentId => ({
          task_id: task.id,
          student_id: studentId,
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
      console.error('Error creating task:', err)
      setError(err.message || 'Failed to create task')
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
        <BackButton fallbackHref="/app/tasks" className={styles.backButton} />
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

          {/* Digital Skills Targeting (Optional) */}
          <div className={styles.section}>
            <label className={styles.label}>Target Digital Skill (Optional)</label>
            <p className={styles.helpText}>
              Optionally target this task to a specific digital skill and level
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
              <Select
                id="targetSkill"
                label="Skill"
                value={targetSkill}
                onChange={(e) => setTargetSkill(e.target.value as DigitalSkill | '')}
                disabled={isSubmitting}
              >
                <option value="">None</option>
                {DIGITAL_SKILLS.map((skill) => (
                  <option key={skill.key} value={skill.key}>
                    {skill.label}
                  </option>
                ))}
              </Select>
              <Select
                id="targetLevel"
                label="Level"
                value={targetLevel}
                onChange={(e) => setTargetLevel(e.target.value as SkillLevel | '')}
                disabled={isSubmitting || !targetSkill}
              >
                <option value="">None</option>
                {SKILL_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </Select>
            </div>
            {targetSkill && targetLevel && assignTo === 'selected_students' && (
              <p className={styles.helpText} style={{ marginTop: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
                💡 Students matching {DIGITAL_SKILLS.find(s => s.key === targetSkill)?.label} ({SKILL_LEVELS.find(l => l.value === targetLevel)?.label}) are preselected. You can modify the selection.
              </p>
            )}
          </div>

          {/* Assignment Type */}
          {classId && (
            <div className={styles.section}>
              <label className={styles.label}>Assign to *</label>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="assignTo"
                    value="whole_class"
                    checked={assignTo === 'whole_class'}
                    onChange={(e) => {
                      setAssignTo('whole_class')
                      setSelectedStudentIds(new Set())
                    }}
                    disabled={isSubmitting}
                  />
                  <span>Whole class</span>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="assignTo"
                    value="selected_students"
                    checked={assignTo === 'selected_students'}
                    onChange={(e) => setAssignTo('selected_students')}
                    disabled={isSubmitting}
                  />
                  <span>Selected students</span>
                </label>
              </div>

              {/* Student Selection (when "Selected students" is chosen) */}
              {assignTo === 'selected_students' && (
                <div className={styles.studentSelection}>
                  {isLoadingStudents ? (
                    <p>Loading students...</p>
                  ) : classStudents.length === 0 ? (
                    <p className={styles.emptyMessage}>No students in this class yet.</p>
                  ) : (
                    <>
                      <div className={styles.studentCheckboxes}>
                        {classStudents.map((student) => {
                          const studentSkills = studentsWithSkills.find(s => s.id === student.id)
                          const isSuggested = targetSkill && targetLevel && 
                            studentSkills?.skills[targetSkill] === targetLevel
                          
                          return (
                            <label 
                              key={student.id} 
                              className={`${styles.checkboxLabel} ${isSuggested ? styles.suggestedStudent : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedStudentIds.has(student.id)}
                                onChange={(e) => {
                                  const newSet = new Set(selectedStudentIds)
                                  if (e.target.checked) {
                                    newSet.add(student.id)
                                  } else {
                                    newSet.delete(student.id)
                                  }
                                  setSelectedStudentIds(newSet)
                                }}
                                disabled={isSubmitting}
                              />
                              <span className={styles.studentName}>
                                {student.full_name || `Student ${student.id.slice(0, 8)}`}
                              </span>
                              {studentSkills && (
                                <div className={styles.studentSkills}>
                                  {DIGITAL_SKILLS.map((skill) => {
                                    const level = studentSkills.skills[skill.key]
                                    if (!level) return null
                                    return (
                                      <span 
                                        key={skill.key} 
                                        className={`${styles.skillBadge} ${targetSkill === skill.key && targetLevel === level ? styles.skillBadgeMatch : ''}`}
                                        title={`${skill.label}: ${SKILL_LEVELS.find(l => l.value === level)?.label}`}
                                      >
                                        {skill.label.slice(0, 3)}: {SKILL_LEVELS.find(l => l.value === level)?.label.slice(0, 1)}
                                      </span>
                                    )
                                  })}
                                </div>
                              )}
                              {isSuggested && (
                                <span className={styles.suggestedBadge}>Suggested</span>
                              )}
                            </label>
                          )
                        })}
                      </div>
                      {selectedStudentIds.size === 0 && (
                        <p className={styles.errorMessage}>Please select at least one student</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

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

export default function NewTaskPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewTaskPageContent />
    </Suspense>
  )
}
