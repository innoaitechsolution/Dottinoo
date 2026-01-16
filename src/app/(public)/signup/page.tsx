'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { signUp } from '@/lib/supabase/auth'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Select from '@/components/Select'
import AuthLayout from '@/components/AuthLayout/AuthLayout'
import ConfigError from '@/components/ConfigError'
import styles from './page.module.css'

type MainRole = 'student' | 'parent' | 'school' | 'social-services' | 'third-party' | 'local-authority'
type SubRole = 'mother' | 'father' | 'guardian' | 'carer' | 'school-admin' | 'teacher' | 'teaching-assistant' | 'charity' | 'private-company'

const SUPPORTED_ROLES: MainRole[] = ['student', 'school']
const REQUEST_ACCESS_ROLES: MainRole[] = ['parent', 'social-services', 'third-party', 'local-authority']

export default function SignUpPage() {
  // Show config error if Supabase is not configured
  if (!isSupabaseConfigured()) {
    return <ConfigError />
  }

  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [mainRole, setMainRole] = useState<MainRole>('student')
  const [subRole, setSubRole] = useState<SubRole | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false)
  const [showRequestAccess, setShowRequestAccess] = useState(false)

  const isSupportedRole = SUPPORTED_ROLES.includes(mainRole)
  const showSubRoleSelector = mainRole === 'parent' || mainRole === 'school' || mainRole === 'third-party'

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    // Check if role requires access request
    if (!isSupportedRole) {
      setShowRequestAccess(true)
      return
    }

    // Validate sub-role for school
    if (mainRole === 'school' && !subRole) {
      setError('Please select your role within the school.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setIsLoading(true)

    try {
      // Map role to database role
      let dbRole = 'student'
      if (mainRole === 'school') {
        if (subRole === 'school-admin') {
          dbRole = 'admin'
        } else if (subRole === 'teacher' || subRole === 'teaching-assistant') {
          dbRole = 'teacher'
        }
      }

      // Sign up the user with metadata
      const { data, error: signUpError } = await signUp(email, password, {
        role: dbRole,
        full_name: fullName.trim() || null,
      })

      if (signUpError) {
        setError(signUpError.message || 'Failed to create account. Please try again.')
        setIsLoading(false)
        return
      }

      if (!data?.user) {
        setError('Failed to create account. Please try again.')
        setIsLoading(false)
        return
      }

      // Check if session was created (email confirmation disabled) or not (email confirmation enabled)
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        // Session created immediately (email confirmation disabled) - redirect to app
        router.push('/app')
        router.refresh()
      } else {
        // Email confirmation required - show message
        setShowEmailConfirmation(true)
        setIsLoading(false)
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout>
        <div className={styles.logoSection}>
          <Image
            src="/brand/dottinoo-logo.png"
            alt="Dottinoo logo"
            width={64}
            height={64}
            className={styles.logo}
          />
        </div>
        <h1 className={styles.title}>Create Account</h1>
        <p className={styles.subtitle}>Join Dottinoo and start your learning journey</p>

        {showRequestAccess ? (
          <div className={styles.requestAccess}>
            <h2 className={styles.requestTitle}>Request Access</h2>
            <p className={styles.requestMessage}>
              {mainRole === 'parent' && 'Parent/Carer accounts are coming soon. '}
              {mainRole === 'social-services' && 'Social Services accounts are coming soon. '}
              {mainRole === 'third-party' && 'Third-Party Organisation accounts are coming soon. '}
              {mainRole === 'local-authority' && 'Local Authority accounts are coming soon. '}
              Please contact us to request access or use Email sign-up for Student or School accounts.
            </p>
            <div className={styles.requestActions}>
              <Button
                variant="primary"
                onClick={() => {
                  setShowRequestAccess(false)
                  setMainRole('student')
                }}
              >
                Continue as Student
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setShowRequestAccess(false)
                  setMainRole('school')
                }}
              >
                Continue as School
              </Button>
              <a href="mailto:support@dottinoo.com" className={styles.contactLink}>
                Contact us for access
              </a>
            </div>
          </div>
        ) : showEmailConfirmation ? (
          <div className={styles.emailConfirmation}>
            <h2 className={styles.confirmationTitle}>Check your email</h2>
            <p className={styles.confirmationMessage}>
              We've sent a confirmation link to <strong>{email}</strong>. Please check your email and click the link to confirm your account before signing in.
            </p>
            <Button
              variant="primary"
              onClick={() => router.push('/login')}
              className={styles.backToLoginButton}
            >
              Back to Sign In
            </Button>
          </div>
        ) : (
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
            id="fullName"
            type="text"
            label="Full Name (Optional)"
            placeholder="Your name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={isLoading}
          />

          <Select
            id="mainRole"
            label="I am a"
            value={mainRole}
            onChange={(e) => {
              setMainRole(e.target.value as MainRole)
              setSubRole('')
            }}
            required
            disabled={isLoading}
          >
            <option value="student">Student (Learner) - Ages 14-24</option>
            <option value="parent">Parent / Carer</option>
            <option value="school">School / Education Organisation</option>
            <option value="social-services">Social Services</option>
            <option value="third-party">Third-Party Organisation</option>
            <option value="local-authority">Local Authority (Council)</option>
          </Select>

          {showSubRoleSelector && mainRole === 'parent' && (
            <Select
              id="subRole"
              label="Your relationship"
              value={subRole}
              onChange={(e) => setSubRole(e.target.value as SubRole)}
              required
              disabled={isLoading}
            >
              <option value="">Select relationship</option>
              <option value="mother">Mother</option>
              <option value="father">Father</option>
              <option value="guardian">Guardian</option>
              <option value="carer">Carer</option>
            </Select>
          )}

          {showSubRoleSelector && mainRole === 'school' && (
            <Select
              id="subRole"
              label="Your role"
              value={subRole}
              onChange={(e) => setSubRole(e.target.value as SubRole)}
              required
              disabled={isLoading}
            >
              <option value="">Select your role</option>
              <option value="school-admin">School Admin</option>
              <option value="teacher">Teacher</option>
              <option value="teaching-assistant">Teaching Assistant</option>
            </Select>
          )}

          {showSubRoleSelector && mainRole === 'third-party' && (
            <Select
              id="subRole"
              label="Organisation type"
              value={subRole}
              onChange={(e) => setSubRole(e.target.value as SubRole)}
              required
              disabled={isLoading}
            >
              <option value="">Select type</option>
              <option value="charity">Charity</option>
              <option value="private-company">Private Company</option>
            </Select>
          )}

          <Input
            id="password"
            type="password"
            label="Password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />

          <Input
            id="confirmPassword"
            type="password"
            label="Confirm Password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isLoading}
          />

            <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className={styles.submitButton}>
              Sign Up
            </Button>
          </form>
        )}

        {!showEmailConfirmation && (
          <p className={styles.footer}>
          Already have an account?{' '}
            <a href="/login" className={styles.link}>
              Sign in
            </a>
          </p>
        )}
    </AuthLayout>
  )
}

