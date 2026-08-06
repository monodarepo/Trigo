import { useState } from 'react'
import { Link } from 'react-router-dom'
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
import { Beaker, ChevronRight, Factory, Ship, Store, Wheat } from 'lucide-react'
import {
  Badge,
  Card,
  DataTable,
  KpiTile,
  Pill,
  SectionTitle,
  type DataTableColumn,
} from '../components/ui'
import { SourceBadge } from '../components/trust/SourceBadge'
import { WhyPopover } from '../components/trust/WhyPopover'
import { AnimatedNumber } from '../components/live/AnimatedNumber'
import { colors } from '../theme/tokens'
import {
  CUSTO_PADRAO_POC,
  FABRICAS_POC,
  FARINHAS_POC,
  FOLGA_POC_T,
  HAIRCUT_POC,
  LINHAS_POC,
  MOINHO_POC,
  ORIGENS_POC,
  PRECOS_HOJE_POC,
  PROPORCAO_POC,
  REGIOES_POC,
  RESUMO_POC,
  ROTULO_DECISAO_POC,
  TRIMESTRES_POC,
  formatBRL,
  formatPct,
  formatTon,
  getFarinha,
  getMoinho,
  getOrigem,
  type FarinhaId,
  type LinhaPoc,
} from '../data'

const moinho = getMoinho(MOINHO_POC)!
const r = RESUMO_POC

const rs0 = (v: number) => formatBRL(v)
const rs1 = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`
const compact = (v: number) => formatBRL(v, { compacto: true })
const specNome = (id: FarinhaId) => getFarinha(id)?.nome.replace('Farinha para ', '') ?? id

const REGIAO_ROTULO: Record<string, string> = {
  nordeste: 'Nordeste',
  norte: 'Norte',
  sudeste: 'Sudeste',
  sul: 'Sul',
  'centro-oeste': 'Centro-Oeste',
  exportacao: 'Exportação',
}

const btnPrimary =
  'rounded-full bg-gold px-4 py-2 text-xs font-semibold text-navy transition-colors hover:bg-gold-light'
const btnGhost =
  'rounded-full border border-edge px-4 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-gold/40 hover:text-ink'

// ---------------------------------------------------------------------------
// Gráfico: custo real × custo-padrão
// ---------------------------------------------------------------------------

function TooltipCusto({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ dataKey?: string; value?: number; payload?: { erro: number; cambio: number } }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const ponto = payload[0]?.payload
  const valor = (k: string) => payload.find((p) => p.dataKey === k)?.value
  return (
    <div className="rounded-card border border-edge bg-card-2 px-3 py-2 text-xs shadow-card">
      <p className="font-semibold text-ink">{label}</p>
      <p className="tnums mt-1 font-mono text-gold-light">Custo real: {rs1(valor('real') ?? 0)}/t</p>
      <p className="tnums mt-0.5 font-mono text-ink-subtle">
        Custo-padrão: {rs0(valor('padrao') ?? 0)}/t
      </p>
      {ponto && (
        <>
          <p
            className={`tnums mt-0.5 font-mono ${ponto.erro > 0 ? 'text-danger' : 'text-positive'}`}
          >
            Erro: {ponto.erro > 0 ? '+' : ''}
            {rs1(ponto.erro)}/t
          </p>
          <p className="tnums mt-0.5 font-mono text-ink-faint">
            Câmbio R$ {ponto.cambio.toFixed(2).replace('.', ',')}
          </p>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tabela da reconstrução
// ---------------------------------------------------------------------------

const colunas: DataTableColumn<LinhaPoc>[] = [
  {
    key: 'mes',
    header: 'Mês',
    sortValue: (l) => l.mes,
    render: (l) => (
      <div>
        <p className="font-mono text-xs font-medium text-ink">{l.rotulo}</p>
        <p className="tnums text-[11px] text-ink-subtle">
          câmbio R$ {l.cambio.toFixed(2).replace('.', ',')}
        </p>
      </div>
    ),
  },
  {
    key: 'tlc',
    header: 'TLC do trigo',
    align: 'right',
    sortValue: (l) => l.tlcTrigoRsT,
    render: (l) => <span className="font-mono text-xs text-ink-muted">{rs1(l.tlcTrigoRsT)}</span>,
  },
  {
    key: 'real',
    header: 'Custo real da farinha',
    align: 'right',
    sortValue: (l) => l.custoRealRsT,
    render: (l) => <span className="font-mono text-sm font-semibold text-ink">{rs1(l.custoRealRsT)}</span>,
  },
  {
    key: 'erro',
    header: 'Erro do padrão',
    align: 'right',
    sortValue: (l) => l.erroPadraoRsT,
    render: (l) => (
      <span
        className={`font-mono text-xs font-semibold ${
          l.erroPadraoRsT > 0 ? 'text-danger' : l.erroPadraoRsT < 0 ? 'text-positive' : 'text-ink-faint'
        }`}
      >
        {l.erroPadraoRsT > 0 ? '+' : ''}
        {rs1(l.erroPadraoRsT)}
      </span>
    ),
  },
  {
    key: 'comprar',
    header: 'Comprar custaria',
    align: 'right',
    sortValue: (l) => l.compraExternaRsT,
    render: (l) => <span className="font-mono text-xs text-ink-muted">{rs0(l.compraExternaRsT)}</span>,
  },
  {
    key: 'ganho',
    header: 'Ganho de produzir',
    align: 'right',
    sortValue: (l) => l.ganhoProduzirRsT,
    render: (l) => (
      <span
        className={`font-mono text-xs font-semibold ${l.ganhoProduzirRsT > 0 ? 'text-positive' : 'text-danger'}`}
      >
        {rs1(l.ganhoProduzirRsT)}
      </span>
    ),
  },
  {
    key: 'margem',
    header: 'Margem de vender',
    align: 'right',
    sortValue: (l) => l.margemVenderRsT,
    render: (l) => (
      <span
        className={`font-mono text-xs font-semibold ${l.margemVenderRsT > 0 ? 'text-positive' : 'text-danger'}`}
      >
        {rs1(l.margemVenderRsT)}
      </span>
    ),
  },
  {
    key: 'otima',
    header: 'Decisão ótima',
    render: (l) => (
      <div>
        <Badge
          kind="status"
          label={ROTULO_DECISAO_POC[l.decisaoOtima]}
          tone={l.decisaoOtima === l.decisaoTomada ? 'neutral' : 'gold'}
        />
        {l.decisaoOtima !== l.decisaoTomada && (
          <p className="mt-1 text-[11px] text-ink-subtle">
            feito: {ROTULO_DECISAO_POC[l.decisaoTomada].toLowerCase()}
          </p>
        )}
      </div>
    ),
  },
  {
    key: 'mesa',
    header: 'Deixado na mesa',
    align: 'right',
    sortValue: (l) => l.deixadoNaMesaRs,
    render: (l) => (
      <span className={`font-mono text-sm font-semibold ${l.deixadoNaMesaRs > 0 ? 'text-gold-light' : 'text-ink-faint'}`}>
        {l.deixadoNaMesaRs > 0 ? compact(l.deixadoNaMesaRs) : '—'}
      </span>
    ),
  },
]

export default function Poc() {
  const [spec, setSpec] = useState<FarinhaId>(FARINHAS_POC[0])
  const linhas = LINHAS_POC.filter((l) => l.farinhaId === spec)

  const dadosGrafico = linhas.map((l) => ({
    mes: l.rotulo,
    real: l.custoRealRsT,
    padrao: l.custoPadraoRsT,
    erro: l.erroPadraoRsT,
    cambio: l.cambio,
  }))
  const minEixo = Math.floor((Math.min(...linhas.map((l) => l.custoRealRsT)) - 40) / 25) * 25
  const maxEixo = Math.ceil((Math.max(...linhas.map((l) => l.custoRealRsT)) + 40) / 25) * 25

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Modo POC"
        title="Piloto de 90 dias — a reconstrução"
        subtitle="Com os dados que a empresa já tinha: qual era o custo real da farinha, o que teria custado comprar, qual decisão teria maximizado o resultado."
        actions={
          <span className="flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5">
            <Beaker size={14} className="text-gold" aria-hidden="true" />
            <span className="text-xs font-semibold text-ink">Escopo reduzido · dados históricos</span>
          </span>
        }
      />

      {/* 1 · Escopo do piloto */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Escopo</p>
            <h3 className="mt-1 font-display text-base font-semibold text-ink">
              Um moinho, duas farinhas, duas fábricas — e nada além disso
            </h3>
          </div>
          <Pill tone="info">{r.mesesReconstruidos} meses fechados</Pill>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-card border border-gold/40 bg-gold/10 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
              <Factory size={12} aria-hidden="true" /> Moinho-piloto
            </p>
            <p className="mt-1 text-sm font-semibold text-gold-light">{moinho.nome}</p>
            <p className="tnums text-[11px] text-ink-subtle">
              {PROPORCAO_POC.moinhos} · {formatTon(moinho.capacidadeMensalT)}/mês
            </p>
          </div>
          <div className="rounded-card border border-edge/60 bg-navy/30 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
              <Wheat size={12} aria-hidden="true" /> Farinhas
            </p>
            <p className="mt-1 text-sm font-medium capitalize text-ink">
              {FARINHAS_POC.map(specNome).join(' · ')}
            </p>
            <p className="text-[11px] text-ink-subtle">{PROPORCAO_POC.farinhas}</p>
          </div>
          <div className="rounded-card border border-edge/60 bg-navy/30 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
              <Store size={12} aria-hidden="true" /> Regiões
            </p>
            <p className="mt-1 text-sm font-medium text-ink">
              {REGIOES_POC.map((x) => REGIAO_ROTULO[x]).join(' · ')}
            </p>
            <p className="text-[11px] text-ink-subtle">{PROPORCAO_POC.regioes}</p>
          </div>
          <div className="rounded-card border border-edge/60 bg-navy/30 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
              <Ship size={12} aria-hidden="true" /> Origens
            </p>
            <p className="mt-1 text-sm font-medium text-ink">
              {ORIGENS_POC.map((o) => getOrigem(o)?.nome ?? o).join(' · ')}
            </p>
            <p className="text-[11px] text-ink-subtle">{PROPORCAO_POC.origens}</p>
          </div>
          <div className="rounded-card border border-edge/60 bg-navy/30 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
              <Factory size={12} aria-hidden="true" /> Fábricas
            </p>
            <ul className="mt-1 space-y-0.5">
              {FABRICAS_POC.map((f) => (
                <li key={f.id} className="tnums text-[11px] text-ink-muted">
                  {f.cidade} · {formatTon(f.consumoT)}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-3 border-t border-edge/60 pt-3 text-[11px] leading-relaxed text-ink-subtle">
          O recorte é deliberado. Um piloto que cobre o parque inteiro leva um ano para provar qualquer coisa; este
          cobre {PROPORCAO_POC.moinhos} moinhos e prova em 90 dias — porque o que precisa ser provado não é a
          tecnologia, e sim que existe valor onde ninguém estava olhando.
        </p>
      </Card>

      {/* 2 · A DESCOBERTA — custo real × custo-padrão (elemento dominante) */}
      <Card variant="gold">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow">A descoberta do piloto</p>
            <h3 className="mt-1 font-display text-20 font-semibold leading-snug text-ink">
              O custo real da farinha oscilou{' '}
              <span className="text-gold-light">{rs1(r.amplitudeCustoRsT)}/t</span> em{' '}
              {r.mesesReconstruidos} meses — o custo-padrão dizia um número só
            </h3>
            <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-ink-muted">
              De {rs1(r.custoMinRsT)}/t em março a {rs1(r.custoMaxRsT)}/t em maio, movido por câmbio e prêmio de
              origem. O sistema reportava {rs0(CUSTO_PADRAO_POC[spec])}/t todo mês — errado em{' '}
              <span className="font-semibold text-ink">todos eles</span>, com desvio máximo de{' '}
              {rs1(r.maiorErroPadraoRsT)}/t. É por isso que a decisão de vender ou comprar farinha era tomada no
              escuro.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <div role="group" aria-label="Farinha" className="flex rounded-full border border-edge bg-card-2 p-0.5">
              {FARINHAS_POC.map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={f === spec}
                  onClick={() => setSpec(f)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors ${
                    f === spec ? 'bg-gold text-navy' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {specNome(f)}
                </button>
              ))}
            </div>
            <WhyPopover
              titulo="Como o custo real foi reconstruído"
              explicacao={
                'Cada mês é recalculado no MESMO motor das telas de Moinhos e Make/Buy/Sell, trocando só o câmbio e o ' +
                'fator de FOB daquele mês. A ponta da série cai exatamente no custo canônico de hoje — se não caísse, ' +
                'o piloto estaria contando uma história diferente da do cenário corrente.'
              }
              linhas={[
                { rotulo: 'TLC do trigo no mês', valor: 'US$ 274/t × fator FOB × câmbio + parcela em R$' },
                { rotulo: '÷ rendimento da spec', valor: formatPct(76) },
                { rotulo: '+ conversão, energia, perdas e depreciação', valor: 'constantes do moinho' },
                { rotulo: '− crédito do farelo', valor: 'proporcional ao rendimento' },
                {
                  rotulo: 'Ponta da série (ago/25)',
                  valor: `${rs0(PRECOS_HOJE_POC[0].custoRsT)}/t — o custo canônico`,
                  destaque: true,
                },
              ]}
              familia="preco"
            />
          </div>
        </div>

        <div
          className="mt-4"
          role="img"
          aria-label={`Custo real da farinha mês a mês contra o custo-padrão fixo de ${rs0(CUSTO_PADRAO_POC[spec])} por tonelada`}
        >
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={dadosGrafico} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="pocArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.gold.primary} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={colors.gold.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={colors.navy.border} strokeOpacity={0.35} vertical={false} />
              <XAxis
                dataKey="mes"
                tick={{ fill: colors.text.subtle, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: colors.navy.border }}
              />
              <YAxis
                width={62}
                domain={[minEixo, maxEixo]}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(2).replace('.', ',')}k`}
                tick={{ fill: colors.text.subtle, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<TooltipCusto />} cursor={{ stroke: colors.navy.border, strokeDasharray: '3 3' }} />
              {/* O custo-padrão é uma RETA: é essa a natureza do erro. */}
              <ReferenceLine
                y={CUSTO_PADRAO_POC[spec]}
                stroke={colors.text.faint}
                strokeDasharray="5 4"
                strokeWidth={1.5}
              />
              <Area
                dataKey="real"
                stroke={colors.gold.primary}
                strokeWidth={2.5}
                fill="url(#pocArea)"
                isAnimationActive={false}
                dot={{ r: 3, fill: colors.gold.primary, stroke: 'none' }}
              />
              <Line dataKey="padrao" stroke="transparent" dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-subtle">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-gold" aria-hidden="true" />
            Custo real por mês
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-ink-faint" aria-hidden="true" />
            Custo-padrão ({rs0(CUSTO_PADRAO_POC[spec])}/t, fixo)
          </span>
          <span className="text-ink-faint">Eixo truncado para mostrar a variação</span>
        </p>
      </Card>

      {/* 3 · A reconstrução, mês a mês */}
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-base font-semibold text-ink">
              Mês a mês: o que se fez e o que teria sido melhor
            </h3>
            <p className="mt-0.5 text-xs text-ink-subtle">
              {specNome(spec)} · {moinho.nome} · colunas ordenáveis
            </p>
          </div>
          <SourceBadge familia="preco" />
        </div>
        <DataTable
          caption="Reconstrução histórica do piloto: custo real, custo de comprar, margem de vender e a decisão que teria maximizado o resultado"
          columns={colunas}
          rows={linhas}
          rowKey={(l) => `${l.mes}-${l.farinhaId}`}
          minWidth={1080}
          rowClassName={(l) =>
            l.deixadoNaMesaRs > 0 ? '[&>td]:bg-gold/5' : ''
          }
        />
      </div>

      {/* 4 · De onde viria o valor */}
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <Card>
          <p className="eyebrow">Decisão da demanda</p>
          <p className="tnums mt-2 font-display text-28 font-semibold text-ink">
            {r.porAlavancaRs.demanda === 0 ? 'Confirmada' : compact(r.porAlavancaRs.demanda)}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
            Nos {r.mesesReconstruidos} meses, produzir venceu comprar em todos. O hub não teria mudado a decisão — mas
            teria dado o número que sustenta dizer não ao fornecedor de farinha.
          </p>
          <p className="mt-2 rounded-card border border-edge/60 bg-navy/40 px-3 py-2 text-[11px] leading-snug text-ink-subtle">
            Isso é resultado do recorte: {moinho.nome} é moinho de porto, com frete interno de R$ 9/t. Num moinho do
            interior a resposta se inverte — é o que a tela de Make/Buy/Sell mostra em Bento Gonçalves.
          </p>
        </Card>

        <Card variant="gold">
          <p className="eyebrow">Folga parada</p>
          <p className="tnums mt-2 font-display text-28 font-semibold text-gold-light">
            {compact(r.porAlavancaRs.folga)}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
            {formatTon(FOLGA_POC_T)} de capacidade ociosa por mês, com margem positiva em{' '}
            {r.mesesComFolgaParada} dos {r.mesesReconstruidos} meses — e nenhuma tonelada vendida. É aqui que está a
            maior parte do valor do piloto.
          </p>
          <p className="mt-2 rounded-card border border-gold/30 bg-navy/40 px-3 py-2 text-[11px] leading-snug text-ink-subtle">
            Não se vendeu porque não se sabia o custo marginal. Sem ele, qualquer preço parece arriscado.
          </p>
        </Card>

        <Card>
          <p className="eyebrow">Timing da compra</p>
          <p className="tnums mt-2 font-display text-28 font-semibold text-ink">
            {compact(r.porAlavancaRs.timing)}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
            Aplicando a regra do produto — antecipar 18% do trimestre no melhor mês da janela de decisão — em vez de
            comprar de forma uniforme.
          </p>
          <ul className="mt-2 space-y-1.5">
            {TRIMESTRES_POC.map((t) => (
              <li key={t.rotulo} className="rounded-card border border-edge/60 bg-navy/40 px-3 py-2">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-ink-muted">{t.rotulo}</span>
                  <span className="tnums font-mono font-semibold text-positive">{compact(t.economiaRs)}</span>
                </div>
                <p className="tnums mt-0.5 text-[11px] text-ink-faint">
                  {rs1(t.tlcUniformeRsT)} uniforme → {rs1(t.tlcAntecipadoRsT)} em {t.mesEscolhido} ·{' '}
                  {formatTon(t.volumeAntecipadoT)}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* 5 · Consolidado do piloto → VRO */}
      <Card variant="gold">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">O que o piloto prova</p>
            <h3 className="mt-1 font-display text-base font-semibold text-ink">
              Do teto ex-post à captura realista
            </h3>
          </div>
          <Link to="/vro" className={btnGhost}>
            Ver a metodologia no VRO
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiTile
            label="Teto ex-post"
            value={<AnimatedNumber valor={r.tetoExPostRs} formatar={compact} />}
            hint={`em ${r.mesesReconstruidos} meses, com visão perfeita`}
          />
          <KpiTile
            label={`Captura realista (−${formatPct(HAIRCUT_POC * 100)})`}
            value={<AnimatedNumber valor={r.capturaRealistaRs} formatar={compact} />}
            delta={{ label: 'mesmo haircut do VRO', direction: 'flat', tone: 'positive' }}
          />
          <KpiTile
            label="Run-rate do piloto"
            value={<AnimatedNumber valor={r.runRateAnualRs} formatar={compact} />}
            hint="por ano, só neste moinho"
          />
          <KpiTile
            label="Ordem de grandeza no parque"
            value={<AnimatedNumber valor={r.extrapolacaoParqueRs} formatar={compact} />}
            hint="× 7 moinhos — estimativa, não promessa"
          />
        </div>

        <div className="mt-4 rounded-card border border-gold/30 bg-navy/40 px-4 py-3">
          <p className="text-xs font-semibold text-ink">Por que duas colunas e não uma</p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
            O teto ex-post supõe escolher em março o melhor mês de junho — visão perfeita, que não existe. A captura
            realista aplica o mesmo haircut de {formatPct(HAIRCUT_POC * 100)} que o VRO usa para atribuir valor a
            decisões reais. Levar o teto para o business case é o erro que mata um piloto no segundo mês, quando o
            resultado medido chega abaixo do prometido.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-edge/60 pt-4">
          <Link to="/make-buy-sell" className={btnPrimary}>
            Simular a decisão de hoje
          </Link>
          <Link to="/moinhos" className={btnGhost}>
            Ver o custo por moinho
          </Link>
          <Link to="/oportunidades" className={btnGhost}>
            Onde vender a folga
          </Link>
        </div>
      </Card>

      {/* 6 · Ponte para o cenário corrente */}
      <Card padding="sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-muted">
            <span className="font-semibold text-ink">Hoje, no fim da série:</span>{' '}
            {/* Só o nome da farinha ganha capitalize — aplicá-lo ao span inteiro
                deixava a frase em Title Case ("Massas Custa R$ 2.100/T E O..."). */}
            {PRECOS_HOJE_POC.map((p) => (
              <span key={p.farinhaId} className="tnums">
                <span className="capitalize">{specNome(p.farinhaId)}</span> custa {rs0(p.custoRsT)}/t e o mercado
                paga {rs0(p.precoRsT)}/t.{' '}
              </span>
            ))}
            É o mesmo par de números que a Visão Executiva mostra — o piloto e o cenário corrente são a mesma verdade.
          </p>
          <Link
            to="/"
            className="flex shrink-0 items-center gap-1 text-xs font-semibold text-gold transition-colors hover:text-gold-light"
          >
            Visão Executiva <ChevronRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </Card>
    </div>
  )
}
