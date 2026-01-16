import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  // Check if demo seed is enabled
  if (process.env.DEMO_SEED_ENABLED !== 'true') {
    return NextResponse.json(
      { error: 'Demo seed is not enabled' },
      { status: 403 }
    )
  }

  // Get Supabase service role key
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase configuration' },
      { status: 500 }
    )
  }

  // Create admin client
  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  try {
    // Get user ID from request body (client will send it)
    const body = await request.json().catch(() => ({}))
    const userId = body.userId

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Verify user profile and role using admin client
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    if (profile.role !== 'teacher' && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only teachers and admins can create demo users' },
        { status: 403 }
      )
    }

    // Generate timestamp for unique emails
    const timestamp = Date.now()
    const password = 'DottinooDemo123!'

    // Create demo teacher
    const teacherEmail = `demo.teacher+${timestamp}@dottinoo.test`
    const { data: teacherAuth, error: teacherAuthError } = await adminClient.auth.admin.createUser({
      email: teacherEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: 'teacher',
        full_name: 'Demo Teacher',
      },
    })

    if (teacherAuthError || !teacherAuth?.user) {
      // Don't log passwords - only log error type
      const errorMsg = teacherAuthError?.message || 'Unknown error'
      if (errorMsg.includes('already registered') || errorMsg.includes('already exists')) {
        return NextResponse.json(
          { error: 'Teacher email already exists. Please try again.' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: `Failed to create teacher: ${errorMsg}` },
        { status: 500 }
      )
    }

    // Ensure teacher profile exists
    const { error: teacherProfileError } = await adminClient
      .from('profiles')
      .upsert({
        id: teacherAuth.user.id,
        role: 'teacher',
        full_name: 'Demo Teacher',
      }, {
        onConflict: 'id',
      })

    if (teacherProfileError) {
      console.error('Error creating teacher profile:', teacherProfileError)
      // Continue anyway - profile might already exist
    }

    // Create demo student
    const studentEmail = `demo.student+${timestamp}@dottinoo.test`
    const { data: studentAuth, error: studentAuthError } = await adminClient.auth.admin.createUser({
      email: studentEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: 'student',
        full_name: 'Demo Student',
      },
    })

    if (studentAuthError || !studentAuth?.user) {
      // Don't log passwords - only log error type
      const errorMsg = studentAuthError?.message || 'Unknown error'
      // Try to clean up teacher if student creation fails
      if (teacherAuth?.user) {
        await adminClient.auth.admin.deleteUser(teacherAuth.user.id).catch(() => {})
      }
      if (errorMsg.includes('already registered') || errorMsg.includes('already exists')) {
        return NextResponse.json(
          { error: 'Student email already exists. Please try again.' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: `Failed to create student: ${errorMsg}` },
        { status: 500 }
      )
    }

    // Ensure student profile exists
    const { error: studentProfileError } = await adminClient
      .from('profiles')
      .upsert({
        id: studentAuth.user.id,
        role: 'student',
        full_name: 'Demo Student',
      }, {
        onConflict: 'id',
      })

    if (studentProfileError) {
      console.error('Error creating student profile:', studentProfileError)
      // Continue anyway - profile might already exist
    }

    // Return results (do NOT log passwords)
    return NextResponse.json({
      teacher: {
        email: teacherEmail,
        password: password,
        userId: teacherAuth.user.id,
      },
      student: {
        email: studentEmail,
        password: password,
        userId: studentAuth.user.id,
      },
    })
  } catch (error: any) {
    console.error('Unexpected error creating demo users:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create demo users' },
      { status: 500 }
    )
  }
}
