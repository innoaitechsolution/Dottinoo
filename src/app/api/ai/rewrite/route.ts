import { NextRequest, NextResponse } from 'next/server'
import { rewriteForAccessibility } from '@/lib/ai'
import { getServerAuth } from '@/lib/supabase/server-auth'

interface RewriteRequest {
  text: string
  mode: 'simplify' | 'bullet_points' | 'dyslexia_friendly' | 'shorten'
}

export async function POST(request: NextRequest) {
  try {
    // Auth check: any authenticated user
    const auth = await getServerAuth(request)
    if (!auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: RewriteRequest = await request.json()

    // Validate inputs
    const text = (body.text || '').trim()
    if (text.length < 10 || text.length > 2000) {
      return NextResponse.json(
        { error: 'Text must be between 10 and 2000 characters' },
        { status: 400 }
      )
    }

    const validModes = ['simplify', 'bullet_points', 'dyslexia_friendly', 'shorten']
    if (!body.mode || !validModes.includes(body.mode)) {
      return NextResponse.json(
        { error: `Mode must be one of: ${validModes.join(', ')}` },
        { status: 400 }
      )
    }

    // Generate rewrite
    const result = await rewriteForAccessibility({
      text: text.substring(0, 2000), // Enforce limit
      mode: body.mode,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Rewrite API error:', error)
    return NextResponse.json(
      { error: 'Failed to rewrite text' },
      { status: 500 }
    )
  }
}
