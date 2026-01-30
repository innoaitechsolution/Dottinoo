'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getMyUiPrefs, StudentUiPrefs } from '@/lib/supabase/supportNeeds'

/** Teacher-only routes: do not fetch student_ui_prefs (table may be missing or 404). */
function isTeacherOnlyRoute(pathname: string | null): boolean {
  if (!pathname) return false
  return (
    pathname.startsWith('/app/classes') ||
    pathname.startsWith('/app/reports') ||
    pathname.startsWith('/app/teacher')
  )
}

/**
 * Hook to fetch and apply student UI preferences.
 * Only runs on student-facing routes; on teacher-only routes returns defaults and does not fetch.
 * Fails gracefully: on 404/network errors returns default prefs and continues rendering.
 */
export function useStudentUiPrefs() {
  const pathname = usePathname()
  const [prefs, setPrefs] = useState<StudentUiPrefs | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isTeacherOnlyRoute(pathname)) {
      setIsLoading(false)
      return
    }

    const loadPrefs = async () => {
      setIsLoading(true)
      try {
        const { data } = await getMyUiPrefs()
        if (data) {
          setPrefs(data)
        }
      } catch (e) {
        if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
          console.log('[UI prefs] Fetch failed, using defaults:', e)
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadPrefs()
  }, [pathname])

  return { prefs, isLoading }
}

/**
 * Get CSS classes based on UI preferences
 */
export function getUiPrefsClasses(prefs: StudentUiPrefs | null): string {
  if (!prefs) return ''
  
  const classes: string[] = []
  
  if (prefs.font_scale) {
    classes.push(`font-${prefs.font_scale}`)
  }
  
  if (prefs.spacing) {
    classes.push(`spacing-${prefs.spacing}`)
  }
  
  if (prefs.reduce_clutter) {
    classes.push('reduce-clutter')
  }
  
  if (prefs.high_contrast) {
    classes.push('high-contrast')
  }
  
  return classes.join(' ')
}
