'use client'

import { SelectHTMLAttributes, forwardRef } from 'react'
import styles from './Select.module.css'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className = '', children, ...props }, ref) => {
    const selectClasses = [
      styles.select,
      error && styles.selectError,
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div className={styles.wrapper}>
        {label && (
          <label htmlFor={props.id} className={styles.label}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={selectClasses}
          {...props}
        >
          {children}
        </select>
        {error && <span className={styles.error}>{error}</span>}
      </div>
    )
  }
)

Select.displayName = 'Select'

export default Select

