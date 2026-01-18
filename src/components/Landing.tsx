'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Button from './Button'
import LandingNavbar from './navigation/LandingNavbar'
import styles from './Landing.module.css'

export default function Landing() {
  const router = useRouter()
  const isDemoEnabled = process.env.NEXT_PUBLIC_DEMO_SEED_ENABLED === 'true'
  
  // Refs for scroll animations
  const valueCardsRef = useRef<HTMLElement>(null)
  const howItWorksRef = useRef<HTMLElement>(null)
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set())

  useEffect(() => {
    // IntersectionObserver for scroll reveal animations
    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -100px 0px',
      threshold: 0.1,
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setVisibleSections((prev) => new Set(prev).add(entry.target.id))
        }
      })
    }, observerOptions)

    if (valueCardsRef.current) {
      valueCardsRef.current.id = 'value-cards'
      observer.observe(valueCardsRef.current)
    }
    if (howItWorksRef.current) {
      howItWorksRef.current.id = 'how-it-works-section'
      observer.observe(howItWorksRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <div className={styles.container}>
      <div className={styles.backgroundBlobs} aria-hidden="true">
        <div className={styles.blob1}></div>
        <div className={styles.blob2}></div>
        <div className={styles.blob3}></div>
      </div>
      <LandingNavbar />
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroMascot}>
          <Image
            src="/brand/dottinoo-logo.png"
            alt="Dottinoo mascot"
            width={80}
            height={80}
            className={styles.mascotImage}
          />
        </div>
        <h1 className={styles.headline}>Tasks that adapt to every learner</h1>
        <div className={styles.heroBadges}>
          <span className={styles.badge}>Built for UK classrooms</span>
          <span className={styles.badge}>Designed for ages 14–24</span>
        </div>
        <p className={styles.subheadline}>
          Create personalized learning experiences with manual, template, or AI-generated tasks.
        </p>
        <div className={styles.speechBubble}>
          <p>Hi! I'm Dottinoo — I help teachers tailor tasks for every learner.</p>
        </div>
        <div className={styles.ctaGroup}>
          <Button
            variant="primary"
            size="lg"
            onClick={() => router.push('/onboarding')}
            className={styles.primaryCta}
          >
            Get started
          </Button>
          <div className={styles.secondaryCtas}>
            <Button
              variant="secondary"
              onClick={() => router.push('/onboarding')}
            >
              I'm a Teacher
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push('/onboarding')}
            >
              I'm a Student
            </Button>
          </div>
        </div>
        <div className={styles.proofLine}>
          Manual • Templates • AI drafts — plus accessibility settings and reporting.
        </div>
        <div className={styles.featureChips}>
          <span className={styles.featureChip}>Accessibility modes</span>
          <span className={styles.featureChip}>Quick feedback + stars</span>
          <span className={styles.featureChip}>Class reports (CSV)</span>
          <span className={styles.featureChip}>Differentiation</span>
        </div>
        <p className={styles.signInLink}>
          Already have an account?{' '}
          <Link href="/login" className={styles.link}>
            Sign in
          </Link>
        </p>
      </section>

      {/* Value Cards */}
      <section 
        ref={valueCardsRef}
        className={`${styles.valueCards} ${visibleSections.has('value-cards') ? styles.visible : ''}`}
      >
        <div className={styles.valueCard}>
          <h3 className={styles.valueCardTitle}>For Teachers</h3>
          <p className={styles.valueCardText}>
            Create & assign in minutes (Manual • Template • AI)
          </p>
        </div>
        <div className={styles.valueCard}>
          <h3 className={styles.valueCardTitle}>For Students</h3>
          <p className={styles.valueCardText}>
            Accessible, personalized learning experience
          </p>
        </div>
        <div className={styles.valueCard}>
          <h3 className={styles.valueCardTitle}>For Schools</h3>
          <p className={styles.valueCardText}>
            Reports & progress visibility
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section 
        id="how-it-works" 
        ref={howItWorksRef}
        className={`${styles.howItWorks} ${visibleSections.has('how-it-works-section') ? styles.visible : ''}`}
      >
        <h2 className={styles.sectionTitle}>How it works</h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <h3 className={styles.stepTitle}>Create tasks</h3>
            <p className={styles.stepText}>
              Teachers create tasks manually, from templates, or with AI assistance.
            </p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <h3 className={styles.stepTitle}>Assign & differentiate</h3>
            <p className={styles.stepText}>
              Assign to whole classes or individual students with differentiated support.
            </p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <h3 className={styles.stepTitle}>Review & track</h3>
            <p className={styles.stepText}>
              Students submit work, teachers provide feedback, and progress is tracked.
            </p>
          </div>
        </div>
      </section>

      {/* Demo Mode Section */}
      {isDemoEnabled && (
        <section className={styles.demoSection}>
          <div className={styles.demoCard}>
            <h3 className={styles.demoTitle}>Demo Mode</h3>
            <p className={styles.demoText}>
              Try Dottinoo with demo accounts. Create a demo teacher and student account to explore the platform.
            </p>
            <Button
              variant="secondary"
              onClick={() => router.push('/onboarding')}
            >
              Try Demo
            </Button>
            <p className={styles.demoNote}>
              Demo accounts are available after sign-up. Look for "Create Demo Users" in your teacher dashboard.
            </p>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLinks}>
            <Link href="/privacy" className={styles.footerLink}>
              Privacy
            </Link>
            <span className={styles.footerSeparator}>•</span>
            <Link href="/terms" className={styles.footerLink}>
              Terms
            </Link>
            <span className={styles.footerSeparator}>•</span>
            <a href="mailto:innoaitechsolution@gmail.com" className={styles.footerLink}>
              Contact
            </a>
          </div>
          <div className={styles.footerAttribution}>
            Dottinoo is a product by InnoAl Tech Solutions.
          </div>
          <div className={styles.footerCopyright}>
            © Dottinoo
          </div>
        </div>
      </footer>
    </div>
  )
}
