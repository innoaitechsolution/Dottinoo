'use client'

import { useEffect, useState } from 'react'
import { getMyUiPrefs, StudentUiPrefs } from '@/lib/supabase/supportNeeds'

/**
 * Hook to fetch and apply student UI preferences
 * Returns the prefs and a loading state
 */
export function useStudentUiPrefs() {
  const [prefs, setPrefs] = useState<StudentUiPrefs | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadPrefs = async () => {
      setIsLoading(true)
      const { data, error } = await getMyUiPrefs()
      if (!error && data) {
        setPrefs(data)
      }
      setIsLoading(false)
    }

    loadPrefs()
  }, [])

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
