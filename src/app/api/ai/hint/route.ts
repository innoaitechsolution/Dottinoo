import { NextRequest, NextResponse } from 'next/server'
import { generateStudentHints } from '@/lib/ai'
import { getServerAuth, hasRole } from '@/lib/supabase/server-auth'
import { ProfileRole } from '@/lib/supabase/profile'

interface HintRequest {
  taskContext: string
  successCriteria?: string[]
  studentDraft?: string
  requestType: 'next_step' | 'checklist' | 'questions'
}

export async function POST(request: NextRequest) {
  try {
    // Auth check: student/external only
    const auth = await getServerAuth(request)
    if (!auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasRole(auth, ['student', 'external'])) {
      return NextResponse.json({ error: 'Forbidden: Student or external role required' }, { status: 403 })
    }

    const body: HintRequest = await request.json()

    // Validate and truncate inputs (enforce length limits)
    const taskContext = (body.taskContext || '').trim().substring(0, 1500)
    if (taskContext.length < 10) {
      return NextResponse.json(
        { error: 'Task context must be at least 10 characters' },
        { status: 400 }
      )
    }

    const successCriteria = body.successCriteria?.slice(0, 10) || undefined
    const studentDraft = body.studentDraft?.trim().substring(0, 1000) || undefined

    const validRequestTypes = ['next_step', 'checklist', 'questions']
    if (!body.requestType || !validRequestTypes.includes(body.requestType)) {
      return NextResponse.json(
        { error: `Request type must be one of: ${validRequestTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Generate hints
    const hints = await generateStudentHints({
      taskContext,
      successCriteria,
      studentDraft,
      requestType: body.requestType,
    })

    // Enforce max lengths (provider should do this, but double-check)
    hints.hints = hints.hints.slice(0, 5)
    hints.questions = hints.questions.slice(0, 3)
    hints.checklist = hints.checklist.slice(0, 5)

    return NextResponse.json(hints)
  } catch (error) {
    console.error('Hint API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate hints' },
      { status: 500 }
    )
  }
}
