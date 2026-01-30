'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'
import ProviderButton from '@/components/ProviderButton'
import AuthLayout from '@/components/AuthLayout/AuthLayout'
import ConfigError from '@/components/ConfigError'
import styles from './page.module.css'

export default function OnboardingPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Show config error if Supabase is not configured
  if (!isSupabaseConfigured()) {
    return <ConfigError />
  }

  const handleOAuthSignIn = async (provider: 'google' | 'apple' | 'microsoft') => {
    setIsLoading(provider)
    setError(null)

    try {
      if (provider === 'google') {
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback?next=/app`,
          },
        })

        if (oauthError) {
          setError(oauthError.message || 'Failed to sign in with Google')
          setIsLoading(null)
        }
      } else {
        // Apple and Microsoft not configured yet
        setError(`${provider === 'apple' ? 'Apple' : 'Microsoft'} sign-in is not configured yet. Please use Email or Google.`)
        setIsLoading(null)
      }
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.')
      setIsLoading(null)
    }
  }

  return (
    <AuthLayout>
        <div className={styles.logoSection}>
          <div className={styles.logoBadge}>
            <Image
              src="/brand/dottinoo-logo.png"
              alt="Dottinoo logo"
              width={72}
              height={72}
              className={styles.logo}
            />
          </div>
        </div>
        <h1 className={styles.title}>Create your account</h1>
        <p className={styles.subtitle}>Pick a sign-in method to get started.</p>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <div className={styles.buttonGroup}>
          <ProviderButton
            provider="google"
            label="Continue with Google"
            onClick={() => handleOAuthSignIn('google')}
            isLoading={isLoading === 'google'}
            disabled={!!isLoading}
          />

          <ProviderButton
            provider="apple"
            label="Continue with Apple"
            onClick={() => handleOAuthSignIn('apple')}
            isLoading={isLoading === 'apple'}
            disabled={!!isLoading}
          />

          <ProviderButton
            provider="microsoft"
            label="Continue with Microsoft"
            onClick={() => handleOAuthSignIn('microsoft')}
            isLoading={isLoading === 'microsoft'}
            disabled={!!isLoading}
          />

          <div className={styles.separator}>
            <span className={styles.separatorLine}></span>
            <span className={styles.separatorText}>Or continue with</span>
            <span className={styles.separatorLine}></span>
          </div>

          <ProviderButton
            provider="email"
            label="Continue with Email"
            onClick={() => router.push('/signup')}
            disabled={!!isLoading}
          />
        </div>

        <div className={styles.secondaryAction}>
          <p className={styles.secondaryText}>
            Already have an account?{' '}
            <Link href="/login" className={styles.secondaryLink}>
              Log in
            </Link>
          </p>
        </div>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            By continuing you agree to our{' '}
            <Link href="/terms" className={styles.footerLink}>
              Terms
            </Link>
            {' '}and{' '}
            <Link href="/privacy" className={styles.footerLink}>
              Privacy Notice
            </Link>
            .
          </p>
        </div>
    </AuthLayout>
  )
}

