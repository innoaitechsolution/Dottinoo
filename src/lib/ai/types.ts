/**
 * AI Provider Types
 */

export interface TaskDraftInput {
  brief: string
  subject: string
  timeEstimate: string
  supportNeeds?: string | null
}

export interface TaskDraftResponse {
  title: string
  instructions: string
  steps: string[]
  differentiation: {
    easier: string
    standard: string
    stretch: string
  }
  successCriteria: string[]
}

export interface FeedbackDraftInput {
  taskTitle?: string
  taskInstructions?: string
  successCriteria?: string[]
  studentSubmission: string
  teacherNotes?: string
}

export interface FeedbackOption {
  title: string
  text: string
}

export interface FeedbackDraftResponse {
  options: FeedbackOption[]
  nextStep: string
  starsSuggestion?: number
}

export interface RewriteInput {
  text: string
  mode: 'simplify' | 'bullet_points' | 'dyslexia_friendly' | 'shorten'
}

export interface RewriteResponse {
  rewrittenText: string
}

export interface StudentHintInput {
  taskContext: string
  successCriteria?: string[]
  studentDraft?: string
  requestType: 'next_step' | 'checklist' | 'questions'
}

export interface StudentHintResponse {
  hints: string[]
  questions: string[]
  checklist: string[]
  refusal: string | null
}

export type AIProvider = 'gemini' | 'mock'
