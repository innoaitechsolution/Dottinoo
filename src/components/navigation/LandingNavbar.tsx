'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import styles from './LandingNavbar.module.css'

export default function LandingNavbar() {
  const router = useRouter()

  const scrollToHowItWorks = () => {
    const element = document.getElementById('how-it-works')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link href="/" className={styles.logoLink}>
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
          <button
            type="button"
            onClick={scrollToHowItWorks}
            className={styles.navLink}
          >
            How it works
          </button>
          <button
            type="button"
            onClick={() => router.push('/onboarding')}
            className={styles.signInButton}
          >
            Sign in
          </button>
        </div>
      </div>
    </nav>
  )
}
