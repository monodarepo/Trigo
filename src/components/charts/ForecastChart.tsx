import { memo } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { colors } from '../../theme/tokens'
import { formatDataPt } from '../../data/format'
import type { PontoPrevisao } from '../../data/types'

interface PontoGrafico {
  rotulo: string
  historico?: number
  projecao?: number
  banda?: [number, number]
}

export interface ForecastChartProps {
  historico: readonly PontoPrevisao[]
  projecao: readonly PontoPrevisao[]
  /** Formata valores no tooltip (ex.: "US$ 214"). */
  formatValor: (valor: number) => string
  /** Formata os ticks do eixo Y; default = formatValor. */
  formatTick?: (valor: number) => string
  rotuloProjecao?: string
  height?: number
  ariaLabel: string
}

function montarPontos(
  historico: readonly PontoPrevisao[],
  projecao: readonly PontoPrevisao[],
): PontoGrafico[] {
  const pontos: PontoGrafico[] = historico.map((p) => ({
    rotulo: formatDataPt(p.data),
    historico: p.valor,
  }))
  projecao.forEach((p, i) => {
    const banda =
      p.bandaMin != null && p.bandaMax != null
        ? ([p.bandaMin, p.bandaMax] as [number, number])
        : undefined
    const rotulo = formatDataPt(p.data)
    const ultimo = pontos[pontos.length - 1]
    if (i === 0 && ultimo && ultimo.rotulo === rotulo) {
      // Junta o ponto "hoje" (fim do histórico = início da projeção).
      ultimo.projecao = p.valor
      ultimo.banda = banda
    } else {
      pontos.push({ rotulo, projecao: p.valor, banda })
    }
  })
  return pontos
}

interface ItemTooltip {
  dataKey?: string | number
  value?: number | [number, number]
}

function ConteudoTooltip({
  active,
  payload,
  label,
  formatValor,
}: {
  active?: boolean
  payload?: ItemTooltip[]
  label?: string
  formatValor?: (v: number) => string
}) {
  if (!active || !payload?.length || !formatValor) return null
  const valor = (chave: string) => payload.find((p) => p.dataKey === chave)?.value
  const hist = valor('historico')
  const proj = valor('projecao')
  const banda = valor('banda')
  return (
    <div className="rounded-card border border-edge bg-card-2 px-3 py-2 text-xs shadow-card">
      <p className="font-semibold text-ink">{label}</p>
      {typeof hist === 'number' && (
        <p className="tnums mt-1 text-ink-muted">Histórico: {formatValor(hist)}</p>
      )}
      {typeof proj === 'number' && (
        <p className="tnums mt-1 font-semibold text-gold-light">Projeção: {formatValor(proj)}</p>
      )}
      {Array.isArray(banda) && (
        <p className="tnums mt-0.5 text-ink-subtle">
          Banda: {formatValor(banda[0])} – {formatValor(banda[1])}
        </p>
      )}
    </div>
  )
}

/**
 * Linha de histórico + projeção tracejada com banda de confiança sombreada.
 * memo(): só re-renderiza quando as séries/formatadores mudam de referência —
 * quem passa as séries deve memoizá-las (useMemo) e manter formatadores estáveis.
 */
export const ForecastChart = memo(function ForecastChart({
  historico,
  projecao,
  formatValor,
  formatTick,
  rotuloProjecao = 'Projeção',
  height = 280,
  ariaLabel,
}: ForecastChartProps) {
  const pontos = montarPontos(historico, projecao)
  const valores: number[] = []
  for (const p of pontos) {
    if (p.historico != null) valores.push(p.historico)
    if (p.projecao != null) valores.push(p.projecao)
    if (p.banda) valores.push(...p.banda)
  }
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  const folga = (max - min) * 0.1 || 1
  const rotuloHoje = projecao.length > 0 ? formatDataPt(projecao[0].data) : undefined
  const tick = formatTick ?? formatValor

  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={pontos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={colors.navy.border} strokeOpacity={0.35} vertical={false} />
          <XAxis
            dataKey="rotulo"
            tick={{ fill: colors.text.subtle, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: colors.navy.border }}
            minTickGap={24}
          />
          <YAxis
            width={64}
            domain={[min - folga, max + folga]}
            tick={{ fill: colors.text.subtle, fontSize: 11 }}
            tickFormatter={tick}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={<ConteudoTooltip formatValor={formatValor} />}
            cursor={{ stroke: colors.navy.border, strokeDasharray: '3 3' }}
          />
          {rotuloHoje && (
            <ReferenceLine
              x={rotuloHoje}
              stroke={colors.navy.border}
              strokeDasharray="4 4"
              label={{ value: 'hoje', position: 'insideTopLeft', fill: colors.text.subtle, fontSize: 10 }}
            />
          )}
          <Area
            dataKey="banda"
            stroke="none"
            fill={colors.gold.primary}
            fillOpacity={0.14}
            activeDot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="historico"
            stroke={colors.text.muted}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="projecao"
            stroke={colors.gold.primary}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={{ r: 2.5, fill: colors.gold.primary, stroke: 'none' }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-subtle">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-ink-muted" aria-hidden="true" />
          Histórico
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-0.5 w-4 rounded bg-gold"
            style={{ maskImage: 'linear-gradient(90deg, #000 60%, transparent 60%)' }}
            aria-hidden="true"
          />
          {rotuloProjecao}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-gold/20" aria-hidden="true" />
          Banda de confiança (P10–P90)
        </span>
      </div>
    </div>
  )
})
