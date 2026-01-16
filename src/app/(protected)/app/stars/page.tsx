'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { getMyProfile, Profile } from '@/lib/supabase/profile'
import { getStudentStarsSummary, getTeacherRecentReviews, StarEntry } from '@/lib/supabase/stars'
import Button from '@/components/Button'
import BackButton from '@/components/BackButton'
import styles from './page.module.css'

export default function StarsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [totalStars, setTotalStars] = useState(0)
  const [recentStars, setRecentStars] = useState<StarEntry[]>([])
  const [recentReviews, setRecentReviews] = useState<StarEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }

        const { data: profileData } = await getMyProfile()
        if (!profileData) {
          router.push('/login')
          return
        }
        setProfile(profileData)

        if (profileData.role === 'student') {
          const { data: starsData, error: starsError } = await getStudentStarsSummary()
          if (starsError) {
            setError('Failed to load stars')
          } else if (starsData) {
            setTotalStars(starsData.totalStars)
            setRecentStars(starsData.recentStars)
          }
        } else {
          const { data: reviewsData, error: reviewsError } = await getTeacherRecentReviews()
          if (reviewsError) {
            setError('Failed to load reviews')
          } else {
            setRecentReviews(reviewsData || [])
          }
        }
      } catch (err) {
        console.error('Error loading data:', err)
        setError('An unexpected error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [router])

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const isTeacher = profile.role === 'teacher'

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <BackButton fallbackHref="/app" className={styles.backButton} />
          <h1 className={styles.title}>
            {isTeacher ? 'Recent Reviews' : 'My Stars'}
          </h1>
          <Link href="/app">
            <Button variant="primary">Back to Dashboard</Button>
          </Link>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        {isTeacher ? (
          <div className={styles.teacherView}>
            <p className={styles.infoText}>
              Stars are awarded when you review student submissions. Here are your recent reviews.
            </p>
            {recentReviews.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No reviews yet. Review student submissions to award stars!</p>
              </div>
            ) : (
              <div className={styles.reviewsList}>
                {recentReviews.map((review, index) => (
                  <div key={index} className={styles.reviewCard}>
                    <div className={styles.reviewHeader}>
                      <h3 className={styles.taskTitle}>{review.task_title}</h3>
                      <div className={styles.starsDisplay}>
                        {'⭐'.repeat(review.stars_awarded)}
                      </div>
                    </div>
                    {review.feedback && (
                      <p className={styles.feedback}>{review.feedback}</p>
                    )}
                    <p className={styles.reviewDate}>
                      Reviewed on {formatDate(review.reviewed_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className={styles.studentView}>
            <div className={styles.totalStarsCard}>
              <h2 className={styles.totalStarsTitle}>Total Stars</h2>
              <div className={styles.totalStarsValue}>
                {totalStars} ⭐
              </div>
              <p className={styles.totalStarsSubtext}>
                Keep up the great work!
              </p>
            </div>

            <div className={styles.recentSection}>
              <h2 className={styles.sectionTitle}>Recent Stars</h2>
              {recentStars.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No stars yet. Complete tasks and get them reviewed to earn stars!</p>
                </div>
              ) : (
                <div className={styles.starsList}>
                  {recentStars.map((entry, index) => (
                    <div key={index} className={styles.starCard}>
                      <div className={styles.starCardHeader}>
                        <h3 className={styles.taskTitle}>{entry.task_title}</h3>
                        <div className={styles.starsDisplay}>
                          {'⭐'.repeat(entry.stars_awarded)}
                        </div>
                      </div>
                      {entry.feedback && (
                        <p className={styles.feedback}>{entry.feedback}</p>
                      )}
                      <p className={styles.reviewDate}>
                        Reviewed on {formatDate(entry.reviewed_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

