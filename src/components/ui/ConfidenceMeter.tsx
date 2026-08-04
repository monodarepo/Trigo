export interface ConfidenceMeterProps {
  /** Valor de 0 a 100. */
  value: number
  label?: string
  className?: string
}

export function ConfidenceMeter({ value, label = 'Confiança', className = '' }: ConfidenceMeterProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)))
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-ink-subtle">{label}</span>
        <span className="tnums text-xs font-semibold text-gold-light">{clamped}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-label={`${label}: ${clamped}%`}
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-edge/50"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold to-gold-light"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
