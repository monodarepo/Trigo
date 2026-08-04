import { toneBadgeClasses, type Tone } from './tones'

export type BadgeAction = 'comprar' | 'aguardar' | 'proteger'
export type BadgeRiskLevel = 'baixo' | 'medio' | 'alto'

export type BadgeProps = { className?: string } & (
  | { kind: 'confianca'; value: number }
  | { kind: 'acao'; action: BadgeAction }
  | { kind: 'risco'; level: BadgeRiskLevel }
  | { kind: 'status'; label: string; tone?: Tone }
)

const actionConfig: Record<BadgeAction, { label: string; tone: Tone }> = {
  comprar: { label: 'Comprar', tone: 'positive' },
  aguardar: { label: 'Aguardar', tone: 'warning' },
  proteger: { label: 'Proteger', tone: 'info' },
}

const riskConfig: Record<BadgeRiskLevel, { label: string; tone: Tone }> = {
  baixo: { label: 'Risco baixo', tone: 'positive' },
  medio: { label: 'Risco médio', tone: 'warning' },
  alto: { label: 'Risco alto', tone: 'danger' },
}

function resolve(props: BadgeProps): { label: string; tone: Tone } {
  switch (props.kind) {
    case 'confianca':
      return { label: `Confiança ${props.value}%`, tone: 'gold' }
    case 'acao':
      return actionConfig[props.action]
    case 'risco':
      return riskConfig[props.level]
    case 'status':
      return { label: props.label, tone: props.tone ?? 'neutral' }
  }
}

export function Badge(props: BadgeProps) {
  const { label, tone } = resolve(props)
  return (
    <span
      className={`tnums inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${toneBadgeClasses[tone]} ${props.className ?? ''}`}
    >
      {label}
    </span>
  )
}
