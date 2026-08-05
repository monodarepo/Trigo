import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { colors } from '../../theme/tokens'
import { formatBRL } from '../../data/format'
import type { ComponenteCustoFarinha, TipoComponenteCustoFarinha } from '../../data/types'

/**
 * Waterfall do custo interno da farinha. Diferente do waterfall do TLC, aqui
 * há um passo NEGATIVO (o crédito do farelo abate o custo), então a barra
 * precisa descer: cada passo é desenhado entre o acumulado anterior e o novo,
 * e a cor diz se somou ou subtraiu.
 */

interface LinhaWaterfall {
  rotulo: string
  completo: string
  descricao?: string
  /** Início da barra flutuante (o menor entre os dois acumulados). */
  base: number
  /** Altura da barra (sempre positiva). */
  extensao: number
  /** Valor com sinal, para o rótulo e o tooltip. */
  valor: number
  acumulado: number
  cor: string
  ehTotal: boolean
  ehCredito: boolean
}

/** Cor como sintaxe: o trigo domina, o crédito é ganho, o resto é conversão. */
const COR_POR_TIPO: Record<TipoComponenteCustoFarinha, string> = {
  trigo: colors.gold.primary,
  conversao: colors.semantic.info,
  energia: colors.semantic.info,
  logistica: colors.semantic.violet,
  perdas: colors.semantic.info,
  depreciacao: colors.text.faint,
  credito: colors.semantic.positive,
}

const LEGENDA: ReadonlyArray<{ cor: string; rotulo: string }> = [
  { cor: 'bg-gold/85', rotulo: 'Trigo (matéria-prima)' },
  { cor: 'bg-info/85', rotulo: 'Conversão' },
  { cor: 'bg-violet/85', rotulo: 'Logística interna' },
  { cor: 'bg-ink-faint/85', rotulo: 'Depreciação (afundada)' },
  { cor: 'bg-positive/85', rotulo: 'Crédito do farelo' },
  { cor: 'bg-gold-light', rotulo: 'Custo interno' },
]

function montarLinhas(
  componentes: readonly ComponenteCustoFarinha[],
  totalRsT: number,
  rotuloTotal: string,
): LinhaWaterfall[] {
  let acumulado = 0
  const linhas: LinhaWaterfall[] = componentes.map((c) => {
    const anterior = acumulado
    acumulado = Math.round((acumulado + c.valorRs) * 10) / 10
    return {
      rotulo: c.rotuloCurto ?? c.rotulo,
      completo: c.rotulo,
      descricao: c.descricao,
      base: Math.min(anterior, acumulado),
      extensao: Math.abs(c.valorRs),
      valor: c.valorRs,
      acumulado,
      cor: COR_POR_TIPO[c.tipo],
      ehTotal: false,
      ehCredito: c.valorRs < 0,
    }
  })
  linhas.push({
    rotulo: rotuloTotal,
    completo: rotuloTotal,
    base: 0,
    extensao: totalRsT,
    valor: totalRsT,
    acumulado: totalRsT,
    cor: colors.gold.light,
    ehTotal: true,
    ehCredito: false,
  })
  return linhas
}

function ConteudoTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload?: LinhaWaterfall }>
}) {
  const linha = payload?.[0]?.payload
  if (!active || !linha) return null
  return (
    <div className="max-w-72 rounded-card border border-edge bg-card-2 px-3 py-2 text-xs shadow-raised">
      <p className="font-semibold text-ink">{linha.completo}</p>
      <p className={`tnums mt-1 font-mono ${linha.ehCredito ? 'text-positive' : 'text-gold-light'}`}>
        {linha.ehTotal ? 'Custo interno' : linha.ehCredito ? 'Abate' : 'Soma'}:{' '}
        {formatBRL(linha.valor, { casas: 2 })}/t
      </p>
      {!linha.ehTotal && (
        <p className="tnums mt-0.5 font-mono text-ink-muted">
          Acumulado: {formatBRL(linha.acumulado, { casas: 2 })}/t
        </p>
      )}
      {linha.descricao && <p className="mt-1.5 leading-snug text-ink-subtle">{linha.descricao}</p>}
    </div>
  )
}

/* Passo negativo mantém a casa decimal e usa o menos tipográfico (−), não o
   hífen ASCII: num waterfall o sinal é a informação, e "-215" ao lado de
   "215,4" na tabela pareceria outro número. */
const fmtRotulo = (v: number) =>
  `${v < 0 ? '−' : ''}${Math.abs(v).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}`

export interface CustoFarinhaWaterfallProps {
  componentes: readonly ComponenteCustoFarinha[]
  totalRsT: number
  ariaLabel: string
  /** Rótulo da barra final. */
  rotuloTotal?: string
}

export function CustoFarinhaWaterfall({
  componentes,
  totalRsT,
  ariaLabel,
  rotuloTotal = 'Custo interno da farinha',
}: CustoFarinhaWaterfallProps) {
  const linhas = montarLinhas(componentes, totalRsT, rotuloTotal)
  const altura = linhas.length * 32 + 24
  const teto = Math.max(...linhas.map((l) => l.base + l.extensao))

  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={altura}>
        <BarChart
          data={linhas}
          layout="vertical"
          margin={{ top: 4, right: 64, bottom: 0, left: 8 }}
          barSize={15}
        >
          <XAxis
            type="number"
            domain={[0, Math.ceil((teto * 1.06) / 100) * 100]}
            tick={{ fill: colors.text.subtle, fontSize: 11 }}
            tickFormatter={(v: number) => v.toLocaleString('pt-BR')}
            axisLine={{ stroke: colors.navy.border }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="rotulo"
            width={132}
            interval={0}
            tick={{ fill: colors.text.muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ConteudoTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          {/* Barra invisível que empurra a parcela até o acumulado anterior. */}
          <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="extensao" stackId="w" radius={[0, 4, 4, 0]} isAnimationActive={false}>
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
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-11 text-ink-subtle">
        {LEGENDA.map((item) => (
          <span key={item.rotulo} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-4 rounded-sm ${item.cor}`} aria-hidden="true" />
            {item.rotulo}
          </span>
        ))}
      </div>
    </div>
  )
}
