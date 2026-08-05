import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Info } from 'lucide-react'
import {
  Badge,
  Card,
  ConfidenceMeter,
  DataTable,
  KpiTile,
  Pill,
  SectionTitle,
  Sparkline,
  type DataTableColumn,
  type Tone,
} from '../components/ui'
import { TlcWaterfall } from '../components/charts/TlcWaterfall'
import { AnimatedNumber } from '../components/live/AnimatedNumber'
import { abrirObjeto } from '../components/object/objectBus'
import { SourceBadge } from '../components/trust/SourceBadge'
import { useDecisao, type DecisaoDoDia } from '../components/approval/decisionStore'
import { colors } from '../theme/tokens'
import {
  snapshot,
  formatBRL,
  formatDataPt,
  formatPct,
  type ComponenteTLC,
  type RecomendacaoVRO,
  type StatusRegraDado,
} from '../data'

const { vro, governancaDados } = snapshot
const m = vro.metricas
const q = governancaDados.resumoQualidade

const COR_STATUS_REGRA: Record<StatusRegraDado, string> = {
  ok: 'bg-positive/80',
  aviso: 'bg-warning/80',
  falha: 'bg-danger/80',
}

const fmtDelta = (v: number) => `${v < 0 ? '−' : '+'}${formatBRL(Math.abs(v), { compacto: true })}`
const fmtPp = (v: number) =>
  `+${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} p.p.`

// --- Tabela Recomendação × Decisão × Resultado ---
const DECISAO_BADGE: Record<RecomendacaoVRO['decisaoHumana'], { rotulo: string; tone: Tone }> = {
  aprovada: { rotulo: 'Aprovada', tone: 'positive' },
  ajustada: { rotulo: 'Ajustada', tone: 'warning' },
  rejeitada: { rotulo: 'Rejeitada', tone: 'danger' },
  pendente: { rotulo: 'Em aprovação', tone: 'info' },
}

const ALAVANCA_ROTULO: Record<RecomendacaoVRO['alavanca'], string> = {
  'mercado-compra': 'Mercado/compra',
  'logistica-estoques': 'Logística',
  'qualidade-blend': 'Blend',
  integracao: 'Integração',
  hedge: 'Hedge',
}

const maiorValor = Math.max(...vro.recomendacoes.map((r) => Math.abs(r.valorCpvRs + r.valorHedgeRs)))

const colunas: DataTableColumn<RecomendacaoVRO>[] = [
  {
    key: 'data',
    header: 'Data',
    sortValue: (r) => r.data,
    render: (r) => <span className="tnums font-mono text-xs text-ink-subtle">{formatDataPt(r.data)}</span>,
  },
  {
    key: 'recomendacao',
    header: 'Recomendação da IA',
    sortValue: (r) => r.titulo,
    render: (r) => (
      <div className="max-w-[300px]">
        <button
          type="button"
          onClick={() => abrirObjeto('recomendacao', r.id)}
          className="text-left font-medium text-ink underline-offset-2 hover:text-gold-light hover:underline"
        >
          {r.titulo}
        </button>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Pill tone="neutral">{ALAVANCA_ROTULO[r.alavanca]}</Pill>
          <span className="tnums text-[11px] text-ink-faint">confiança {formatPct(r.confiancaPct)}</span>
        </div>
      </div>
    ),
  },
  {
    key: 'decisao',
    header: 'Decisão humana',
    sortValue: (r) => r.decisaoHumana,
    render: (r) => (
      <div>
        <Badge kind="status" label={DECISAO_BADGE[r.decisaoHumana].rotulo} tone={DECISAO_BADGE[r.decisaoHumana].tone} />
        {r.decisaoNota && <p className="mt-1 text-[11px] leading-snug text-ink-subtle">{r.decisaoNota}</p>}
      </div>
    ),
  },
  {
    key: 'resultado',
    header: 'Resultado',
    render: (r) => <span className="text-xs leading-snug text-ink-muted">{r.resultado}</span>,
  },
  {
    key: 'valor',
    header: 'Valor capturado',
    align: 'right',
    sortValue: (r) => r.valorCpvRs + r.valorHedgeRs,
    render: (r) => {
      const total = r.valorCpvRs + r.valorHedgeRs
      const largura = Math.round((Math.abs(total) / maiorValor) * 100)
      return (
        <div className="min-w-[120px]">
          <span
            className={`tnums font-mono text-sm font-semibold ${
              total < 0 ? 'text-danger' : total > 0 ? (r.status === 'projetado' ? 'text-azure' : 'text-positive') : 'text-ink-faint'
            }`}
          >
            {total === 0 ? '—' : fmtDelta(total)}
          </span>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-edge/40">
            <div
              className={`h-full rounded-full ${total < 0 ? 'bg-danger' : r.status === 'projetado' ? 'bg-azure' : 'bg-positive'}`}
              style={{ width: `${largura}%` }}
            />
          </div>
        </div>
      )
    },
  },
]

// --- Waterfall de valor por alavanca (em R$ M) ---
const ALAVANCA_CURTA: Record<string, string> = {
  'mercado-compra': 'Mercado/compra',
  'logistica-estoques': 'Logística',
  'qualidade-blend': 'Blend',
  integracao: 'Integração',
}
const componentesWaterfall: ComponenteTLC[] = vro.alavancas.map((a) => ({
  rotulo: a.rotulo,
  rotuloCurto: ALAVANCA_CURTA[a.alavanca],
  valorRs: Math.round((a.valorRs / 1e6) * 10) / 10,
  tipo: a.alavanca === 'integracao' ? 'imposto' : 'fob',
}))
const totalWaterfallM = Math.round((m.cpvCapturadoYtdRs / 1e6) * 10) / 10

// --- Curva acumulada ---
const dadosCurva = vro.curva.map((p) => ({
  mes: p.mes,
  acumulado: Math.round((p.acumuladoRs / 1e6) * 10) / 10,
  meta: Math.round((p.metaRs / 1e6) * 10) / 10,
  projetado: p.projetadoRs != null ? Math.round((p.projetadoRs / 1e6) * 10) / 10 : undefined,
}))

function TooltipCurva({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey?: string; value?: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  const valor = (k: string) => payload.find((p) => p.dataKey === k)?.value
  return (
    <div className="rounded-card border border-edge bg-card-2 px-3 py-2 text-xs shadow-card">
      <p className="font-semibold text-ink">{label}/2025</p>
      {valor('acumulado') != null && <p className="tnums mt-1 font-mono text-gold-light">Capturado: R$ {valor('acumulado')}M</p>}
      {valor('meta') != null && <p className="tnums mt-0.5 font-mono text-ink-subtle">Meta (piso do case): R$ {valor('meta')}M</p>}
      {valor('projetado') != null && <p className="tnums mt-0.5 font-mono text-azure">Com a recomendação do dia: R$ {valor('projetado')}M</p>}
    </div>
  )
}

/** A decisão do dia (modal de aprovação) atualiza a linha pendente do placar. */
function aplicarDecisao(r: RecomendacaoVRO, d: DecisaoDoDia): RecomendacaoVRO {
  const comentario = d.comentario ? ` — “${d.comentario}”` : ''
  if (d.modo === 'encaminhada') {
    return { ...r, decisaoNota: `Encaminhada para ${d.destino} às ${d.horaRotulo}${comentario}` }
  }
  return {
    ...r,
    decisaoHumana: d.modo,
    decisaoNota: `${d.modo === 'aprovada' ? 'Aprovada' : 'Ajustada'} às ${d.horaRotulo} (hoje)${comentario}`,
  }
}

export default function Vro() {
  const decisao = useDecisao()
  const linhas = decisao
    ? vro.recomendacoes.map((r) => (r.decisaoHumana === 'pendente' ? aplicarDecisao(r, decisao) : r))
    : vro.recomendacoes
  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Governança"
        title="VRO — Realização de Valor"
        subtitle="A prova do business case: cada recomendação com decisão humana e resultado medido."
        actions={<Badge kind="status" label={`Run-rate ${formatBRL(m.runRateAnualRs, { compacto: true })}/ano · case R$ 38–80M`} tone="gold" />}
      />

      {/* 1 · KPIs animados */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <KpiTile
          label="Valor capturado YTD (CPV)"
          value={<AnimatedNumber deZero valor={m.cpvCapturadoYtdRs} duracaoMs={900} formatar={(v) => formatBRL(v, { compacto: true })} />}
          hint="Δ vs baseline por decisão · haircut 15–20%"
          fonte={<SourceBadge familia="alertas" />}
        />
        <KpiTile
          label="Valor protegido (hedge)"
          value={<AnimatedNumber deZero valor={m.hedgeProtegidoYtdRs} duracaoMs={900} formatar={(v) => formatBRL(v, { compacto: true })} />}
          hint="Notional × (realizado − travado)"
          fonte={<SourceBadge familia="cambio" />}
        />
        <KpiTile
          label="Impacto EBITDA YTD"
          value={<AnimatedNumber deZero valor={m.ebitdaIncrementalYtdRs} duracaoMs={900} formatar={(v) => formatBRL(v, { compacto: true })} />}
          delta={{ label: fmtPp(m.ebitdaIncrementalPp), direction: 'up', tone: 'positive' }}
          hint="CPV + hedge, sem dupla contagem"
        />
        <KpiTile
          label="Acurácia do modelo"
          value={<AnimatedNumber deZero valor={m.acuraciaModeloPct} duracaoMs={900} formatar={(v) => formatPct(Math.round(v))} />}
          hint="Previsões dentro da banda P10–P90"
        />
        <KpiTile
          label="Hit-rate das recomendações"
          value={<AnimatedNumber deZero valor={m.hitRatePct} duracaoMs={900} formatar={(v) => formatPct(Math.round(v))} />}
          hint="Executadas com resultado positivo"
        />
      </div>

      {/* 2 · Recomendação × Decisão × Resultado */}
      <div className="min-w-0" data-spot="vro">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-base font-semibold text-ink">Recomendação × Decisão × Resultado</h3>
          <p className="flex items-center gap-1.5 text-xs text-ink-subtle">
            <Info size={12} aria-hidden="true" />
            Clique numa recomendação para abrir a ficha · colunas ordenáveis
          </p>
        </div>
        <DataTable
          caption="Trilha de recomendações: o que a IA sugeriu, o que o humano decidiu e o resultado medido"
          columns={colunas}
          rows={linhas}
          rowKey={(r) => r.id}
          minWidth={880}
          rowClassName={(r) => (r.status === 'projetado' ? 'bg-gold/5' : '')}
        />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="space-y-4">
        {/* 3 · Waterfall por alavanca */}
        <Card>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-semibold text-ink">De onde veio o valor (CPV)</h3>
              <p className="mt-0.5 text-xs text-ink-subtle">Por alavanca, YTD — hedge é KPI próprio (sem dupla contagem)</p>
            </div>
            <p className="tnums font-display text-2xl font-semibold text-gold-light">
              {formatBRL(m.cpvCapturadoYtdRs, { compacto: true })}
            </p>
          </div>
          <div className="mt-3">
            <TlcWaterfall
              componentes={componentesWaterfall}
              totalRs={totalWaterfallM}
              sufixo="M"
              rotuloTotal="CPV total YTD"
              legenda={[
                { cor: 'bg-gold/85', rotulo: 'Alavancas de decisão' },
                { cor: 'bg-info/85', rotulo: 'Integração (habilitador)' },
                { cor: 'bg-gold-light', rotulo: 'CPV total YTD' },
              ]}
              ariaLabel={`Waterfall do valor capturado no CPV por alavanca: total de ${formatBRL(m.cpvCapturadoYtdRs, { compacto: true })}`}
            />
          </div>
        </Card>

        {/* 6 · Data quality — a qualidade do dado é gerida, não presumida */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-semibold text-ink">Qualidade do dado</h3>
              <p className="mt-0.5 text-xs text-ink-subtle">
                Regras de validação em execução antes de qualquer número entrar no Hub.
              </p>
            </div>
            <Badge
              kind="status"
              label={`${q.avisosAbertos} avisos · ${q.falhasAbertas} falhas`}
              tone={q.falhasAbertas > 0 ? 'danger' : q.avisosAbertos > 0 ? 'warning' : 'positive'}
            />
          </div>
          <dl className="tnums mt-3 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-card border border-edge/60 bg-navy/40 px-2 py-2">
              <dt className="text-[11px] text-ink-subtle">Regras ativas</dt>
              <dd className="mt-0.5 font-display text-lg font-semibold text-ink">{q.regrasAtivas}</dd>
            </div>
            <div className="rounded-card border border-edge/60 bg-navy/40 px-2 py-2">
              <dt className="text-[11px] text-ink-subtle">Famílias de dado</dt>
              <dd className="mt-0.5 font-display text-lg font-semibold text-ink">{governancaDados.fontesLista.length}</dd>
            </div>
            <div className="rounded-card border border-edge/60 bg-navy/40 px-2 py-2">
              <dt className="text-[11px] text-ink-subtle">Fontes com dono</dt>
              <dd className="mt-0.5 font-display text-lg font-semibold text-positive">
                {formatPct(q.fontesComDonoPct)}
              </dd>
            </div>
          </dl>
          <ul className="mt-3 space-y-2.5 border-t border-edge/60 pt-3">
            {governancaDados.regras.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${COR_STATUS_REGRA[r.status]}`} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-ink">{r.regra}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-ink-subtle">{r.detalhe}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-11 text-ink-faint">{governancaDados.fontes[r.familia].fonteCurta}</p>
                  <p className="text-[11px] text-ink-faint">{r.responsavel}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-edge/60 pt-3 text-[11px] italic text-ink-subtle">
            A qualidade do dado é gerida, não presumida — toda fonte tem dono nomeado, método declarado e regra de
            validação. Avisos abertos aparecem aqui e nos Alertas.
          </p>
        </Card>
        </div>

        <div className="space-y-4">
          {/* 4 · Curva acumulada */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-display text-base font-semibold text-ink">Valor acumulado vs meta</h3>
              <span className="text-[11px] text-ink-subtle">meta = piso do case (R$ 38M/ano, linear)</span>
            </div>
            <div className="mt-3" role="img" aria-label="Curva de valor capturado acumulado versus meta do business case">
              <ResponsiveContainer width="100%" height={210}>
                <ComposedChart data={dadosCurva} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="vroArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colors.gold.primary} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={colors.gold.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={colors.navy.border} strokeOpacity={0.35} vertical={false} />
                  <XAxis dataKey="mes" tick={{ fill: colors.text.subtle, fontSize: 11 }} tickLine={false} axisLine={{ stroke: colors.navy.border }} />
                  <YAxis width={48} tickFormatter={(v: number) => `${v}M`} tick={{ fill: colors.text.subtle, fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<TooltipCurva />} cursor={{ stroke: colors.navy.border, strokeDasharray: '3 3' }} />
                  <Area dataKey="acumulado" stroke={colors.gold.primary} strokeWidth={2} fill="url(#vroArea)" isAnimationActive={false} />
                  <Line dataKey="meta" stroke={colors.text.faint} strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
                  <Line dataKey="projetado" stroke={colors.semantic.info} strokeWidth={0} dot={{ r: 4, fill: colors.semantic.info, stroke: 'none' }} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-subtle">
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-gold" aria-hidden="true" />Capturado (CPV + hedge)</span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-ink-faint" aria-hidden="true" />Meta</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-azure" aria-hidden="true" />+ recomendação do dia</span>
            </p>
          </Card>

          {/* 5 · Acurácia / drift */}
          <Card>
            <h3 className="font-display text-base font-semibold text-ink">Saúde do modelo</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <ConfidenceMeter value={m.acuraciaModeloPct} label="Acurácia (banda P10–P90)" />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-xs text-ink-subtle">Erro médio mensal</span>
                  <Sparkline data={m.erroSerie} tone="positive" width={90} height={22} />
                </div>
                <p className="tnums mt-1 text-[11px] text-ink-faint">
                  {formatPct(m.erroSerie[0], 1)} em mar → {formatPct(m.erroSerie[m.erroSerie.length - 1], 1)} em ago (caindo)
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-ink-subtle">Drift de dados</span>
                  <Badge kind="status" label={`${formatPct(m.driftPct, 1)} — dentro do limite (5%)`} tone="positive" />
                </div>
                <div className="rounded-card border border-edge/60 bg-surface-1/60 p-3">
                  <p className="eyebrow">Postura das decisões YTD</p>
                  <div className="mt-2 flex h-2 overflow-hidden rounded-full" role="img" aria-label="Distribuição das decisões por perfil">
                    <div className="h-full bg-ink-faint/60" style={{ width: `${m.posturaDecisoesPct.conservador}%` }} />
                    <div className="h-full bg-gold" style={{ width: `${m.posturaDecisoesPct.recomendado}%` }} />
                    <div className="h-full bg-azure" style={{ width: `${m.posturaDecisoesPct.oportunistico}%` }} />
                  </div>
                  <p className="tnums mt-1.5 text-[11px] text-ink-subtle">
                    conservador {formatPct(m.posturaDecisoesPct.conservador)} ·{' '}
                    <span className="text-gold-light">recomendado {formatPct(m.posturaDecisoesPct.recomendado)}</span> ·
                    oportunístico {formatPct(m.posturaDecisoesPct.oportunistico)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Nota de metodologia */}
      <Card padding="sm">
        <p className="text-xs italic text-ink-subtle">
          IA recomenda, humano decide, resultado é medido — sem dupla contagem (haircut de 15–20% aplicado ao valor
          atribuído). Misses contam contra o placar: transparência é o que sustenta a confiança no modelo.
        </p>
      </Card>
    </div>
  )
}
