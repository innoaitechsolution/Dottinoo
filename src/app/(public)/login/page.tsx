'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { signIn, signOut } from '@/lib/supabase/auth'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import Button from '@/components/Button'
import Input from '@/components/Input'
import AuthLayout from '@/components/AuthLayout/AuthLayout'
import ConfigError from '@/components/ConfigError'
import styles from './page.module.css'

export default function LoginPage() {
  // Show config error if Supabase is not configured
  if (!isSupabaseConfigured()) {
    return <ConfigError />
  }
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // Clear any existing session so the new login is not mixed with a previous user.
      // This prevents the "teacher logs in but sees student dashboard" bug when switching
      // between demo accounts (e.g. student session was active, then teacher logs in).
      await signOut().catch(() => {})

      const { data, error: signInError } = await signIn(email, password)

      if (signInError) {
        const msg = (signInError as any).message || 'Failed to sign in. Please try again.'
        setError(msg)
        setIsLoading(false)
        return
      }

      if (data?.session) {
        router.push('/app')
        router.refresh()
      }
    } catch (err: any) {
      const message = err?.message || String(err)
      const isCorsOrNetwork = message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('CORS')
      setError(
        isCorsOrNetwork
          ? 'Unable to reach the server. Please check your connection and try again.'
          : 'An unexpected error occurred. Please try again.'
      )
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className={styles.backButtonContainer}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push('/')}
          className={styles.backButton}
        >
          ← Back
        </Button>
      </div>
      <AuthLayout>
        <Link href="/" className={styles.logoLink}>
          <div className={styles.logoSection}>
            <Image
              src="/brand/dottinoo-logo.png"
              alt="Dottinoo logo"
              width={64}
              height={64}
              className={styles.logo}
            />
          </div>
        </Link>
        <h1 className={styles.title}>Welcome Back</h1>
        <p className={styles.subtitle}>Sign in to continue your learning journey</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.errorMessage}>{error}</div>}

          <Input
            id="email"
            type="email"
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />

          <Input
            id="password"
            type="password"
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />

          <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className={styles.submitButton}>
            Sign In
          </Button>
        </form>

        <p className={styles.footer}>
          Don't have an account?{' '}
          <a href="/signup" className={styles.link}>
            Sign up
          </a>
        </p>
      </AuthLayout>
    </>
  )
}

