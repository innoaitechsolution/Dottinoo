'use client'

import { ButtonHTMLAttributes } from 'react'
import styles from './ProviderButton.module.css'

type Provider = 'google' | 'apple' | 'microsoft' | 'email'

interface ProviderButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  provider: Provider
  label: string
  onClick: () => void
  disabled?: boolean
  isLoading?: boolean
}

// Inline SVG icons
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M19.6 10.2273C19.6 9.51818 19.5364 8.83636 19.4182 8.18182H10V12.05H15.3818C15.15 13.3 14.4455 14.3591 13.3864 15.0682V17.5773H16.6182C18.5091 15.8364 19.6 13.2727 19.6 10.2273Z"
      fill="#4285F4"
    />
    <path
      d="M10 20C12.7 20 14.9636 19.1045 16.6182 17.5773L13.3864 15.0682C12.4909 15.6682 11.3455 16.0227 10 16.0227C7.39545 16.0227 5.19091 14.2636 4.40455 11.9H1.06364V14.4909C2.70909 17.7591 6.09091 20 10 20Z"
      fill="#34A853"
    />
    <path
      d="M4.40455 11.9C4.20455 11.3 4.09091 10.6591 4.09091 10C4.09091 9.34091 4.20455 8.7 4.40455 8.1V5.50909H1.06364C0.386364 6.85909 0 8.38636 0 10C0 11.6136 0.386364 13.1409 1.06364 14.4909L4.40455 11.9Z"
      fill="#FBBC05"
    />
    <path
      d="M10 3.97727C11.4682 3.97727 12.7864 4.48182 13.8227 5.47273L16.6909 2.60455C14.9591 0.990909 12.6955 0 10 0C6.09091 0 2.70909 2.24091 1.06364 5.50909L4.40455 8.1C5.19091 5.73636 7.39545 3.97727 10 3.97727Z"
      fill="#EA4335"
    />
  </svg>
)

const AppleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M15.075 1.595c-0.945 0.56-2.07 0.95-3.2 0.9-0.15-1.275 0.39-2.505 1.32-3.36 0.96-0.88 2.18-1.49 3.4-1.57-0.135 1.28-0.52 2.56-1.52 3.03zm1.52 2.54c-1.84-0.11-3.4 1.08-4.28 1.08-0.9 0-2.32-1.06-3.84-1.03-1.97 0.04-3.78 1.15-4.79 2.93-2.04 3.54-0.52 8.78 1.44 11.65 0.98 1.42 2.14 3.01 3.67 2.95 1.5-0.06 2.06-0.97 3.87-0.97 1.8 0 2.31 0.97 3.88 0.94 1.6-0.03 2.61-1.46 3.57-2.9 1.13-1.62 1.59-3.19 1.62-3.27-0.03-0.01-3.11-1.19-3.14-4.73-0.02-3 2.58-4.44 2.7-4.52-1.47-2.15-3.76-2.39-4.66-2.43-2.12-0.17-3.94 1.25-4.96 1.25z"
      fill="#000000"
    />
  </svg>
)

const MicrosoftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="8" height="8" fill="#F25022" />
    <rect x="11" y="1" width="8" height="8" fill="#7FBA00" />
    <rect x="1" y="11" width="8" height="8" fill="#00A4EF" />
    <rect x="11" y="11" width="8" height="8" fill="#FFB900" />
  </svg>
)

const EmailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M2.5 5.83333L10 11.25L17.5 5.83333M3.33333 15.8333H16.6667C17.5871 15.8333 18.3333 15.0871 18.3333 14.1667V5.83333C18.3333 4.91286 17.5871 4.16667 16.6667 4.16667H3.33333C2.41286 4.16667 1.66667 4.91286 1.66667 5.83333V14.1667C1.66667 15.0871 2.41286 15.8333 3.33333 15.8333Z"
      stroke="#133E6C"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const getIcon = (provider: Provider) => {
  switch (provider) {
    case 'google':
      return <GoogleIcon />
    case 'apple':
      return <AppleIcon />
    case 'microsoft':
      return <MicrosoftIcon />
    case 'email':
      return <EmailIcon />
  }
}

export default function ProviderButton({
  provider,
  label,
  onClick,
  disabled = false,
  isLoading = false,
  className = '',
  ...props
}: ProviderButtonProps) {
  const buttonClasses = [
    styles.button,
    isLoading && styles.loading,
    disabled && styles.disabled,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type="button"
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled || isLoading}
      {...props}
    >
      <span className={styles.iconContainer}>{getIcon(provider)}</span>
      <span className={styles.label}>{isLoading ? 'Loading...' : label}</span>
    </button>
  )
}

