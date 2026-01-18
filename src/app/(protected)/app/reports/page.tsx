'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getMyProfile, Profile } from '@/lib/supabase/profile'
import { listMyClasses, Class } from '@/lib/supabase/classes'
import Button from '@/components/Button'
import BackButton from '@/components/BackButton'
import styles from '../page.module.css'

interface ClassReport {
  classId: string
  className: string
  totalTasks: number
  totalAssignments: number
  submittedCount: number
  reviewedCount: number
  totalStars: number
  students: StudentReport[]
}

interface StudentReport {
  studentId: string
  studentName: string
  studentEmail: string
  assignedTasks: number
  submittedTasks: number
  reviewedTasks: number
  totalStars: number
}

export default function ReportsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [report, setReport] = useState<ClassReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingReport, setIsLoadingReport] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }

        const { data: profileData } = await getMyProfile()
        if (!profileData || (profileData.role !== 'teacher' && profileData.role !== 'admin')) {
          router.push('/app/student')
          return
        }

        setProfile(profileData)
        const { data: classesData } = await listMyClasses()
        setClasses(classesData || [])
      } catch (err) {
        console.error('Error loading data:', err)
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [router])

  const loadReport = async (classId: string) => {
    setIsLoadingReport(true)
    try {
      // Get class info
      const { data: classData } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single()

      // Get tasks for this class
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('class_id', classId)

      const taskIds = tasks?.map(t => t.id) || []

      // Get assignments
      const { data: assignments } = await supabase
        .from('task_assignments')
        .select('*, tasks!inner(class_id)')
        .in('task_id', taskIds)

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
      const students: StudentReport[] = (memberships || []).map((m: any) => {
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

      setReport({
        classId,
        className: classData?.name || 'Unknown Class',
        totalTasks,
        totalAssignments,
        submittedCount,
        reviewedCount,
        totalStars,
        students,
      })
    } catch (err) {
      console.error('Error loading report:', err)
    } finally {
      setIsLoadingReport(false)
    }
  }

  const exportToCSV = () => {
    if (!report) return

    const csvRows = [
      ['Class Report', report.className],
      ['Generated', new Date().toLocaleString()],
      [],
      ['Summary'],
      ['Total Tasks', report.totalTasks.toString()],
      ['Total Assignments', report.totalAssignments.toString()],
      ['Submitted', report.submittedCount.toString()],
      ['Reviewed', report.reviewedCount.toString()],
      ['Total Stars', report.totalStars.toString()],
      [],
      ['Student Breakdown'],
      ['Student Name', 'Email', 'Assigned', 'Submitted', 'Reviewed', 'Stars'],
      ...report.students.map(s => [
        s.studentName,
        s.studentEmail,
        s.assignedTasks.toString(),
        s.submittedTasks.toString(),
        s.reviewedTasks.toString(),
        s.totalStars.toString(),
      ]),
    ]

    const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `class-report-${report.className.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 className={styles.title}>Reports</h1>
          <BackButton />
        </div>

        <div className={styles.panel} style={{ marginBottom: '1.5rem' }}>
          <h2 className={styles.sectionTitle}>Select Class</h2>
          {classes.length === 0 ? (
            <p>No classes found. Create a class first.</p>
          ) : (
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {classes.map((cls) => (
                <Button
                  key={cls.id}
                  variant={selectedClassId === cls.id ? 'primary' : 'secondary'}
                  onClick={() => {
                    setSelectedClassId(cls.id)
                    loadReport(cls.id)
                  }}
                >
                  {cls.name}
                </Button>
              ))}
            </div>
          )}
        </div>

        {isLoadingReport && (
          <div className={styles.panel}>
            <p>Loading report...</p>
          </div>
        )}

        {report && !isLoadingReport && (
          <>
            <div className={styles.panel} style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 className={styles.sectionTitle}>{report.className} - Summary</h2>
                <Button variant="primary" onClick={exportToCSV}>
                  Export CSV
                </Button>
              </div>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{report.totalTasks}</div>
                  <div className={styles.statLabel}>Total Tasks</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{report.totalAssignments}</div>
                  <div className={styles.statLabel}>Total Assignments</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{report.submittedCount}</div>
                  <div className={styles.statLabel}>Submitted</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{report.reviewedCount}</div>
                  <div className={styles.statLabel}>Reviewed</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{report.totalStars} ⭐</div>
                  <div className={styles.statLabel}>Total Stars</div>
                </div>
              </div>
            </div>

            <div className={styles.panel}>
              <h2 className={styles.sectionTitle}>Student Breakdown</h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Student</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Email</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>Assigned</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>Submitted</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>Reviewed</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>Stars</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.students.map((student) => (
                      <tr key={student.studentId} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '0.75rem' }}>{student.studentName}</td>
                        <td style={{ padding: '0.75rem' }}>{student.studentEmail}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>{student.assignedTasks}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>{student.submittedTasks}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>{student.reviewedTasks}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>{student.totalStars} ⭐</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
