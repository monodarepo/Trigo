import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { toneBadgeClasses, type Tone } from './tones'

export interface PillProps {
  children: ReactNode
  tone?: Tone
  icon?: LucideIcon
  className?: string
}

/** Tag/rótulo pequeno para origens, portos, qualidades etc. */
export function Pill({ children, tone = 'neutral', icon: Icon, className = '' }: PillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${toneBadgeClasses[tone]} ${className}`}
    >
      {Icon && <Icon size={12} aria-hidden="true" />}
      {children}
    </span>
  )
}
