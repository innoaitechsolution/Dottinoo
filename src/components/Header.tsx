'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import styles from './Header.module.css'

export default function Header() {
  const router = useRouter()
  const [imageError, setImageError] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsLoggedIn(!!session)
    }
    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkSession()
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isLoggedIn) {
      router.push('/app')
    } else {
      router.push('/login')
    }
  }

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href={isLoggedIn ? '/app' : '/login'} className={styles.logoLink} onClick={handleLogoClick}>
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
      </div>
    </header>
  )
}

