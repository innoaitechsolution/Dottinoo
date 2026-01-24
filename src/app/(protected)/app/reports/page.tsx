'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getMyProfile, Profile } from '@/lib/supabase/profile'
import { listMyClasses, Class } from '@/lib/supabase/classes'
import { getReportData, ClassReportData, ReportRange } from '@/lib/supabase/reports'
import { StackedBarChart, LineChart } from '@/components/charts/SimpleCharts'
import Button from '@/components/Button'
import BackButton from '@/components/BackButton'
import Select from '@/components/Select'
import styles from '../page.module.css'

export default function ReportsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [report, setReport] = useState<ClassReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingReport, setIsLoadingReport] = useState(false)
  const [dateRange, setDateRange] = useState<ReportRange>('all')

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

  const loadReport = async (classId: string, range: ReportRange = 'all') => {
    setIsLoadingReport(true)
    try {
      const { data: reportData, error } = await getReportData(classId, range)
      if (error) {
        console.error('Error loading report:', error)
      } else {
        setReport(reportData)
      }
    } catch (err) {
      console.error('Error loading report:', err)
    } finally {
      setIsLoadingReport(false)
    }
  }

  useEffect(() => {
    if (selectedClassId) {
      loadReport(selectedClassId, dateRange)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange])

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

  const exportToPDF = () => {
    if (!selectedClassId) return
    const url = `/app/reports/print?classId=${selectedClassId}&range=${dateRange}`
    window.open(url, '_blank')
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
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ marginBottom: '1rem' }}>No classes found. Create a class first.</p>
              <Button variant="primary" onClick={() => router.push('/app/classes#create')}>
                Create Class
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {classes.map((cls) => (
                <Button
                  key={cls.id}
                  variant={selectedClassId === cls.id ? 'primary' : 'secondary'}
                  onClick={() => {
                    setSelectedClassId(cls.id)
                    loadReport(cls.id, dateRange)
                  }}
                >
                  {cls.name}
                </Button>
              ))}
              {selectedClassId && (
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label htmlFor="dateRange" style={{ fontSize: '0.875rem', color: '#666' }}>
                    Period:
                  </label>
                  <Select
                    id="dateRange"
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as ReportRange)}
                    style={{ minWidth: '120px' }}
                  >
                    <option value="all">All Time</option>
                    <option value="last90">Last 90 Days</option>
                    <option value="last30">Last 30 Days</option>
                  </Select>
                </div>
              )}
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
            {/* Show message if no data for selected range */}
            {report.totalTasks === 0 && (
              <div className={styles.panel} style={{ marginBottom: '1.5rem' }}>
                <p style={{ textAlign: 'center', color: '#666', padding: '1rem' }}>
                  No data available for the selected period ({dateRange === 'last30' ? 'Last 30 Days' : dateRange === 'last90' ? 'Last 90 Days' : 'All Time'}). 
                  Try selecting a different period or create tasks for this class.
                </p>
              </div>
            )}

            {report.totalTasks > 0 && (
              <>
            <div className={styles.panel} style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 className={styles.sectionTitle}>{report.className} - Summary</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button variant="secondary" onClick={exportToCSV}>
                    Export CSV
                  </Button>
                  <Button variant="primary" onClick={exportToPDF}>
                    Export PDF
                  </Button>
                </div>
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

            {/* Progress Charts Section */}
            <div className={styles.panel} style={{ marginBottom: '1.5rem' }}>
              <h2 className={styles.sectionTitle}>Progress</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginTop: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#133E6C' }}>
                    Assignment Status Breakdown
                  </h3>
                  <StackedBarChart data={report.assignmentStatusBreakdown} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#133E6C' }}>
                    Stars Over Time
                  </h3>
                  {report.weeklyStars.length > 0 ? (
                    <LineChart data={report.weeklyStars} />
                  ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                      No stars data available for the selected period
                    </div>
                  )}
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
          </>
        )}
      </div>
    </div>
  )
}
