import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { colors } from '../../theme/tokens'
import { formatBRL } from '../../data/format'
import type { PerfilSimulacao } from '../../data/types'

interface BarraCenario {
  id: PerfilSimulacao
  rotulo: string
  /** Impacto no EBITDA em R$ (negativo = pressão de custo). */
  ebitdaRs: number
  valorM: number
}

export interface ScenarioCompareChartProps {
  dados: Array<{ id: PerfilSimulacao; rotulo: string; ebitdaRs: number }>
  height?: number
  ariaLabel: string
}

const COR_PERFIL: Record<PerfilSimulacao, string> = {
  conservador: colors.text.subtle,
  recomendado: colors.gold.primary,
  oportunistico: colors.semantic.info,
}

const fmtDelta = (v: number) => `${v < 0 ? '−' : '+'}${formatBRL(Math.abs(v), { compacto: true })}`

function ConteudoTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload?: BarraCenario }>
}) {
  const barra = payload?.[0]?.payload
  if (!active || !barra) return null
  return (
    <div className="rounded-card border border-edge bg-card-2 px-3 py-2 text-xs shadow-card">
      <p className="font-semibold text-ink">{barra.rotulo}</p>
      <p className="tnums mt-1 text-ink-muted">Impacto no EBITDA: {fmtDelta(barra.ebitdaRs)}</p>
    </div>
  )
}

/** Barras comparativas do impacto no EBITDA por cenário (R$ milhões). */
export function ScenarioCompareChart({ dados, height = 240, ariaLabel }: ScenarioCompareChartProps) {
  const barras: BarraCenario[] = dados.map((d) => ({
    ...d,
    valorM: Math.round((d.ebitdaRs / 1e6) * 10) / 10,
  }))
  const valores = barras.map((b) => b.valorM)
  const folga = Math.max(...valores.map(Math.abs)) * 0.2 || 1
  const dominio: [number, number] = [
    Math.min(0, Math.min(...valores)) - folga,
    Math.max(0, Math.max(...valores)) + folga,
  ]

  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={barras} margin={{ top: 20, right: 8, bottom: 0, left: 0 }} barSize={56}>
          <CartesianGrid stroke={colors.navy.border} strokeOpacity={0.35} vertical={false} />
          <XAxis
            dataKey="rotulo"
            tick={{ fill: colors.text.subtle, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: colors.navy.border }}
          />
          <YAxis
            width={56}
            domain={dominio}
            tick={{ fill: colors.text.subtle, fontSize: 11 }}
            tickFormatter={(v: number) => `${v}M`}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<ConteudoTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <ReferenceLine y={0} stroke={colors.navy.border} />
          <Bar dataKey="valorM" isAnimationActive={false} radius={[4, 4, 0, 0]}>
            {barras.map((barra) => (
              <Cell
                key={barra.id}
                fill={COR_PERFIL[barra.id]}
                fillOpacity={barra.id === 'recomendado' ? 1 : 0.75}
              />
            ))}
            <LabelList
              dataKey="ebitdaRs"
              position="top"
              formatter={(valor: unknown) => fmtDelta(Number(valor))}
              style={{ fill: colors.text.muted, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
