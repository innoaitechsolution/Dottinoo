import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Generate a random 8-character hex invite code
function generateInviteCode(): string {
  const chars = '0123456789abcdef'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

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
        { error: 'Only teachers and admins can seed demo data' },
        { status: 403 }
      )
    }

    const teacherId = userId

    try {
      const timestamp = Date.now()
      const demoPassword = 'DottinooDemo123!'

      // 1. Create demo class
      let inviteCode = generateInviteCode()
      let attempts = 0
      const maxAttempts = 10

      while (attempts < maxAttempts) {
        const { data: existing } = await adminClient
          .from('classes')
          .select('id')
          .eq('invite_code', inviteCode)
          .single()

        if (!existing) {
          break
        }
        inviteCode = generateInviteCode()
        attempts++
      }

      const { data: demoClass, error: classError } = await adminClient
        .from('classes')
        .insert({
          teacher_id: teacherId,
          name: 'Pilot Demo Class',
          invite_code: inviteCode,
        })
        .select()
        .single()

      if (classError || !demoClass) {
        return NextResponse.json(
          { error: `Failed to create class: ${classError?.message}` },
          { status: 500 }
        )
      }

      // 2. Create 3 demo student accounts with diverse profiles
      const studentConfigs = [
        {
          email: `demo.student1+${timestamp}@dottinoo.test`,
          fullName: 'Demo Student 1',
          supportNeedsTags: ['visual_aids', 'extra_time'],
          digitalSkillLevel: 'starter',
          interests: ['art', 'music'],
        },
        {
          email: `demo.student2+${timestamp}@dottinoo.test`,
          fullName: 'Demo Student 2',
          supportNeedsTags: [],
          digitalSkillLevel: 'intermediate',
          interests: ['coding', 'technology'],
        },
        {
          email: `demo.student3+${timestamp}@dottinoo.test`,
          fullName: 'Demo Student 3',
          supportNeedsTags: ['quiet_space'],
          digitalSkillLevel: 'advanced',
          interests: ['writing', 'reading'],
        },
      ]

      const students = []

      for (let i = 0; i < studentConfigs.length; i++) {
        const config = studentConfigs[i]
        const email = config.email
        const fullName = config.fullName

        // Create auth user
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email,
          password: demoPassword,
          email_confirm: true,
          user_metadata: {
            role: 'student',
            full_name: fullName,
          },
        })

        if (authError || !authData.user) {
          return NextResponse.json(
            { error: `Failed to create student ${i + 1}: ${authError?.message}` },
            { status: 500 }
          )
        }

        // Create profile with tags
        const { error: profileError } = await adminClient
          .from('profiles')
          .insert({
            id: authData.user.id,
            role: 'student',
            full_name: fullName,
            support_needs_tags: config.supportNeedsTags.length > 0 ? config.supportNeedsTags : null,
            digital_skill_level: config.digitalSkillLevel,
            interests: config.interests.length > 0 ? config.interests : null,
          })

        if (profileError) {
          // Profile might already exist from trigger, update it instead
          const { error: updateError } = await adminClient
            .from('profiles')
            .update({
              support_needs_tags: config.supportNeedsTags.length > 0 ? config.supportNeedsTags : null,
              digital_skill_level: config.digitalSkillLevel,
              interests: config.interests.length > 0 ? config.interests : null,
            })
            .eq('id', authData.user.id)
          
          if (updateError) {
            console.warn(`Profile update warning for ${email}:`, updateError)
          }
        }

        // Create UI preferences for demo (optional - demonstrates the feature)
        // Student 1 gets larger font and spacing, Student 3 gets high contrast
        const uiPrefs: any = {}
        if (i === 0) {
          // Student 1: larger font and spacing
          uiPrefs.font_scale = 'lg'
          uiPrefs.spacing = 'lg'
        } else if (i === 2) {
          // Student 3: high contrast
          uiPrefs.high_contrast = true
        }

        if (Object.keys(uiPrefs).length > 0) {
          const { error: prefsError } = await adminClient
            .from('student_ui_prefs')
            .upsert({
              student_id: authData.user.id,
              font_scale: uiPrefs.font_scale || 'md',
              spacing: uiPrefs.spacing || 'md',
              reduce_clutter: uiPrefs.reduce_clutter || false,
              simplified_language: uiPrefs.simplified_language || false,
              high_contrast: uiPrefs.high_contrast || false,
            }, {
              onConflict: 'student_id',
            })

          if (prefsError) {
            console.warn(`UI prefs warning for ${email}:`, prefsError)
          }
        }

        // Add class membership
        const { error: membershipError } = await adminClient
          .from('class_memberships')
          .insert({
            class_id: demoClass.id,
            student_id: authData.user.id,
          })

        if (membershipError) {
          return NextResponse.json(
            { error: `Failed to add student ${i + 1} to class: ${membershipError.message}` },
            { status: 500 }
          )
        }

        // Create task assignments for ALL existing tasks in the class
        // This matches the behavior of join_class_by_code RPC function
        // (In demo seed, tasks are created after students, but this ensures
        //  assignments are created if tasks exist - making it work the same way
        //  as the production join flow)
        const { data: existingTasks } = await adminClient
          .from('tasks')
          .select('id')
          .eq('class_id', demoClass.id)

        if (existingTasks && existingTasks.length > 0) {
          const assignments = existingTasks.map((task: any) => ({
            task_id: task.id,
            student_id: authData.user.id,
            status: 'not_started',
          }))

          const { error: assignmentsError } = await adminClient
            .from('task_assignments')
            .insert(assignments)

          if (assignmentsError) {
            // Log warning but don't fail - assignments will be created when tasks are created
            console.warn(`Warning: Could not create task assignments for student ${i + 1}:`, assignmentsError.message)
          }
        }

        students.push({
          email,
          password: demoPassword,
          userId: authData.user.id,
          fullName,
        })
      }

      // 3. Create 2-3 digital skills tasks with intentional assignments
      const demoTasks = [
        {
          title: 'Digital Safety: Protecting Your Online Identity',
          instructions: 'Learn about online safety and create a guide for protecting your personal information. Research common online threats and create a checklist of safe practices.',
          steps: [
            'Research 3 common online safety threats',
            'Create a checklist of 5 safe practices',
            'Write a short paragraph explaining why online safety matters',
          ],
          differentiation: {
            easier: 'List 3 ways to stay safe online',
            standard: 'Create a safety checklist with explanations',
            stretch: 'Research and create a comprehensive safety guide with examples',
          },
          successCriteria: [
            'Identifies common online threats',
            'Provides actionable safety practices',
            'Explains the importance of online safety',
          ],
          assignToAll: true, // Assign to all students
        },
        {
          title: 'Digital Communication: Writing Professional Emails',
          instructions: 'Practice writing professional emails. Learn the structure of a good email and write a sample email to a teacher or employer.',
          steps: [
            'Review the structure of professional emails',
            'Write a sample email with proper greeting and closing',
            'Check for clarity and professionalism',
          ],
          differentiation: {
            easier: 'Write a simple email with greeting and closing',
            standard: 'Write a professional email with clear structure',
            stretch: 'Create multiple email examples for different scenarios',
          },
          successCriteria: [
            'Uses proper email structure',
            'Maintains professional tone',
            'Includes all necessary information',
          ],
          assignToAll: false, // Assign only to student 2 (intermediate level)
          assignToStudentIndex: 1,
        },
        {
          title: 'Digital Productivity: Organizing Your Digital Files',
          instructions: 'Learn about file organization and create a folder structure for your school work. Organize at least 5 sample files into appropriate folders.',
          steps: [
            'Plan a folder structure for school work',
            'Create folders with clear, descriptive names',
            'Organize sample files into the appropriate folders',
          ],
          differentiation: {
            easier: 'Create 3 main folders and organize files',
            standard: 'Create a folder structure with subfolders',
            stretch: 'Design a comprehensive organization system with naming conventions',
          },
          successCriteria: [
            'Folder structure is logical and clear',
            'Files are organized appropriately',
            'Naming conventions are consistent',
          ],
          assignToAll: true, // Assign to all students
        },
      ]

      const createdTasks = []
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 7)
      const dueDateStr = dueDate.toISOString().split('T')[0]

      for (const taskData of demoTasks) {
        const { data: task, error: taskError } = await adminClient
          .from('tasks')
          .insert({
            class_id: demoClass.id,
            created_by: teacherId,
            title: taskData.title,
            instructions: taskData.instructions,
            steps: taskData.steps,
            differentiation: taskData.differentiation,
            success_criteria: taskData.successCriteria,
            due_date: dueDateStr,
            creation_mode: 'manual',
          })
          .select()
          .single()

        if (taskError || !task) {
          return NextResponse.json(
            { error: `Failed to create task: ${taskError?.message}` },
            { status: 500 }
          )
        }

        createdTasks.push(task)

        // 4. Create task assignments based on assignment strategy
        if (taskData.assignToAll) {
          // Assign to all students
          for (const student of students) {
            const { error: assignmentError } = await adminClient
              .from('task_assignments')
              .insert({
                task_id: task.id,
                student_id: student.userId,
                status: 'not_started',
              })

            if (assignmentError) {
              return NextResponse.json(
                { error: `Failed to create assignment: ${assignmentError.message}` },
                { status: 500 }
              )
            }
          }
        } else if (taskData.assignToStudentIndex !== undefined && students[taskData.assignToStudentIndex]) {
          // Assign only to specific student (demonstrates personalization)
          const { error: assignmentError } = await adminClient
            .from('task_assignments')
            .insert({
              task_id: task.id,
              student_id: students[taskData.assignToStudentIndex].userId,
              status: 'not_started',
            })

          if (assignmentError) {
            return NextResponse.json(
              { error: `Failed to create assignment: ${assignmentError.message}` },
              { status: 500 }
            )
          }
        }
      }

      // 5. Create 1 demo submission (optional)
      if (createdTasks.length > 0 && students.length > 0) {
        const firstTask = createdTasks[0]
        const firstStudent = students[0]

        // Get the assignment ID
        const { data: assignment } = await adminClient
          .from('task_assignments')
          .select('id')
          .eq('task_id', firstTask.id)
          .eq('student_id', firstStudent.userId)
          .single()

        if (assignment) {
          // Create submission
          const { error: submissionError } = await adminClient
            .from('submissions')
            .insert({
              task_assignment_id: assignment.id,
              student_id: firstStudent.userId,
              content: 'This is a demo submission. I have completed the introduction task and I\'m excited to be part of this class!',
            })

          if (!submissionError) {
            // Update assignment status
            await adminClient
              .from('task_assignments')
              .update({
                status: 'submitted',
                updated_at: new Date().toISOString(),
              })
              .eq('id', assignment.id)
          }
        }
      }

      return NextResponse.json({
        class: {
          id: demoClass.id,
          name: demoClass.name,
          inviteCode: demoClass.invite_code,
        },
        students: students.map(s => ({
          email: s.email,
          password: s.password,
          userId: s.userId,
          fullName: s.fullName,
        })),
        tasks: createdTasks.map(t => ({
          id: t.id,
          title: t.title,
        })),
      })
    } catch (error: any) {
      console.error('Demo seed error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to seed demo data' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Demo seed authentication error:', error)
    return NextResponse.json(
      { error: error.message || 'Authentication failed' },
      { status: 401 }
    )
  }
}

