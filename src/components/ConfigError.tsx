'use client'

import Link from 'next/link'
import styles from './ConfigError.module.css'

export default function ConfigError() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Configuration Required</h1>
        <p className={styles.message}>
          Supabase environment variables are not configured. Please set the following environment variables:
        </p>
        <ul className={styles.varsList}>
          <li><code>NEXT_PUBLIC_SUPABASE_URL</code></li>
          <li><code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
        </ul>
        <p className={styles.helpText}>
          If you're deploying to Netlify, add these in Site settings → Environment variables.
        </p>
        <p className={styles.helpText}>
          For local development, create a <code>.env.local</code> file with these variables.
        </p>
      </div>
    </div>
  )
}
