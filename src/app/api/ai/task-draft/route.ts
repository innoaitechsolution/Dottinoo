import { NextRequest, NextResponse } from 'next/server'

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

/**
 * Generate a mock task draft (used when AI is not configured)
 */
function generateMockDraft(brief: string, subject: string, timeEstimate: string): TaskDraftResponse {
  const topic = subject || brief || 'the topic'
  const time = timeEstimate || 'the estimated time'

  return {
    title: `Task: ${topic}`,
    instructions: `Complete this task about ${topic}. This activity is designed to help you develop your skills and understanding. Take approximately ${time} to complete it.`,
    steps: [
      'Review the task requirements and materials',
      'Plan your approach and gather any needed resources',
      'Complete the main task components',
      'Review your work for completeness and quality',
      'Reflect on what you learned and any challenges you faced'
    ],
    differentiation: {
      easier: `For this version, focus on the core concepts. Break the task into smaller steps and take your time. Use available resources and ask for support when needed.`,
      standard: `Complete all required components with attention to detail. Show your understanding through clear explanations and examples.`,
      stretch: `Go beyond the basic requirements. Explore connections to other topics, apply critical thinking, and demonstrate deeper understanding.`
    },
    successCriteria: [
      'Complete all required components',
      'Demonstrate understanding of key concepts',
      'Show effort and engagement with the task',
      'Apply skills appropriately',
      'Reflect on learning and challenges'
    ]
  }
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

    // Check if AI is enabled
    const aiEnabled = process.env.AI_DRAFTS_ENABLED === 'true'
    const apiKey = process.env.OPENAI_API_KEY

    // If AI is explicitly disabled, return 403
    if (process.env.AI_DRAFTS_ENABLED === 'false') {
      return NextResponse.json(
        { error: 'AI draft generation is disabled' },
        { status: 403 }
      )
    }

    // If AI is not configured (not enabled or no API key), return mock draft
    if (!aiEnabled || !apiKey) {
      const mockDraft = generateMockDraft(brief, subject, timeEstimate)
      return NextResponse.json(mockDraft)
    }

    // AI implementation (minimal, safe)
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an educational content creator for learners aged 14-24. Create structured, respectful, age-appropriate task drafts. 
              Do not include personal data, medical advice, legal advice, or diagnostic labels. 
              Focus on skill-building, critical thinking, and practical application. 
              Use a supportive but not childish tone.`
            },
            {
              role: 'user',
              content: `Create a task draft for:
              Subject/Topic: ${subject || brief}
              Time Estimate: ${timeEstimate}
              Support Needs: ${supportNeeds || 'Standard support'}
              Brief: ${brief}
              
              Return a JSON object with: title, instructions, steps (array), differentiation (object with easier, standard, stretch), successCriteria (array).`
            }
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      })

      if (!response.ok) {
        throw new Error('OpenAI API error')
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content

      if (!content) {
        throw new Error('No content from AI')
      }

      // Try to parse JSON from response
      let draft: TaskDraftResponse
      try {
        draft = JSON.parse(content)
      } catch {
        // If not JSON, fall back to mock
        draft = generateMockDraft(brief, subject, timeEstimate)
      }

      // Validate structure
      if (!draft.title || !draft.instructions || !Array.isArray(draft.steps)) {
        draft = generateMockDraft(brief, subject, timeEstimate)
      }

      return NextResponse.json(draft)
    } catch (aiError) {
      // Fall back to mock on AI error
      console.error('AI generation error:', aiError)
      const mockDraft = generateMockDraft(brief, subject, timeEstimate)
      return NextResponse.json(mockDraft)
    }
  } catch (error) {
    console.error('Task draft API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate task draft' },
      { status: 500 }
    )
  }
}

