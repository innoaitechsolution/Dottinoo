'use client'

import styles from './StatusChip.module.css'

type Status = 'not_started' | 'in_progress' | 'submitted' | 'reviewed'

interface StatusChipProps {
  status: Status
  className?: string
}

const statusLabels: Record<Status, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  reviewed: 'Reviewed',
}

export default function StatusChip({ status, className = '' }: StatusChipProps) {
  const chipClasses = [styles.chip, styles[status], className].filter(Boolean).join(' ')

  return (
    <span className={chipClasses}>
      {statusLabels[status]}
    </span>
  )
}

