import { NextRequest, NextResponse } from 'next/server'
import { generateTaskDraft } from '@/lib/ai'

interface TaskDraftRequest {
  brief: string
  subject: string
  timeEstimate: string
  supportNeeds: string | null
}

interface TaskDraftResponse {
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

export async function POST(request: NextRequest) {
  try {
    const body: TaskDraftRequest = await request.json()
    
    // Validate and trim inputs
    const brief = (body.brief || '').trim()
    const subject = (body.subject || '').trim()
    const timeEstimate = (body.timeEstimate || '').trim()
    const supportNeeds = body.supportNeeds ? body.supportNeeds.trim() : null

    // Input validation
    if (brief.length < 10 || brief.length > 1000) {
      return NextResponse.json(
        { error: 'Brief must be between 10 and 1000 characters' },
        { status: 400 }
      )
    }

    if (subject.length > 100) {
      return NextResponse.json(
        { error: 'Subject must be 100 characters or less' },
        { status: 400 }
      )
    }

    if (timeEstimate.length > 50) {
      return NextResponse.json(
        { error: 'Time estimate must be 50 characters or less' },
        { status: 400 }
      )
    }

    if (supportNeeds && supportNeeds.length > 200) {
      return NextResponse.json(
        { error: 'Support needs must be 200 characters or less' },
        { status: 400 }
      )
    }

    // Use AI provider abstraction layer (handles Gemini/Mock internally)
    // Maintains same request/response shape and fallback behavior
    try {
      const draft = await generateTaskDraft({
        brief,
        subject,
        timeEstimate,
        supportNeeds,
      })
      return NextResponse.json(draft)
    } catch (aiError) {
      // Provider layer should handle fallback, but catch any unexpected errors
      console.error('Task draft generation error:', aiError)
      // Return a basic fallback to maintain compatibility
      const fallbackDraft: TaskDraftResponse = {
        title: `Task: ${subject || brief}`,
        instructions: `Complete this task about ${subject || brief}. Take approximately ${timeEstimate} to complete it.`,
        steps: [
          'Review the task requirements',
          'Plan your approach',
          'Complete the task',
          'Review your work',
          'Reflect on what you learned',
        ],
        differentiation: {
          easier: 'Focus on core concepts with support.',
          standard: 'Complete all required components.',
          stretch: 'Go beyond basic requirements.',
        },
        successCriteria: [
          'Complete all components',
          'Show understanding',
          'Apply skills',
          'Reflect on learning',
        ],
      }
      return NextResponse.json(fallbackDraft)
    }
  } catch (error) {
    console.error('Task draft API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate task draft' },
      { status: 500 }
    )
  }
}

