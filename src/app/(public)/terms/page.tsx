import Link from 'next/link'
import Button from '@/components/Button'
import AuthLayout from '@/components/AuthLayout/AuthLayout'
import styles from './page.module.css'

export default function TermsPage() {
  return (
    <AuthLayout maxWidth="wide">
      <div className={styles.content}>
        <h1 className={styles.title}>Terms of Service</h1>
        <div className={styles.textContent}>
          <p className={styles.lastUpdated}>Last updated: {new Date().toLocaleDateString()}</p>
          
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>1. Acceptance of Terms</h2>
            <p>
              By accessing and using Dottinoo, you accept and agree to be bound by the terms and provision of this agreement.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>2. Use License</h2>
            <p>
              Permission is granted to temporarily use Dottinoo for personal, non-commercial educational purposes. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className={styles.list}>
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose</li>
              <li>Attempt to decompile or reverse engineer any software</li>
              <li>Remove any copyright or other proprietary notations</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>3. User Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>4. Privacy</h2>
            <p>
              Your use of Dottinoo is also governed by our Privacy Notice. Please review our Privacy Notice to understand our practices.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>5. Contact</h2>
            <p>
              If you have any questions about these Terms, please contact us.
            </p>
          </section>
        </div>

        <div className={styles.actions}>
          <Link href="/onboarding">
            <Button variant="primary">Back to Sign Up</Button>
          </Link>
        </div>
    </AuthLayout>
  )
}

