'use client'

import { ReactNode } from 'react'
import styles from './AuthLayout.module.css'

interface AuthLayoutProps {
  children: ReactNode
  maxWidth?: 'default' | 'wide'
}

export default function AuthLayout({ children, maxWidth = 'default' }: AuthLayoutProps) {
  return (
    <div className={styles.container}>
      <div className={`${styles.card} ${maxWidth === 'wide' ? styles.cardWide : ''}`}>{children}</div>
    </div>
  )
}

