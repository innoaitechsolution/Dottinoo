'use client'

import { useRouter } from 'next/navigation'
import { ButtonHTMLAttributes } from 'react'
import styles from './BackButton.module.css'

interface BackButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  fallbackHref: string
  label?: string
}

export default function BackButton({
  fallbackHref,
  label = 'Back',
  className = '',
  ...props
}: BackButtonProps) {
  const router = useRouter()

  const handleClick = () => {
    // Try to go back in history if possible
    // Note: window.history.length > 1 is not always reliable, but it's a reasonable check
    // If user came from external link or direct navigation, fallback to safe route
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${styles.backButton} ${className}`}
      aria-label={label}
      {...props}
    >
      <svg
        className={styles.icon}
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M10 12L6 8L10 4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={styles.label}>{label}</span>
    </button>
  )
}
