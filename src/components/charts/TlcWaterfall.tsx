import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { colors } from '../../theme/tokens'
import { formatBRL } from '../../data/format'
import type { ComponenteTLC } from '../../data/types'

interface LinhaWaterfall {
  rotulo: string
  completo: string
  descricao?: string
  base: number
  valor: number
  acumulado: number
  cor: string
  ehTotal: boolean
}

export interface ItemLegendaWaterfall {
  /** Classe Tailwind da amostra de cor (ex.: "bg-gold/85"). */
  cor: string
  rotulo: string
}

export interface TlcWaterfallProps {
  componentes: readonly ComponenteTLC[]
  totalRs: number
  ariaLabel: string
  /** Sufixo dos valores no tooltip (default "/t"). */
  sufixo?: string
  /** Rótulo da barra final (default "TLC total"). */
  rotuloTotal?: string
  /** Itens da legenda (default: categorias do TLC). */
  legenda?: readonly ItemLegendaWaterfall[]
}

const LEGENDA_TLC: readonly ItemLegendaWaterfall[] = [
  { cor: 'bg-gold/85', rotulo: 'Custo firme' },
  { cor: 'bg-info/85', rotulo: 'Imposto' },
  { cor: 'bg-danger/85', rotulo: 'Risco precificado' },
  { cor: 'bg-gold-light', rotulo: 'TLC total' },
]

const COR_POR_TIPO: Partial<Record<ComponenteTLC['tipo'], string>> = {
  risco: colors.semantic.danger,
  imposto: colors.semantic.info,
}

function montarLinhas(componentes: readonly ComponenteTLC[], totalRs: number, rotuloTotal: string): LinhaWaterfall[] {
  let acumulado = 0
  const linhas: LinhaWaterfall[] = componentes.map((c) => {
    const base = acumulado
    acumulado += c.valorRs
    return {
      rotulo: c.rotuloCurto ?? c.rotulo,
      completo: c.rotulo,
      descricao: c.descricao,
      base: Math.round(base * 10) / 10,
      valor: c.valorRs,
      acumulado: Math.round(acumulado * 10) / 10,
      cor: COR_POR_TIPO[c.tipo] ?? colors.gold.primary,
      ehTotal: false,
    }
  })
  linhas.push({
    rotulo: rotuloTotal,
    completo: rotuloTotal,
    base: 0,
    valor: totalRs,
    acumulado: totalRs,
    cor: colors.gold.light,
    ehTotal: true,
  })
  return linhas
}

function ConteudoTooltip({
  active,
  payload,
  sufixo = '/t',
}: {
  active?: boolean
  payload?: Array<{ payload?: LinhaWaterfall }>
  sufixo?: string
}) {
  const linha = payload?.[0]?.payload
  if (!active || !linha) return null
  return (
    <div className="max-w-64 rounded-card border border-edge bg-card-2 px-3 py-2 text-xs shadow-card">
      <p className="font-semibold text-ink">{linha.completo}</p>
      <p className="tnums mt-1 text-gold-light">
        {linha.ehTotal ? 'Total' : 'Parcela'}: {formatBRL(linha.valor, { casas: 2 })}
        {sufixo}
      </p>
      {!linha.ehTotal && (
        <p className="tnums mt-0.5 text-ink-muted">
          Acumulado: {formatBRL(linha.acumulado, { casas: 2 })}
          {sufixo}
        </p>
      )}
      {linha.descricao && <p className="mt-1 leading-snug text-ink-subtle">{linha.descricao}</p>}
    </div>
  )
}

const fmtRotulo = (v: number) =>
  v === 0
    ? '0'
    : v >= 100
      ? Math.round(v).toLocaleString('pt-BR')
      : v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** Waterfall horizontal: barra invisível (acumulado) + parcela colorida, com barra final de total. */
export function TlcWaterfall({
  componentes,
  totalRs,
  ariaLabel,
  sufixo = '/t',
  rotuloTotal = 'TLC total',
  legenda = LEGENDA_TLC,
}: TlcWaterfallProps) {
  const linhas = montarLinhas(componentes, totalRs, rotuloTotal)
  const altura = linhas.length * 30 + 24
  const passo = totalRs > 200 ? 100 : totalRs > 20 ? 10 : 5

  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={altura}>
        <BarChart data={linhas} layout="vertical" margin={{ top: 4, right: 56, bottom: 0, left: 8 }} barSize={14}>
          <XAxis
            type="number"
            domain={[0, Math.ceil((totalRs * 1.06) / passo) * passo]}
            tick={{ fill: colors.text.subtle, fontSize: 11 }}
            tickFormatter={(v: number) => v.toLocaleString('pt-BR')}
            axisLine={{ stroke: colors.navy.border }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="rotulo"
            width={150}
            interval={0}
            tick={{ fill: colors.text.muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ConteudoTooltip sufixo={sufixo} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="valor" stackId="w" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {linhas.map((linha) => (
              <Cell key={linha.rotulo} fill={linha.cor} fillOpacity={linha.ehTotal ? 1 : 0.85} />
            ))}
            <LabelList
              dataKey="valor"
              position="right"
              formatter={(valor: unknown) => fmtRotulo(Number(valor))}
              style={{ fill: colors.text.muted, fontSize: 10, fontVariantNumeric: 'tabular-nums' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-subtle">
        {legenda.map((item) => (
          <span key={item.rotulo} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-4 rounded-sm ${item.cor}`} aria-hidden="true" />
            {item.rotulo}
          </span>
        ))}
      </div>
    </div>
  )
}
