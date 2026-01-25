'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Button from '@/components/Button'
import AuthLayout from '@/components/AuthLayout/AuthLayout'
import styles from './page.module.css'

export default function AboutPage() {
  const [imageError, setImageError] = useState(false)

  return (
    <AuthLayout maxWidth="wide">
      <div className={styles.content}>
        <h1 className={styles.title}>About Dottinoo</h1>
        
        <div className={styles.textContent}>
          <p className={styles.mission}>
            Dottinoo is an inclusive learning platform designed for UK classrooms, supporting students aged 14–24. 
            Our mission is to empower teachers with tools that enable personalized, accessible education while 
            helping students develop essential digital skills and achieve their learning goals.
          </p>

          <section className={styles.section}>
            <div className={styles.founderCard}>
              <div className={styles.founderImageWrapper}>
                {!imageError ? (
                  <Image
                    src="/about/arzu.png"
                    alt="Arzu Caner"
                    width={120}
                    height={120}
                    className={styles.founderImage}
                    onError={() => setImageError(true)}
                    unoptimized
                  />
                ) : (
                  <div className={styles.founderImageFallback}>
                    <span>A</span>
                  </div>
                )}
              </div>
              <div className={styles.founderInfo}>
                <span className={styles.founderLabel}>Founder</span>
                <h2 className={styles.founderName}>Arzu Caner</h2>
                <p className={styles.founderBio}>
                  Arzu Caner is a UK-based product builder and full-stack developer with a background in marketing, CRM, and digital project delivery. After leading customer loyalty and retention initiatives and training teams on systems and products, she moved into startup-focused digital projects and software development.
                </p>
                <p className={styles.founderBio}>
                  Today, Arzu builds mobile and web applications and develops applied AI products, especially in natural language processing, to make learning tools more accessible and usable. She is the founder of InnoAI Tech Solutions and the creator of Dottinoo, built to help teachers produce inclusive, differentiated tasks faster and support learners with diverse needs in developing essential digital skills.
                </p>
                <p className={styles.founderBio}>
                  Arzu also mentors and advocates for women in tech through the Women Coding Community, sharing practical learning resources and supporting early-career developers.
                </p>
                <div className={styles.followLinks}>
                  <h3 className={styles.followLinksTitle}>Follow / Links</h3>
                  <div className={styles.followLinksList}>
                    <a 
                      href="https://www.linkedin.com/in/arzucaner/" 
                      target="_blank" 
                      rel="noreferrer"
                      className={styles.followLink}
                    >
                      LinkedIn
                    </a>
                    <a 
                      href="https://arzucaner.github.io/codearz/" 
                      target="_blank" 
                      rel="noreferrer"
                      className={styles.followLink}
                    >
                      Website
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className={styles.actions}>
          <Link href="/onboarding">
            <Button variant="primary">Get Started</Button>
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}
