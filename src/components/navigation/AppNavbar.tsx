'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'
import { signOut } from '@/lib/supabase/auth'
import { getMyProfile, Profile, ProfileRole } from '@/lib/supabase/profile'
import Button from '@/components/Button'
import styles from './AppNavbar.module.css'

export default function AppNavbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user?.email) {
          setUserEmail(session.user.email)
        }

        const { data: profileData } = await getMyProfile()
        if (profileData) {
          setProfile(profileData)
        }
      } catch (error) {
        console.error('Error loading profile:', error)
      }
    }

    loadProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadProfile()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    setIsSigningOut(true)
    const { error } = await signOut()
    if (error) {
      console.error('Error signing out:', error)
    } else {
      router.push('/login')
      router.refresh()
    }
    setIsSigningOut(false)
  }

  const isTeacher = profile?.role === 'teacher' || profile?.role === 'admin'
  const isStudent = profile?.role === 'student' || profile?.role === 'external'

  const getRoleLabel = (role: ProfileRole | undefined): string => {
    switch (role) {
      case 'teacher':
        return 'Teacher'
      case 'admin':
        return 'Admin'
      case 'student':
        return 'Student'
      case 'external':
        return 'External'
      default:
        return 'User'
    }
  }

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/')

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link href={isTeacher ? '/app/teacher' : '/app/student'} className={styles.logoLink}>
          <div className={styles.logoContainer}>
            <Image
              src="/brand/dottinoo-logo.png"
              alt="Dottinoo logo"
              width={28}
              height={28}
              className={styles.logo}
            />
            <span className={styles.brandName}>Dottinoo</span>
          </div>
        </Link>

        <div className={styles.navLinks}>
          {isTeacher && (
            <>
              <Link
                href="/app/classes"
                className={`${styles.navLink} ${isActive('/app/classes') ? styles.active : ''}`}
              >
                Classes
              </Link>
              <Link
                href="/app/tasks"
                className={`${styles.navLink} ${isActive('/app/tasks') ? styles.active : ''}`}
              >
                Tasks
              </Link>
              <Link
                href="/app/reports"
                className={`${styles.navLink} ${isActive('/app/reports') ? styles.active : ''}`}
              >
                Reports
              </Link>
            </>
          )}
          {isStudent && (
            <>
              <Link
                href="/app/tasks"
                className={`${styles.navLink} ${isActive('/app/tasks') ? styles.active : ''}`}
              >
                My Tasks
              </Link>
              <Link
                href="/app/classes"
                className={`${styles.navLink} ${isActive('/app/classes') ? styles.active : ''}`}
              >
                Classes
              </Link>
              <Link
                href="/app/stars"
                className={`${styles.navLink} ${isActive('/app/stars') ? styles.active : ''}`}
              >
                Stars
              </Link>
            </>
          )}
        </div>

        <div className={styles.userSection}>
          {profile && (
            <span className={styles.roleBadge} title={`Role: ${getRoleLabel(profile.role)}`}>
              {getRoleLabel(profile.role)}
            </span>
          )}
          {userEmail && (
            <span className={styles.userEmail} title={userEmail}>
              {userEmail}
            </span>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? 'Signing out...' : 'Sign out'}
          </Button>
        </div>
      </div>
    </nav>
  )
}
