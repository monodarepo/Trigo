import type { ReactNode } from 'react'

export interface SectionTitleProps {
  eyebrow?: string
  title: string
  subtitle?: string
  /** Slot à direita (badges, botões, filtros). */
  actions?: ReactNode
  className?: string
}

export function SectionTitle({ eyebrow, title, subtitle, actions, className = '' }: SectionTitleProps) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-1 font-display text-xl font-semibold text-ink lg:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-ink-subtle">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
