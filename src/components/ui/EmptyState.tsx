import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-card-lg border border-dashed border-edge bg-card/50 px-6 py-12 text-center ${className}`}
    >
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full bg-card-2 text-ink-subtle"
        aria-hidden="true"
      >
        <Icon size={22} />
      </span>
      <p className="mt-4 font-display text-base font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-subtle">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
