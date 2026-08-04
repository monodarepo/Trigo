import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'
import { toneTextClasses, type Tone } from './tones'

export type TrendDirection = 'up' | 'down' | 'flat'

export interface TrendArrowProps {
  direction: TrendDirection
  tone?: Tone
  size?: number
  /** Rótulo acessível; default descreve a direção. */
  label?: string
}

const icons = { up: ArrowUpRight, down: ArrowDownRight, flat: ArrowRight }
const defaultLabels: Record<TrendDirection, string> = {
  up: 'Em alta',
  down: 'Em queda',
  flat: 'Estável',
}

export function TrendArrow({ direction, tone = 'neutral', size = 16, label }: TrendArrowProps) {
  const Icon = icons[direction]
  return (
    <Icon
      size={size}
      className={`inline-block shrink-0 ${toneTextClasses[tone]}`}
      aria-label={label ?? defaultLabels[direction]}
    />
  )
}
