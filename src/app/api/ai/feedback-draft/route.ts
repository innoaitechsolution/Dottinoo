import { NextRequest, NextResponse } from 'next/server'
import { generateFeedbackDraft } from '@/lib/ai'
import { getServerAuth, hasRole } from '@/lib/supabase/server-auth'
import { ProfileRole } from '@/lib/supabase/profile'

interface FeedbackDraftRequest {
  taskTitle?: string
  taskInstructions?: string
  successCriteria?: string[]
  studentSubmission: string
  teacherNotes?: string
}

export async function POST(request: NextRequest) {
  try {
    // Auth check: teacher/admin only
    const auth = await getServerAuth(request)
    if (!auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasRole(auth, ['teacher', 'admin'])) {
      return NextResponse.json({ error: 'Forbidden: Teacher or admin role required' }, { status: 403 })
    }

    const body: FeedbackDraftRequest = await request.json()

    // Validate inputs
    const studentSubmission = (body.studentSubmission || '').trim()
    if (studentSubmission.length < 10 || studentSubmission.length > 5000) {
      return NextResponse.json(
        { error: 'Student submission must be between 10 and 5000 characters' },
        { status: 400 }
      )
    }

    // Truncate long inputs
    const taskTitle = body.taskTitle?.substring(0, 200) || undefined
    const taskInstructions = body.taskInstructions?.substring(0, 2000) || undefined
    const successCriteria = body.successCriteria?.slice(0, 10) || undefined
    const teacherNotes = body.teacherNotes?.substring(0, 500) || undefined

    // Generate feedback draft
    const feedback = await generateFeedbackDraft({
      taskTitle,
      taskInstructions,
      successCriteria,
      studentSubmission: studentSubmission.substring(0, 2000), // Limit for AI
      teacherNotes,
    })

    return NextResponse.json(feedback)
  } catch (error) {
    console.error('Feedback draft API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate feedback draft' },
      { status: 500 }
    )
  }
}
