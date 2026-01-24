'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import styles from './Header.module.css'

export default function Header() {
  const router = useRouter()
  const [imageError, setImageError] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    // Only check session if Supabase is configured
    if (!isSupabaseConfigured()) {
      return
    }

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (!error) {
          setIsLoggedIn(!!session)
        }
      } catch (err) {
        // Silently fail - Supabase not configured
        console.warn('Supabase not configured')
      }
    }
    checkSession()

    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
        checkSession()
      })

      return () => {
        if (subscription) {
          subscription.unsubscribe()
        }
      }
    } catch (err) {
      // Silently fail - Supabase not configured
      return () => {}
    }
  }, [])

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isLoggedIn) {
      router.push('/app')
    } else {
      router.push('/')
    }
  }

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href={isLoggedIn ? '/app' : '/'} className={styles.logoLink} onClick={handleLogoClick}>
          <div className={styles.logoContainer}>
            <div className={styles.logoWrapper}>
              {!imageError ? (
                <Image
                  src="/brand/dottinoo-logo.png"
                  alt="Dottinoo logo"
                  width={28}
                  height={28}
                  className={styles.logo}
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className={styles.logoPlaceholder}>
                  <span>D</span>
                </div>
              )}
            </div>
            <h1 className={styles.brandName}>Dottinoo</h1>
          </div>
        </Link>
        {!isLoggedIn && (
          <div className={styles.navLinks}>
            <Link href="/about" className={styles.navLink}>
              About
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}

