/**
 * AI Provider Abstraction Layer
 * Routes requests to appropriate provider (Gemini or Mock)
 */

import {
  TaskDraftInput,
  TaskDraftResponse,
  FeedbackDraftInput,
  FeedbackDraftResponse,
  RewriteInput,
  RewriteResponse,
  StudentHintInput,
  StudentHintResponse,
  AIProvider,
} from './types'
import * as geminiProvider from './providers/gemini'
import * as mockProvider from './providers/mock'

function getProvider(): AIProvider {
  const aiEnabled = process.env.AI_ENABLED === 'true'
  const provider = (process.env.AI_PROVIDER || 'mock') as AIProvider
  const apiKey = process.env.GEMINI_API_KEY

  if (!aiEnabled || provider !== 'gemini' || !apiKey) {
    return 'mock'
  }

  return 'gemini'
}

function getModel(modelType?: string): string | undefined {
  return process.env[modelType || 'AI_MODEL_TASK'] || undefined
}

export async function generateTaskDraft(input: TaskDraftInput): Promise<TaskDraftResponse> {
  const provider = getProvider()

  if (provider === 'gemini') {
    try {
      const apiKey = process.env.GEMINI_API_KEY!
      const model = getModel('AI_MODEL_TASK')
      return await geminiProvider.generateTaskDraft(input, apiKey, model)
    } catch (error) {
      console.error('Gemini task draft failed, falling back to mock:', error)
      return await mockProvider.generateTaskDraft(input)
    }
  }

  return await mockProvider.generateTaskDraft(input)
}

export async function generateFeedbackDraft(input: FeedbackDraftInput): Promise<FeedbackDraftResponse> {
  const provider = getProvider()

  if (provider === 'gemini') {
    try {
      const apiKey = process.env.GEMINI_API_KEY!
      const model = getModel('AI_MODEL_FEEDBACK')
      return await geminiProvider.generateFeedbackDraft(input, apiKey, model)
    } catch (error) {
      console.error('Gemini feedback draft failed, falling back to mock:', error)
      return await mockProvider.generateFeedbackDraft(input)
    }
  }

  return await mockProvider.generateFeedbackDraft(input)
}

export async function rewriteForAccessibility(input: RewriteInput): Promise<RewriteResponse> {
  const provider = getProvider()

  if (provider === 'gemini') {
    try {
      const apiKey = process.env.GEMINI_API_KEY!
      const model = getModel('AI_MODEL_STUDENT')
      return await geminiProvider.rewriteForAccessibility(input, apiKey, model)
    } catch (error) {
      console.error('Gemini rewrite failed, falling back to mock:', error)
      return await mockProvider.rewriteForAccessibility(input)
    }
  }

  return await mockProvider.rewriteForAccessibility(input)
}

export async function generateStudentHints(input: StudentHintInput): Promise<StudentHintResponse> {
  const provider = getProvider()

  if (provider === 'gemini') {
    try {
      const apiKey = process.env.GEMINI_API_KEY!
      const model = getModel('AI_MODEL_STUDENT')
      return await geminiProvider.generateStudentHints(input, apiKey, model)
    } catch (error) {
      console.error('Gemini student hints failed, falling back to mock:', error)
      return await mockProvider.generateStudentHints(input)
    }
  }

  return await mockProvider.generateStudentHints(input)
}
