import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { colors } from '../../theme/tokens'
import { formatPct, formatUSD } from '../../data/format'
import type { PosicaoHedge } from '../../data/types'

interface BarraExposicao {
  bucket: string
  cobertoM: number
  abertoM: number
  cobertoPct: number
  totalUsd: number
}

export interface ExposureChartProps {
  posicoes: readonly PosicaoHedge[]
  height?: number
  ariaLabel: string
}

const round1 = (v: number) => Math.round(v * 10) / 10
const rotuloBucket = (b: PosicaoHedge['bucketPrazo']) => `${b.replace('-', '–')}d`

function ConteudoTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload?: BarraExposicao }>
}) {
  const barra = payload?.[0]?.payload
  if (!active || !barra) return null
  return (
    <div className="rounded-card border border-edge bg-card-2 px-3 py-2 text-xs shadow-card">
      <p className="font-semibold text-ink">Bucket {barra.bucket}</p>
      <p className="tnums mt-1 text-ink-muted">Exposição: {formatUSD(barra.totalUsd, { compacto: true })}</p>
      <p className="tnums mt-0.5 text-positive">
        Coberto: US$ {barra.cobertoM.toLocaleString('pt-BR')}M ({formatPct(barra.cobertoPct)})
      </p>
      <p className="tnums mt-0.5 text-danger">
        Aberto: US$ {barra.abertoM.toLocaleString('pt-BR')}M ({formatPct(100 - barra.cobertoPct)})
      </p>
    </div>
  )
}

/** Barras empilhadas por bucket de prazo: exposição cambial coberta vs aberta (US$ M). */
export function ExposureChart({ posicoes, height = 260, ariaLabel }: ExposureChartProps) {
  const dados: BarraExposicao[] = posicoes.map((p) => ({
    bucket: rotuloBucket(p.bucketPrazo),
    cobertoM: round1((p.expostoUsd * p.cobertoPct) / 100 / 1e6),
    abertoM: round1((p.expostoUsd * (100 - p.cobertoPct)) / 100 / 1e6),
    cobertoPct: p.cobertoPct,
    totalUsd: p.expostoUsd,
  }))

  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barSize={44}>
          <CartesianGrid stroke={colors.navy.border} strokeOpacity={0.35} vertical={false} />
          <XAxis
            dataKey="bucket"
            tick={{ fill: colors.text.subtle, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: colors.navy.border }}
          />
          <YAxis
            width={56}
            tick={{ fill: colors.text.subtle, fontSize: 11 }}
            tickFormatter={(v: number) => `${v}M`}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<ConteudoTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="cobertoM" stackId="exp" fill={colors.semantic.positive} fillOpacity={0.9} isAnimationActive={false} />
          <Bar
            dataKey="abertoM"
            stackId="exp"
            fill={colors.semantic.danger}
            fillOpacity={0.75}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-subtle">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-positive/90" aria-hidden="true" />
          Coberto (NDF)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-danger/75" aria-hidden="true" />
          Aberto
        </span>
        <span className="ml-auto">Valores em US$ milhões</span>
      </div>
    </div>
  )
}
