import { Link } from 'react-router-dom'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChevronRight } from 'lucide-react'
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
import { abrirObjeto } from '../components/object/objectBus'
import { colors } from '../theme/tokens'
import {
  ELOS_VERTICALIZACAO,
  KPIS_FARINHA,
  QUEDA_QUE_ZERA_PCT,
  RESUMO_VERTICALIZACAO,
  SENSIBILIDADE_VERTICALIZACAO,
  formatBRL,
  formatPct,
  formatTon,
  type EloVerticalizacao,
} from '../data'
import { AlertBanner } from '../alerts/AlertBanner'

const v = RESUMO_VERTICALIZACAO

const rs0 = (n: number) => formatBRL(n)
const rs1 = (n: number) =>
  `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`
const compact = (n: number) => formatBRL(n, { compacto: true })

const btnGhost =
  'rounded-full border border-edge px-4 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-gold/40 hover:text-ink'

/** Escala das barras de ganho — o maior ganho unitário define 100%. */
const maiorGanho = Math.max(...ELOS_VERTICALIZACAO.map((e) => Math.abs(e.ganhoRsT)))

const colunas: DataTableColumn<EloVerticalizacao>[] = [
  {
    key: 'par',
    header: 'Moinho × farinha',
    sortValue: (e) => `${e.moinhoNome}${e.farinhaNome}`,
    render: (e) => (
      <div>
        <button
          type="button"
          onClick={() => abrirObjeto('moinho', e.moinhoId)}
          className="text-left font-medium text-ink underline-offset-2 hover:text-gold-light hover:underline"
        >
          {e.moinhoNome}
        </button>
        <p className="text-[11px] capitalize text-ink-subtle">{e.farinhaNome}</p>
      </div>
    ),
  },
  {
    key: 'custo',
    header: 'Custo interno',
    align: 'right',
    sortValue: (e) => e.custoInternoRsT,
    render: (e) => <span className="font-mono text-xs text-ink-muted">{rs1(e.custoInternoRsT)}</span>,
  },
  {
    key: 'externo',
    header: 'Comprar custaria',
    align: 'right',
    sortValue: (e) => e.precoExternoRsT,
    render: (e) => <span className="font-mono text-xs text-ink-muted">{rs0(e.precoExternoRsT)}</span>,
  },
  {
    key: 'ganho',
    header: 'Ganho por tonelada',
    align: 'right',
    sortValue: (e) => e.ganhoRsT,
    render: (e) => {
      const largura = Math.max(2, Math.round((Math.abs(e.ganhoRsT) / maiorGanho) * 100))
      const positivo = e.ganhoRsT > 0
      return (
        <div className="min-w-[124px]">
          <span className={`font-mono text-sm font-semibold ${positivo ? 'text-positive' : 'text-danger'}`}>
            {rs1(e.ganhoRsT)}
          </span>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-edge/40">
            <div
              className={`h-full rounded-full ${positivo ? 'bg-positive/80' : 'bg-danger/80'}`}
              style={{ width: `${largura}%` }}
            />
          </div>
        </div>
      )
    },
  },
  {
    key: 'volume',
    header: 'Volume',
    align: 'right',
    sortValue: (e) => e.volumeT,
    render: (e) => <span className="font-mono text-xs text-ink-muted">{formatTon(e.volumeT)}</span>,
  },
  {
    key: 'total',
    header: 'Ganho no mês',
    align: 'right',
    sortValue: (e) => e.ganhoTotalRs,
    render: (e) => (
      <span className={`font-mono text-sm font-semibold ${e.ganhoTotalRs > 0 ? 'text-ink' : 'text-danger'}`}>
        {compact(e.ganhoTotalRs)}
      </span>
    ),
  },
  {
    key: 'folga',
    header: 'Folga até virar',
    align: 'right',
    sortValue: (e) => e.folgaAteIndiferencaPct,
    /**
     * Sem sinal: "−10,5% de queda aguenta" é dupla negação e lê-se ao contrário
     * do que é. Positivo = quanto o mercado pode cair; negativo = quanto teria
     * de subir para a verticalização voltar a valer.
     */
    render: (e) => (
      <div>
        <span
          className={`font-mono text-xs font-semibold ${
            e.folgaAteIndiferencaPct <= 0
              ? 'text-danger'
              : e.folgaAteIndiferencaPct < 3
                ? 'text-warning'
                : 'text-ink-muted'
          }`}
        >
          {formatPct(Math.abs(e.folgaAteIndiferencaPct), 1)}
        </span>
        <p className="text-[10px] text-ink-faint">
          {e.folgaAteIndiferencaPct > 0 ? 'de queda aguenta' : 'teria de subir'}
        </p>
      </div>
    ),
  },
]

function TooltipSensibilidade({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value?: number; payload?: { paresAindaPositivos: number } }>
  label?: number
}) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="rounded-card border border-edge bg-card-2 px-3 py-2 text-xs shadow-card">
      <p className="font-semibold text-ink">Mercado −{label}%</p>
      <p className="tnums mt-1 font-mono text-gold-light">Ganho: {compact(p.value ?? 0)}/mês</p>
      <p className="tnums mt-0.5 font-mono text-ink-subtle">
        {p.payload?.paresAindaPositivos} de {ELOS_VERTICALIZACAO.length} pares ainda valem a pena
      </p>
    </div>
  )
}

export default function Verticalization() {
  const dados = SENSIBILIDADE_VERTICALIZACAO.map((p) => ({
    queda: p.quedaPct,
    ganho: p.ganhoTotalRs,
    paresAindaPositivos: p.paresAindaPositivos,
  }))

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Moinhos & Farinha"
        title="Rentabilidade da Verticalização"
        subtitle="Quanto vale abastecer a própria fábrica em vez de comprar farinha pronta — por moinho, por especificação, e até onde isso aguenta."
        actions={<SourceBadge familia="preco" />}
      />

      <AlertBanner rota="/verticalizacao" />

      {/* 1 · O número da tese, e o que ele esconde */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <KpiTile
          label="Ganho por tonelada (par-âncora)"
          value={rs0(KPIS_FARINHA.ganhoVerticalizacaoRsT)}
          unit="/t"
          hint="Fortaleza × massas — o número da Visão Executiva"
        />
        <KpiTile
          label="Ganho médio do parque"
          value={rs1(v.ganhoMedioRsT)}
          unit="/t"
          delta={{
            label: `ponderado por ${formatTon(v.volumeTotalT)}`,
            direction: 'flat',
            tone: 'info',
          }}
        />
        <KpiTile
          label="Ganho consolidado"
          value={<AnimatedNumber valor={v.ganhoTotalRs} formatar={compact} />}
          hint="por mês, como está hoje"
        />
        <KpiTile
          label="Se parar onde não vale"
          value={<AnimatedNumber valor={v.ganhoSeAgirRs} formatar={compact} />}
          delta={{
            label: `+${compact(v.destruicaoEvitavelRs)} de destruição evitável`,
            direction: 'up',
            tone: 'positive',
          }}
        />
        <KpiTile
          label="Aguenta uma queda de"
          value={QUEDA_QUE_ZERA_PCT != null ? formatPct(QUEDA_QUE_ZERA_PCT) : '> 20%'}
          hint="no preço externo, antes de zerar o ganho"
        />
      </div>

      {/* 2 · A dispersão — o elemento dominante */}
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-semibold text-ink">
              Onde a farinha própria vence — e onde já não vence
            </h3>
            <p className="mt-0.5 text-xs text-ink-subtle">
              {ELOS_VERTICALIZACAO.length} pares moinho × farinha que abastecem as fábricas · colunas ordenáveis
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {v.paresNegativos > 0 && (
              <Badge
                kind="status"
                label={`${v.paresNegativos} par(es) destruindo margem`}
                tone="danger"
              />
            )}
            <WhyPopover
              titulo="Ganho da verticalização"
              explicacao={
                'Ganho = preço externo comparável − custo interno da MESMA spec. O preço externo é sempre a cotação ' +
                'industrial, granel e posto fábrica — a única base em que a comparação vale. O ponto de indiferença é o ' +
                'próprio custo interno: a verticalização vale exatamente enquanto o mercado estiver acima dele.'
              }
              linhas={[
                { rotulo: 'Preço externo (massas, Nordeste)', valor: `${rs0(KPIS_FARINHA.precoExternoEquivalenteRsT)}/t` },
                { rotulo: '− Custo interno (Fortaleza)', valor: `${rs0(KPIS_FARINHA.custoFarinhaRsT)}/t` },
                { rotulo: '= Ganho por tonelada', valor: `${rs0(KPIS_FARINHA.ganhoVerticalizacaoRsT)}/t`, destaque: true },
              ]}
              familia="preco"
            />
          </div>
        </div>
        <DataTable
          caption="Ganho da verticalização por moinho e especificação, com o volume destinado às fábricas e a folga até o ponto de indiferença"
          columns={colunas}
          rows={ELOS_VERTICALIZACAO}
          rowKey={(e) => `${e.moinhoId}-${e.farinhaId}`}
          minWidth={940}
          rowClassName={(e) => (e.ganhoRsT < 0 ? '[&>td]:bg-danger/5' : '')}
        />
      </div>

      {/* 3 · Sensibilidade + leitura */}
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-semibold text-ink">E se o mercado cair?</h3>
              <p className="mt-0.5 text-xs text-ink-subtle">
                Ganho consolidado supondo que se PARE de verticalizar onde deixa de valer
              </p>
            </div>
            <Pill tone="gold">
              Zera em {QUEDA_QUE_ZERA_PCT != null ? formatPct(QUEDA_QUE_ZERA_PCT) : '> 20%'}
            </Pill>
          </div>
          <div
            className="mt-4"
            role="img"
            aria-label="Curva do ganho consolidado da verticalização conforme o preço externo cai"
          >
            <ResponsiveContainer width="100%" height={230}>
              <ComposedChart data={dados} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="vertArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors.semantic.positive} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={colors.semantic.positive} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={colors.navy.border} strokeOpacity={0.35} vertical={false} />
                <XAxis
                  dataKey="queda"
                  tickFormatter={(x: number) => `−${x}%`}
                  tick={{ fill: colors.text.subtle, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: colors.navy.border }}
                />
                <YAxis
                  width={52}
                  tickFormatter={(x: number) => `${(x / 1e6).toFixed(0)}M`}
                  tick={{ fill: colors.text.subtle, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={<TooltipSensibilidade />}
                  cursor={{ stroke: colors.navy.border, strokeDasharray: '3 3' }}
                />
                <ReferenceLine y={0} stroke={colors.text.faint} strokeWidth={1} />
                <Area
                  dataKey="ganho"
                  stroke={colors.semantic.positive}
                  strokeWidth={2.5}
                  fill="url(#vertArea)"
                  isAnimationActive={false}
                  dot={{ r: 3, fill: colors.semantic.positive, stroke: 'none' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-subtle">
            A curva quebra, não desce reto: cada degrau é uma unidade saindo da conta ao cruzar o próprio custo. Os
            degraus mostram quais moinhos são a defesa da margem — Eusébio e Fortaleza seguram até o fim; Rolândia sai
            no primeiro tranco.
          </p>
        </Card>

        <Card variant="gold">
          <p className="eyebrow">A leitura</p>
          <h3 className="mt-1 font-display text-base font-semibold text-ink">
            A média esconde os extremos
          </h3>
          <dl className="mt-4 space-y-3 text-xs">
            <div className="rounded-card border border-edge/60 bg-navy/40 px-3 py-2.5">
              <dt className="text-[11px] uppercase tracking-wide text-ink-subtle">Maior ganho</dt>
              <dd className="mt-0.5">
                <span className="tnums font-mono text-sm font-semibold text-positive">
                  {rs1(v.melhor?.ganhoRsT ?? 0)}/t
                </span>{' '}
                <span className="capitalize text-ink-muted">
                  {v.melhor?.moinhoNome} × {v.melhor?.farinhaNome}
                </span>
                <p className="mt-1 text-[11px] leading-snug text-ink-subtle">
                  Farinha de baixa cinza tem poucos fornecedores: o prêmio de mercado é alto e o nosso custo, baixo.
                </p>
              </dd>
            </div>
            <div className="rounded-card border border-danger/30 bg-danger/10 px-3 py-2.5">
              <dt className="text-[11px] uppercase tracking-wide text-ink-subtle">Menor ganho</dt>
              <dd className="mt-0.5">
                <span className="tnums font-mono text-sm font-semibold text-danger">
                  {rs1(v.pior?.ganhoRsT ?? 0)}/t
                </span>{' '}
                <span className="capitalize text-ink-muted">
                  {v.pior?.moinhoNome} × {v.pior?.farinhaNome}
                </span>
                <p className="mt-1 text-[11px] leading-snug text-ink-subtle">
                  Perto da origem do trigo, o mercado bate a moagem própria. Verticalizar aqui destrói{' '}
                  {compact(Math.abs(v.pior?.ganhoTotalRs ?? 0))} por mês.
                </p>
              </dd>
            </div>
          </dl>
          <p className="mt-3 border-t border-edge/60 pt-3 text-[11px] leading-relaxed text-ink-subtle">
            O ganho médio de {rs1(v.ganhoMedioRsT)}/t não existe em lugar nenhum — é a média de{' '}
            {rs1(v.pior?.ganhoRsT ?? 0)} a {rs1(v.melhor?.ganhoRsT ?? 0)}. Decidir verticalização pela média é o que
            mantém uma unidade destruindo margem enquanto o consolidado parece saudável.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link to="/make-buy-sell" className={btnGhost}>
              Decidir no Make/Buy/Sell
            </Link>
            <Link
              to="/moinhos"
              className="flex items-center gap-1 text-xs font-semibold text-gold transition-colors hover:text-gold-light"
            >
              Ver o custo por moinho <ChevronRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
