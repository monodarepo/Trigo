import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Tone } from './tones'

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  /** Cor-sintaxe do selo do ícone (default: neutro). */
  tone?: Tone
  /** Versão compacta para dropdowns/painéis. */
  compact?: boolean
  className?: string
}

const SELO_TONE: Record<Tone, string> = {
  neutral: 'bg-card-2 text-ink-subtle',
  positive: 'bg-positive/15 text-positive',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
  info: 'bg-azure/15 text-azure',
  gold: 'bg-gold/15 text-gold',
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  tone = 'neutral',
  compact = false,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-card-lg border border-dashed border-edge bg-card/50 text-center ${
        compact ? 'px-4 py-6' : 'px-6 py-12'
      } ${className}`}
    >
      <span
        className={`flex items-center justify-center rounded-full ${SELO_TONE[tone]} ${compact ? 'h-9 w-9' : 'h-12 w-12'}`}
        aria-hidden="true"
      >
        <Icon size={compact ? 17 : 22} />
      </span>
      <p className={`font-display font-semibold text-ink ${compact ? 'mt-2.5 text-sm' : 'mt-4 text-base'}`}>{title}</p>
      {description && (
        <p className={`max-w-sm text-ink-subtle ${compact ? 'mt-1 text-xs' : 'mt-1 text-sm'}`}>{description}</p>
      )}
      {action && <div className={compact ? 'mt-3' : 'mt-4'}>{action}</div>}
    </div>
  )
}
