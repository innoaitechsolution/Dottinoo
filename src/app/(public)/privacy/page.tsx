import Link from 'next/link'
import Button from '@/components/Button'
import AuthLayout from '@/components/AuthLayout/AuthLayout'
import styles from './page.module.css'

export default function PrivacyPage() {
  return (
    <AuthLayout maxWidth="wide">
      <div className={styles.content}>
        <h1 className={styles.title}>Privacy Notice</h1>
        <div className={styles.textContent}>
          <p className={styles.lastUpdated}>Last updated: {new Date().toLocaleDateString()}</p>
          
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>1. Information We Collect</h2>
            <p>
              We collect information that you provide directly to us, including:
            </p>
            <ul className={styles.list}>
              <li>Email address and account information</li>
              <li>Name and profile information</li>
              <li>Educational content and submissions</li>
              <li>Usage data and interactions with the platform</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>2. How We Use Your Information</h2>
            <p>
              We use the information we collect to:
            </p>
            <ul className={styles.list}>
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send technical notices and support messages</li>
              <li>Respond to your comments and questions</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>3. Information Sharing</h2>
            <p>
              We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
            </p>
            <ul className={styles.list}>
              <li>With your consent</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and safety</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>4. Data Security</h2>
            <p>
              We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>5. Your Rights</h2>
            <p>
              You have the right to access, update, or delete your personal information. You can do this through your account settings or by contacting us.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>6. Contact</h2>
            <p>
              If you have any questions about this Privacy Notice, please contact us.
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

