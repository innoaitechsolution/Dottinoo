'use client'

import { supabase } from './client'

export type ReportRange = 'last30' | 'last90' | 'all'

export interface ClassReportData {
  classId: string
  className: string
  totalTasks: number
  totalAssignments: number
  submittedCount: number
  reviewedCount: number
  totalStars: number
  students: StudentReportData[]
  // For charts
  weeklyStars: WeeklyStarsData[]
  assignmentStatusBreakdown: {
    assigned: number
    submitted: number
    reviewed: number
  }
  averageReviewTurnaround?: number // in hours
}

export interface StudentReportData {
  studentId: string
  studentName: string
  studentEmail: string
  assignedTasks: number
  submittedTasks: number
  reviewedTasks: number
  totalStars: number
}

export interface WeeklyStarsData {
  week: string // YYYY-WW format
  stars: number
  date: string // Start of week date
}

/**
 * Get date filter for report range
 */
function getDateFilter(range: ReportRange): { from?: Date } | null {
  const now = new Date()
  switch (range) {
    case 'last30':
      const last30 = new Date(now)
      last30.setDate(last30.getDate() - 30)
      return { from: last30 }
    case 'last90':
      const last90 = new Date(now)
      last90.setDate(last90.getDate() - 90)
      return { from: last90 }
    case 'all':
      return null
  }
}

/**
 * Get week string from date (YYYY-WW format) using UTC
 */
function getWeekString(date: Date): string {
  // Use UTC to avoid timezone issues
  const d = new Date(date)
  const utcYear = d.getUTCFullYear()
  const utcMonth = d.getUTCMonth()
  const utcDate = d.getUTCDate()
  const utcDay = d.getUTCDay()
  
  // Get start of week (Sunday) in UTC
  const weekStart = new Date(Date.UTC(utcYear, utcMonth, utcDate - utcDay))
  const yearStart = new Date(Date.UTC(utcYear, 0, 1))
  
  // Calculate week number
  const week = Math.ceil((weekStart.getTime() - yearStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
  return `${utcYear}-W${week.toString().padStart(2, '0')}`
}

/**
 * Get report data for a class with optional date range
 */
export async function getReportData(
  classId: string,
  range: ReportRange = 'all'
): Promise<{ data: ClassReportData | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } }
  }

  try {
    // Verify teacher owns the class or is admin
    const { data: classData } = await supabase
      .from('classes')
      .select('teacher_id, name')
      .eq('id', classId)
      .single()

    if (!classData) {
      return { data: null, error: { message: 'Class not found' } }
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return { data: null, error: { message: 'Profile not found' } }
    }

    if (profile.role !== 'admin' && classData.teacher_id !== user.id) {
      return { data: null, error: { message: 'Access denied' } }
    }

    // Get tasks for this class
    let tasksQuery = supabase
      .from('tasks')
      .select('id, created_at')
      .eq('class_id', classId)

    const dateFilter = getDateFilter(range)
    if (dateFilter?.from) {
      tasksQuery = tasksQuery.gte('created_at', dateFilter.from.toISOString())
    }

    const { data: tasks } = await tasksQuery
    const taskIds = tasks?.map(t => t.id) || []

    if (taskIds.length === 0) {
      return {
        data: {
          classId,
          className: classData.name,
          totalTasks: 0,
          totalAssignments: 0,
          submittedCount: 0,
          reviewedCount: 0,
          totalStars: 0,
          students: [],
          weeklyStars: [],
          assignmentStatusBreakdown: {
            assigned: 0,
            submitted: 0,
            reviewed: 0,
          },
        },
        error: null,
      }
    }

    // Get assignments with date filter
    let assignmentsQuery = supabase
      .from('task_assignments')
      .select('*, tasks!inner(class_id, created_at)')
      .in('task_id', taskIds)

    if (dateFilter?.from) {
      assignmentsQuery = assignmentsQuery.gte('created_at', dateFilter.from.toISOString())
    }

    const { data: assignments } = await assignmentsQuery

    // Get students in class
    const { data: memberships } = await supabase
      .from('class_memberships')
      .select('student_id, profiles!inner(id, full_name, email)')
      .eq('class_id', classId)

    // Calculate stats
    const totalTasks = taskIds.length
    const totalAssignments = assignments?.length || 0
    const submittedCount = assignments?.filter(a => a.status === 'submitted' || a.status === 'reviewed').length || 0
    const reviewedCount = assignments?.filter(a => a.status === 'reviewed').length || 0
    const totalStars = assignments?.reduce((sum, a) => sum + (a.stars_awarded || 0), 0) || 0

    // Per-student stats
    const students: StudentReportData[] = (memberships || []).map((m: any) => {
      const studentId = m.student_id
      const studentAssignments = assignments?.filter(a => a.student_id === studentId) || []
      return {
        studentId,
        studentName: m.profiles?.full_name || 'Unknown',
        studentEmail: m.profiles?.email || '',
        assignedTasks: studentAssignments.length,
        submittedTasks: studentAssignments.filter(a => a.status === 'submitted' || a.status === 'reviewed').length,
        reviewedTasks: studentAssignments.filter(a => a.status === 'reviewed').length,
        totalStars: studentAssignments.reduce((sum: number, a: any) => sum + (a.stars_awarded || 0), 0),
      }
    })

    // Weekly stars data (for charts) - use UTC for consistent grouping
    const weeklyStarsMap = new Map<string, number>()
    assignments?.forEach((a: any) => {
      if (a.reviewed_at && a.stars_awarded > 0) {
        // Parse reviewed_at as UTC timestamp
        const reviewedDate = new Date(a.reviewed_at)
        const week = getWeekString(reviewedDate)
        weeklyStarsMap.set(week, (weeklyStarsMap.get(week) || 0) + a.stars_awarded)
      }
    })

    const weeklyStars: WeeklyStarsData[] = Array.from(weeklyStarsMap.entries())
      .map(([week, stars]) => {
        // Parse week string to get date
        const [year, weekNum] = week.split('-W')
        const date = new Date(parseInt(year), 0, 1)
        const weekStart = new Date(date.getTime() + (parseInt(weekNum) - 1) * 7 * 24 * 60 * 60 * 1000)
        return {
          week,
          stars,
          date: weekStart.toISOString().split('T')[0],
        }
      })
      .sort((a, b) => a.date.localeCompare(b.date))

    return {
      data: {
        classId,
        className: classData.name,
        totalTasks,
        totalAssignments,
        submittedCount,
        reviewedCount,
        totalStars,
        students,
        weeklyStars,
        assignmentStatusBreakdown: {
          assigned: totalAssignments,
          submitted: submittedOnlyCount, // Only status='submitted', excluding reviewed
          reviewed: reviewedCount,
        },
      },
      error: null,
    }
  } catch (err: any) {
    return { data: null, error: { message: err.message || 'Failed to load report data' } }
  }
}
