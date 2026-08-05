import { Card } from './Card'
import { TrendArrow, type TrendDirection } from './TrendArrow'
import { toneTextClasses, type Tone } from './tones'

export interface KpiDelta {
  label: string
  direction: TrendDirection
  tone?: Tone
}

import type { ReactNode } from 'react'

export interface KpiTileProps {
  label: string
  value: ReactNode
  /** Sufixo pequeno ao lado do valor (ex.: "/t", "dias"). */
  unit?: string
  delta?: KpiDelta
  hint?: string
  className?: string
}

export function KpiTile({ label, value, unit, delta, hint, className = '' }: KpiTileProps) {
  const deltaTone: Tone = delta?.tone ?? 'neutral'
  return (
    <Card padding="sm" className={className}>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">{label}</p>
      <p className="tnums mt-2 font-display text-2xl font-semibold leading-none text-ink">
        {value}
        {unit && <span className="ml-1 text-base font-medium text-ink-subtle">{unit}</span>}
      </p>
      {delta && (
        <p className={`mt-2 flex items-center gap-1 text-xs font-medium ${toneTextClasses[deltaTone]}`}>
          <TrendArrow direction={delta.direction} tone={deltaTone} size={14} />
          <span className="tnums">{delta.label}</span>
        </p>
      )}
      {hint && <p className="mt-1 text-xs text-ink-subtle">{hint}</p>}
    </Card>
  )
}
