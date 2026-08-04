import { colors } from '../../theme/tokens'

export interface SparklineProps {
  data: readonly number[]
  width?: number
  height?: number
  tone?: 'gold' | 'positive' | 'danger' | 'info'
  strokeWidth?: number
  className?: string
}

const strokeColors = {
  gold: colors.gold.primary,
  positive: colors.semantic.positive,
  danger: colors.semantic.danger,
  info: colors.semantic.info,
}

/** Mini gráfico de linha decorativo (SVG puro, sem eixos). */
export function Sparkline({
  data,
  width = 96,
  height = 28,
  tone = 'gold',
  strokeWidth = 2,
  className = '',
}: SparklineProps) {
  if (data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pad = strokeWidth
  const stepX = (width - pad * 2) / (data.length - 1)
  const points = data
    .map((value, i) => {
      const x = pad + i * stepX
      const y = height - pad - ((value - min) / range) * (height - pad * 2)
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <polyline
        points={points}
        fill="none"
        stroke={strokeColors[tone]}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
