import type { ReactNode } from 'react'
import { Card } from './Card'

export interface RecommendationStat {
  label: string
  value: string
  hint?: string
}

export interface RecommendationCardProps {
  title: string
  /** Racional explicável da recomendação ("por quê"). */
  rationale: string
  stats?: readonly RecommendationStat[]
  /** Selos de proveniência das fontes que alimentam o "por quê" (SourceBadge). */
  fontes?: ReactNode
  /** Slot para badges (ação, confiança, risco). */
  badges?: ReactNode
  /** Slot extra entre os números e as ações (ex.: ConfidenceMeter). */
  extra?: ReactNode
  /** Slot de ações (botões). */
  actions?: ReactNode
  className?: string
}

export function RecommendationCard({
  title,
  rationale,
  stats = [],
  fontes,
  badges,
  extra,
  actions,
  className = '',
}: RecommendationCardProps) {
  return (
    <Card variant="gold" className={className}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
        {badges && <div className="flex flex-wrap items-center gap-2">{badges}</div>}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{rationale}</p>
      {fontes && (
        <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-1">
          <span className="mr-1 text-[11px] font-medium uppercase tracking-wide text-ink-faint">Fontes</span>
          {fontes}
        </div>
      )}
      {stats.length > 0 && (
        <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-card border border-edge/60 bg-navy/40 px-3 py-2.5">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
                {stat.label}
              </dt>
              <dd className="tnums mt-1 font-display text-lg font-semibold text-ink">{stat.value}</dd>
              {stat.hint && <dd className="text-[11px] text-ink-subtle">{stat.hint}</dd>}
            </div>
          ))}
        </dl>
      )}
      {extra && <div className="mt-4">{extra}</div>}
      {actions && <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>}
    </Card>
  )
}
