'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getMyProfile, Profile } from '@/lib/supabase/profile'
import { getReportData, ClassReportData, ReportRange } from '@/lib/supabase/reports'
import styles from './page.module.css'

export default function PrintReportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const classId = searchParams.get('classId')
  const range = (searchParams.get('range') as ReportRange) || 'all'
  
  const [profile, setProfile] = useState<Profile | null>(null)
  const [report, setReport] = useState<ClassReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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

        if (!classId) {
          setIsLoading(false)
          return
        }

        const { data: reportData, error } = await getReportData(classId, range)
        if (error) {
          console.error('Error loading report:', error)
        } else {
          setReport(reportData)
        }
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [router, classId, range])

  // Auto-trigger print dialog when page loads
  useEffect(() => {
    if (!isLoading && report) {
      // Small delay to ensure content is rendered
      setTimeout(() => {
        window.print()
      }, 500)
    }
  }, [isLoading, report])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const getRangeLabel = (r: ReportRange) => {
    switch (r) {
      case 'last30':
        return 'Last 30 Days'
      case 'last90':
        return 'Last 90 Days'
      case 'all':
        return 'All Time'
    }
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading report...</div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>No report data available</div>
      </div>
    )
  }

  return (
    <div className={styles.printContainer}>
      {/* Print-only header */}
      <div className={styles.printHeader}>
        <h1 className={styles.printTitle}>{report.className} - Class Report</h1>
        <div className={styles.printMeta}>
          <div>Generated: {new Date().toLocaleString('en-GB')}</div>
          <div>Period: {getRangeLabel(range)}</div>
        </div>
      </div>

      {/* Summary Section */}
      <div className={styles.printSection}>
        <h2 className={styles.printSectionTitle}>Summary</h2>
        <div className={styles.printStatsGrid}>
          <div className={styles.printStat}>
            <div className={styles.printStatValue}>{report.totalTasks}</div>
            <div className={styles.printStatLabel}>Total Tasks</div>
          </div>
          <div className={styles.printStat}>
            <div className={styles.printStatValue}>{report.totalAssignments}</div>
            <div className={styles.printStatLabel}>Total Assignments</div>
          </div>
          <div className={styles.printStat}>
            <div className={styles.printStatValue}>{report.submittedCount}</div>
            <div className={styles.printStatLabel}>Submitted</div>
          </div>
          <div className={styles.printStat}>
            <div className={styles.printStatValue}>{report.reviewedCount}</div>
            <div className={styles.printStatLabel}>Reviewed</div>
          </div>
          <div className={styles.printStat}>
            <div className={styles.printStatValue}>{report.totalStars} ⭐</div>
            <div className={styles.printStatLabel}>Total Stars</div>
          </div>
        </div>
      </div>

      {/* Student Breakdown Table */}
      <div className={styles.printSection}>
        <h2 className={styles.printSectionTitle}>Student Breakdown</h2>
        <table className={styles.printTable}>
          <thead>
            <tr>
              <th>Student</th>
              <th>Email</th>
              <th>Assigned</th>
              <th>Submitted</th>
              <th>Reviewed</th>
              <th>Stars</th>
            </tr>
          </thead>
          <tbody>
            {report.students.map((student) => (
              <tr key={student.studentId}>
                <td>{student.studentName}</td>
                <td>{student.studentEmail}</td>
                <td className={styles.printNumber}>{student.assignedTasks}</td>
                <td className={styles.printNumber}>{student.submittedTasks}</td>
                <td className={styles.printNumber}>{student.reviewedTasks}</td>
                <td className={styles.printNumber}>{student.totalStars} ⭐</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Print-only footer */}
      <div className={styles.printFooter}>
        <div>Dottinoo Class Report</div>
        <div>Page 1</div>
      </div>
    </div>
  )
}
