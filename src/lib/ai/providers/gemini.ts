/**
 * Gemini AI Provider
 * Uses Google Gemini Developer API
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
} from '../types'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

function getModel(modelType?: string): string {
  return modelType || 'gemini-1.5-flash'
}

async function callGemini(
  prompt: string,
  apiKey: string,
  model?: string
): Promise<string> {
  const modelName = getModel(model)
  const url = `${GEMINI_API_URL}/${modelName}:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000,
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!content) {
    throw new Error('No content from Gemini API')
  }

  return content
}

function parseJSONResponse<T>(content: string, fallback: T): T {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/)
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content
    return JSON.parse(jsonStr) as T
  } catch {
    return fallback
  }
}

export async function generateTaskDraft(
  input: TaskDraftInput,
  apiKey: string,
  model?: string
): Promise<TaskDraftResponse> {
  const prompt = `You are an educational content creator for learners aged 14-24. Create a structured, respectful, age-appropriate task draft.

Subject/Topic: ${input.subject || input.brief}
Time Estimate: ${input.timeEstimate}
Support Needs: ${input.supportNeeds || 'Standard support'}
Brief: ${input.brief}

Return a JSON object with this exact structure:
{
  "title": "Task title",
  "instructions": "Clear instructions for the task",
  "steps": ["step 1", "step 2", "step 3", "step 4", "step 5"],
  "differentiation": {
    "easier": "Support for learners who need more guidance",
    "standard": "Standard version for most learners",
    "stretch": "Extended version for advanced learners"
  },
  "successCriteria": ["criterion 1", "criterion 2", "criterion 3", "criterion 4", "criterion 5"]
}

Do not include personal data, medical advice, legal advice, or diagnostic labels. Focus on skill-building, critical thinking, and practical application. Use a supportive but not childish tone.`

  try {
    const content = await callGemini(prompt, apiKey, model)
    const draft = parseJSONResponse<TaskDraftResponse>(content, {
      title: `Task: ${input.subject || input.brief}`,
      instructions: `Complete this task about ${input.subject || input.brief}.`,
      steps: ['Review requirements', 'Plan approach', 'Complete task', 'Review work', 'Reflect'],
      differentiation: {
        easier: 'Focus on core concepts with support.',
        standard: 'Complete all required components.',
        stretch: 'Go beyond basic requirements.',
      },
      successCriteria: ['Complete components', 'Show understanding', 'Apply skills', 'Reflect on learning'],
    })

    // Validate structure
    if (!draft.title || !draft.instructions || !Array.isArray(draft.steps)) {
      throw new Error('Invalid response structure')
    }

    return draft
  } catch (error) {
    console.error('Gemini task draft error:', error)
    throw error
  }
}

export async function generateFeedbackDraft(
  input: FeedbackDraftInput,
  apiKey: string,
  model?: string
): Promise<FeedbackDraftResponse> {
  const prompt = `You are a supportive teacher providing feedback to a student aged 14-24.

Task: ${input.taskTitle || 'Task'}
${input.taskInstructions ? `Instructions: ${input.taskInstructions}` : ''}
${input.successCriteria ? `Success Criteria: ${input.successCriteria.join(', ')}` : ''}

Student Submission:
${input.studentSubmission.substring(0, 1500)}

${input.teacherNotes ? `Teacher Notes: ${input.teacherNotes}` : ''}

Provide constructive, encouraging feedback. Return JSON with this structure:
{
  "options": [
    {"title": "Option 1 title", "text": "Feedback text"},
    {"title": "Option 2 title", "text": "Feedback text"},
    {"title": "Option 3 title", "text": "Feedback text"}
  ],
  "nextStep": "A specific next step for the student",
  "starsSuggestion": 3
}

Stars suggestion should be 0-5. Be encouraging but honest.`

  try {
    const content = await callGemini(prompt, apiKey, model)
    const feedback = parseJSONResponse<FeedbackDraftResponse>(content, {
      options: [
        { title: 'Encouraging', text: 'Good work on completing this task.' },
        { title: 'Constructive', text: 'Consider adding more detail to strengthen your response.' },
        { title: 'Next Steps', text: 'Continue building on what you have learned.' },
      ],
      nextStep: 'Review the success criteria and identify areas to expand.',
      starsSuggestion: 3,
    })

    // Validate and limit
    if (!Array.isArray(feedback.options) || feedback.options.length === 0) {
      throw new Error('Invalid feedback structure')
    }

    feedback.options = feedback.options.slice(0, 3)
    if (feedback.starsSuggestion !== undefined) {
      feedback.starsSuggestion = Math.max(0, Math.min(5, feedback.starsSuggestion))
    }

    return feedback
  } catch (error) {
    console.error('Gemini feedback draft error:', error)
    throw error
  }
}

export async function rewriteForAccessibility(
  input: RewriteInput,
  apiKey: string,
  model?: string
): Promise<RewriteResponse> {
  const modeInstructions = {
    simplify: 'Rewrite this text in simpler language, using shorter sentences and common words.',
    bullet_points: 'Convert this text into clear bullet points.',
    dyslexia_friendly: 'Rewrite this text to be more readable for people with dyslexia. Use clear structure, avoid complex sentences, and add helpful breaks.',
    shorten: 'Make this text shorter while keeping the main points.',
  }

  const prompt = `${modeInstructions[input.mode]}

Original text:
${input.text.substring(0, 2000)}

Return only the rewritten text, no JSON, no explanation.`

  try {
    const rewrittenText = await callGemini(prompt, apiKey, model)
    return {
      rewrittenText: rewrittenText.trim(),
    }
  } catch (error) {
    console.error('Gemini rewrite error:', error)
    throw error
  }
}

export async function generateStudentHints(
  input: StudentHintInput,
  apiKey: string,
  model?: string
): Promise<StudentHintResponse> {
  // Guardrail: Check for refusal triggers
  const lowerContext = (input.taskContext + ' ' + (input.studentDraft || '')).toLowerCase()
  const refusalTriggers = ['write it for me', 'give me the answer', 'do it for me', 'complete it', 'finish it']
  const shouldRefuse = refusalTriggers.some(trigger => lowerContext.includes(trigger))

  if (shouldRefuse) {
    return {
      hints: [],
      questions: [],
      checklist: [],
      refusal: "I can't do the work for you, but I can help guide you. Try breaking the task into smaller steps and focus on understanding the key concepts.",
    }
  }

  const requestTypeLabels = {
    next_step: 'next steps or hints',
    checklist: 'a checklist of things to check',
    questions: 'guiding questions to think about',
  }

  const prompt = `You are a helpful tutor for a student aged 14-24. Provide ${requestTypeLabels[input.requestType]} to help them with their task.

Task Context: ${input.taskContext.substring(0, 1000)}
${input.successCriteria ? `Success Criteria: ${input.successCriteria.join(', ')}` : ''}
${input.studentDraft ? `Student's current work: ${input.studentDraft.substring(0, 500)}` : ''}

IMPORTANT: Do NOT provide the full answer or complete the work. Only provide guidance, hints, questions, or checklists.

Return JSON with this structure:
{
  "hints": ["hint 1", "hint 2", "hint 3", "hint 4", "hint 5"],
  "questions": ["question 1", "question 2", "question 3"],
  "checklist": ["item 1", "item 2", "item 3", "item 4", "item 5"],
  "refusal": null
}

For ${input.requestType}:
${input.requestType === 'next_step' ? 'Focus on hints array (max 5)' : ''}
${input.requestType === 'checklist' ? 'Focus on checklist array (max 5)' : ''}
${input.requestType === 'questions' ? 'Focus on questions array (max 3)' : ''}

Keep hints process-oriented and generic. Never provide the actual answer.`

  try {
    const content = await callGemini(prompt, apiKey, model)
    const hints = parseJSONResponse<StudentHintResponse>(content, {
      hints: [],
      questions: [],
      checklist: [],
      refusal: null,
    })

    // Enforce limits
    hints.hints = hints.hints.slice(0, 5)
    hints.questions = hints.questions.slice(0, 3)
    hints.checklist = hints.checklist.slice(0, 5)

    return hints
  } catch (error) {
    console.error('Gemini student hints error:', error)
    throw error
  }
}
