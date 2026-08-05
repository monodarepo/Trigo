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
import { formatPct } from '../../data/format'

export interface PontoRendimento {
  moinhoId: string
  /** Nome curto do moinho (ex.: "Fortaleza"). */
  nome: string
  /** Rendimento de farinha (%) — ex.: 76.0 */
  rendimentoPct: number
  /** Extração de farinha refinada/patente (%) — SEMPRE menor que o rendimento. */
  extracaoPct: number
  /** Marca o moinho selecionado na tela. */
  selecionado?: boolean
}

export interface RendimentoMoinhosChartProps {
  dados: readonly PontoRendimento[]
  ariaLabel: string
  /** Clique numa barra seleciona o moinho. */
  onSelecionar?: (moinhoId: string) => void
  /** Linha de referência (ex.: 76 = rendimento canônico do produto). */
  referenciaPct?: number
}

interface BarraRendimento extends PontoRendimento {
  /** Farinha do rendimento que NÃO é patente (rendimento − extração). */
  restantePct: number
  /** Altura plotada = rendimento − base do eixo truncado. */
  alturaPlot: number
}

const arred1 = (v: number) => Math.round(v * 10) / 10
/** "76,0%" */
const pct1 = (v: number) => formatPct(v, 1)

/**
 * Nome longo colide com o vizinho em card estreito: "Bento Gonçalves" vira
 * "Bento G." no eixo — o nome completo continua no tooltip.
 */
function rotuloEixo(nome: string): string {
  if (nome.length <= 12) return nome
  const partes = nome.split(/\s+/).filter(Boolean)
  if (partes.length >= 2 && partes[0].length <= 11) return `${partes[0]} ${partes[1][0]}.`
  return `${nome.slice(0, 11)}…`
}

/** Ticks em múltiplos "redondos" do valor ABSOLUTO (68%, 70%…), não do offset. */
function ticksDoEixo(base: number, altura: number): number[] {
  const passo = altura > 12 ? 4 : altura > 6 ? 2 : 1
  const ticks: number[] = []
  for (let valor = Math.ceil(base / passo) * passo; valor <= base + altura; valor += passo) {
    ticks.push(arred1(valor - base))
  }
  return ticks
}

function ConteudoTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload?: BarraRendimento }>
}) {
  const barra = payload?.[0]?.payload
  if (!active || !barra) return null
  return (
    <div className="max-w-64 rounded-card border border-edge bg-card-2 px-3 py-2 text-xs shadow-card">
      <p className="font-semibold text-ink">{barra.nome}</p>
      <p className="tnums mt-1 font-semibold text-gold-light">Rendimento: {pct1(barra.rendimentoPct)}</p>
      <p className="tnums mt-0.5 text-ink-muted">Extração refinada: {pct1(barra.extracaoPct)}</p>
      <p className="tnums mt-0.5 text-ink-subtle">Demais farinhas: {pct1(barra.restantePct)}</p>
    </div>
  )
}

/**
 * Barra com o traço da extração. A barra vai do topo (rendimento) até a base
 * do eixo truncado, então a posição da extração é interpolada nessa MESMA
 * escala linear — o traço cai exatamente onde o eixo o colocaria.
 */
function FormaBarra(props: {
  x?: number
  y?: number
  width?: number
  height?: number
  fill?: string
  fillOpacity?: number
  payload?: BarraRendimento
  base?: number
}) {
  const { x = 0, y = 0, width = 0, height = 0, fill, fillOpacity, payload, base = 0 } = props
  if (!payload) return null
  const amplitude = payload.rendimentoPct - base
  const fracao = amplitude > 0 ? (payload.rendimentoPct - payload.extracaoPct) / amplitude : 0
  const yExtracao = y + height * Math.min(1, Math.max(0, fracao))
  return (
    <g>
      <path
        d={`M${x},${y + height} L${x},${y + 4} Q${x},${y} ${x + 4},${y} L${x + width - 4},${y} Q${x + width},${y} ${x + width},${y + 4} L${x + width},${y + height} Z`}
        fill={fill}
        fillOpacity={fillOpacity}
      />
      <line
        x1={x}
        x2={x + width}
        y1={yExtracao}
        y2={yExtracao}
        stroke={colors.gold.light}
        strokeWidth={2}
        strokeOpacity={payload.selecionado ? 1 : 0.7}
      />
    </g>
  )
}

/**
 * Rendimento de farinha por moinho. A barra é o rendimento total; um traço
 * dentro dela marca a extração de farinha refinada (patente).
 *
 * POR QUE UM TRAÇO E NÃO UMA PILHA: sobre eixo truncado, empilhar extração e
 * resto distorce a leitura — o bloco de patente viraria ~55% da barra onde a
 * realidade é ~95% do rendimento, porque as duas fatias são medidas a partir
 * da base cortada e não do zero. Um marcador não sugere proporção nenhuma,
 * então não mente; as duas parcelas exatas estão no tooltip e na tabela.
 *
 * EIXO TRUNCADO de propósito: a diferença entre moinhos é de poucos pontos
 * percentuais e um eixo em zero achataria tudo numa fileira de barras iguais.
 * O corte é declarado no aria-label e na nota sob o gráfico — sem isso o
 * gráfico exagera a variação e engana.
 *
 * A barra é plotada em ALTURA relativa à base do eixo (`alturaPlot` =
 * rendimento − base), não no valor absoluto: o corte fica explícito no código,
 * sem depender do recorte interno de domínio do Recharts — que, aliás, voltaria
 * a incluir o zero se as barras fossem empilhadas. O eixo Y devolve o valor
 * absoluto pelo `tickFormatter`; tooltip e rótulos mostram os percentuais reais.
 *
 * ACESSIBILIDADE: o wrapper é role="img" (como os demais gráficos do repo), o
 * que esconde o interior das tecnologias assistivas — por isso NÃO há barras
 * focáveis por teclado: um <rect tabIndex> dentro de role="img" fica sem nome
 * acessível em boa parte dos leitores. O clique aqui é atalho redundante; o
 * caminho acessível (teclado + leitor de tela) para escolher moinho é a tabela
 * de eficiência da tela, que deve continuar existindo e sendo navegável.
 */
export function RendimentoMoinhosChart({
  dados,
  ariaLabel,
  onSelecionar,
  referenciaPct,
}: RendimentoMoinhosChartProps) {
  if (dados.length === 0) {
    return <p className="text-13 text-ink-subtle">Sem moinhos para comparar.</p>
  }

  // Domínio apertado: começa abaixo da menor extração e termina acima do maior
  // rendimento (a referência entra na conta para nunca ficar fora do quadro).
  const referencias = referenciaPct != null ? [referenciaPct] : []
  const minimo = Math.min(...dados.map((d) => d.extracaoPct), ...referencias)
  const maximo = Math.max(...dados.map((d) => d.rendimentoPct), ...referencias)
  const base = Math.floor(minimo - 1.5)
  const topo = Math.ceil(maximo + 1)

  const barras: BarraRendimento[] = dados.map((d) => ({
    ...d,
    restantePct: arred1(Math.max(0, d.rendimentoPct - d.extracaoPct)),
    alturaPlot: arred1(Math.max(0, d.rendimentoPct - base)),
  }))

  const altura = Math.max(topo - base, ...barras.map((b) => b.alturaPlot))
  const ticks = ticksDoEixo(base, altura)

  const clicavel = Boolean(onSelecionar)
  const aoClicar = clicavel
    ? (_dado: unknown, indice: number) => {
        const barra = barras[indice]
        if (barra) onSelecionar?.(barra.moinhoId)
      }
    : undefined
  const cursor = clicavel ? 'pointer' : undefined

  const rotuloAcessivel =
    `${ariaLabel} Eixo vertical truncado entre ${formatPct(base)} e ${formatPct(base + altura)} — não começa ` +
    `em zero, para revelar diferenças de poucos pontos percentuais.` +
    (referenciaPct != null ? ` Linha de referência em ${pct1(referenciaPct)}.` : '')

  return (
    <div role="img" aria-label={rotuloAcessivel}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={barras} margin={{ top: 24, right: 8, bottom: 0, left: 0 }} barSize={38}>
          <CartesianGrid stroke={colors.navy.border} strokeOpacity={0.35} vertical={false} />
          <XAxis
            dataKey="nome"
            interval={0}
            tickLine={false}
            axisLine={{ stroke: colors.navy.border }}
            tick={({ x, y, index }) => (
              <text
                x={x}
                y={y}
                dy={12}
                textAnchor="middle"
                fontSize={11}
                fill={barras[index]?.selecionado ? colors.gold.light : colors.text.subtle}
                fontWeight={barras[index]?.selecionado ? 600 : 400}
              >
                {rotuloEixo(barras[index]?.nome ?? '')}
              </text>
            )}
          />
          <YAxis
            width={52}
            domain={[0, altura]}
            ticks={ticks}
            tick={{ fill: colors.text.subtle, fontSize: 11 }}
            tickFormatter={(v: number) => formatPct(v + base)}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<ConteudoTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar
            dataKey="alturaPlot"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
            onClick={aoClicar}
            cursor={cursor}
            shape={(props: unknown) => (
              <FormaBarra {...(props as Parameters<typeof FormaBarra>[0])} base={base} />
            )}
          >
            {barras.map((barra) => (
              <Cell
                key={barra.moinhoId}
                fill={colors.gold.primary}
                fillOpacity={barra.selecionado ? 0.95 : 0.4}
              />
            ))}
            <LabelList
              dataKey="rendimentoPct"
              position="top"
              formatter={(valor: unknown) => pct1(Number(valor))}
              style={{ fill: colors.text.muted, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}
            />
          </Bar>
          {referenciaPct != null && (
            <ReferenceLine
              y={arred1(referenciaPct - base)}
              stroke={colors.semantic.info}
              strokeDasharray="4 4"
              label={{
                value: `referência ${pct1(referenciaPct)}`,
                position: 'insideTopRight',
                fill: colors.semantic.info,
                fontSize: 10,
              }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-subtle">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-gold" aria-hidden="true" />
          Rendimento total
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-gold-light" aria-hidden="true" />
          Traço = extração refinada (patente)
        </span>
        {referenciaPct != null && (
          <span className="flex items-center gap-1.5">
            <span
              className="h-0.5 w-4 rounded bg-info"
              style={{ maskImage: 'linear-gradient(90deg, #000 55%, transparent 55%)' }}
              aria-hidden="true"
            />
            Referência {pct1(referenciaPct)}
          </span>
        )}
      </div>
      <p className="tnums mt-1.5 text-[11px] text-ink-faint">
        Eixo truncado ({formatPct(base)}–{formatPct(base + altura)}): a diferença entre moinhos é de poucos
        pontos percentuais.
        {clicavel && ' Clique numa barra para selecionar o moinho.'}
      </p>
    </div>
  )
}
