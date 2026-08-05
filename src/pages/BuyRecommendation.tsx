import { Link } from 'react-router-dom'
import { CheckCircle2, Database, ListChecks, Target, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  Badge,
  Card,
  ConfidenceMeter,
  DataTable,
  RecommendationCard,
  SectionTitle,
  type DataTableColumn,
} from '../components/ui'
import { emitirToast } from '../components/feedback/toastBus'
import { abrirAprovacao } from '../components/approval/approvalBus'
import { useDecisao, type ModoDecisao } from '../components/approval/decisionStore'
import {
  snapshot,
  formatBRL,
  formatPct,
  formatTon,
  type DistribuicaoMoinho,
} from '../data'
import { abrirObjeto } from '../components/object/objectBus'

const { compra, tlc, previsao, mercado, logistica } = snapshot
const rec = compra.recomendacao

const origemNome = (id: string) => snapshot.dominio.origens.find((o) => o.id === id)?.nome ?? id
const portoNome = (id: string) => snapshot.dominio.portos.find((p) => p.id === id)?.nome ?? id
const moinhoNome = (id: string) => snapshot.dominio.moinhos.find((m) => m.id === id)?.nome ?? id
const fornecedorNome = (id: string) => snapshot.dominio.fornecedores.find((f) => f.id === id)?.nome ?? id

const fmtCambio = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`
const fmtDelta = (v: number) => `${v < 0 ? '−' : '+'}${formatBRL(Math.abs(v))}`

const btnPrimary =
  'rounded-full bg-gold px-4 py-2 text-xs font-semibold text-navy transition-colors hover:bg-gold-light'
const btnGhost =
  'rounded-full border border-edge px-4 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-gold/40 hover:text-ink'

// --- Racional explicável: 4 blocos (valores do snapshot) ---
const portoPecem = snapshot.dominio.portos.find((p) => p.id === rec.portoId)!
const altRecomendada = tlc.alternativas.find((a) => a.recomendada)!
const fatoresTop = [...previsao.precoTrigo.fatores].sort((a, b) => b.peso - a.peso).slice(0, 3)

const blocosRacional: Array<{ icone: LucideIcon; titulo: string; itens: string[] }> = [
  {
    icone: Database,
    titulo: 'Dados usados',
    itens: [
      `Mercado: CBOT US$ ${mercado.precos.cbotUsdT}/t · FOB Argentina US$ ${mercado.precos.fobArgentinaUsdT}/t · câmbio ${fmtCambio(mercado.precos.cambioBrlUsd)}`,
      `Previsão: ${formatPct(rec.probAlta15dPct)} de prob. de alta em 15d · US$ ${previsao.precoTrigo.horizontes.d30.valor}/t em 30d`,
      `Logística: ${logistica.embarques.length} embarques monitorados · fila de ${portoPecem.filaNavios} navios em ${portoPecem.nome}`,
      'Estoques e consumo real dos 7 moinhos (S&OP diário)',
    ],
  },
  {
    icone: Target,
    titulo: 'Premissas',
    itens: [
      `Janela de frete Up River de ${rec.janelaDias} dias a US$ ${mercado.precos.freteArgentinaNordesteUsdT}/t`,
      `Baseline: compra normal em ~30 dias a ${formatBRL(rec.baselineRs)}/t`,
      `Câmbio ${fmtCambio(previsao.cambio.horizontes.d30.valor)} em 30d (banda ${fmtCambio(previsao.cambio.horizontes.d30.bandaMin!)}–${fmtCambio(previsao.cambio.horizontes.d30.bandaMax!)})`,
      'Consumo dos moinhos conforme plano S&OP vigente',
    ],
  },
  {
    icone: ListChecks,
    titulo: 'Restrições aplicadas',
    itens: [
      'Cobertura mínima por moinho: 30 dias (NE) · 35 dias (Sul)',
      'Especificação: W ≥ 290 e proteína ≥ 11,8% (massas/pães) · DON ≤ 1.000 ppb (biscoito)',
      `Capacidade de descarga: ${portoPecem.nome} ${portoPecem.capacidadeMensalKt} kt/mês`,
      `Volume disponível do fornecedor na janela: ${formatTon(altRecomendada.volumeDisponivelToneladas)}`,
    ],
  },
  {
    icone: TrendingUp,
    titulo: 'Fatores de maior peso',
    itens: [
      ...fatoresTop.map(
        (f) => `${f.rotulo} (${f.direcao === 'alta' ? '+' : '−'}${formatPct(Math.round(f.peso * 100))})`,
      ),
      `Janela logística de ${rec.janelaDias} dias antes da disputa com o milho`,
    ],
  },
]

// --- Alternativas rejeitadas (join com o comparador do TLC) ---
interface LinhaRejeitada {
  origemId: string
  motivo: string
  tlcRs: number
  deltaVsRecomendadaRs: number
  fornecedorId: string
  portoId?: string
}
const rejeitadas: LinhaRejeitada[] = rec.alternativasRejeitadas.map((r) => {
  const alt = tlc.alternativas.find((a) => a.origemId === r.origemId)!
  return {
    origemId: r.origemId,
    motivo: r.motivo,
    tlcRs: alt.tlcRs,
    deltaVsRecomendadaRs: alt.tlcRs - rec.tlcRs,
    fornecedorId: alt.fornecedorId,
    portoId: alt.portoId,
  }
})

const colunasRejeitadas: DataTableColumn<LinhaRejeitada>[] = [
  {
    key: 'alternativa',
    header: 'Alternativa',
    render: (r) => (
      <div>
        <button
          type="button"
          onClick={() => abrirObjeto('origem', r.origemId)}
          className="text-left font-medium text-ink underline-offset-2 hover:text-gold-light hover:underline"
        >
          {origemNome(r.origemId)}
        </button>
        <p className="text-xs text-ink-subtle">
          <button
            type="button"
            onClick={() => abrirObjeto('fornecedor', r.fornecedorId)}
            className="underline-offset-2 hover:text-ink hover:underline"
          >
            {fornecedorNome(r.fornecedorId)}
          </button>
          {r.portoId ? ` · ${portoNome(r.portoId)}` : ' · rodoviário'}
        </p>
      </div>
    ),
  },
  { key: 'tlc', header: 'TLC (R$/t)', align: 'right', render: (r) => formatBRL(r.tlcRs) },
  {
    key: 'delta',
    header: 'Δ vs recomendada',
    align: 'right',
    render: (r) => (
      <span className={`font-semibold ${r.deltaVsRecomendadaRs < 0 ? 'text-positive' : 'text-danger'}`}>
        {fmtDelta(r.deltaVsRecomendadaRs)}/t
      </span>
    ),
  },
  {
    key: 'motivo',
    header: 'Motivo da rejeição',
    render: (r) => <span className="text-xs leading-snug text-ink-muted">{r.motivo}</span>,
  },
]

// --- Distribuição por moinho ---
const CORES_SEGMENTO = ['bg-gold', 'bg-gold/70', 'bg-info/80', 'bg-positive/80']
const politicaDe = (moinhoId: string) =>
  compra.estoqueMoinhos.find((e) => e.moinhoId === moinhoId)?.politicaMinimaDias ?? 30

/** Moinhos com alerta de estoque ativo (Natal e Fortaleza no cenário-âncora). */
const temAlertaEstoque = (moinhoId: string) =>
  snapshot.alertas.some((a) => a.categoria === 'estoque' && a.titulo.includes(moinhoNome(moinhoId)))

const colunasDistribuicao: DataTableColumn<DistribuicaoMoinho>[] = [
  {
    key: 'moinho',
    header: 'Moinho',
    render: (d) => (
      <button
        type="button"
        onClick={() => abrirObjeto('moinho', d.moinhoId)}
        className="text-left font-medium text-ink underline-offset-2 hover:text-gold-light hover:underline"
      >
        {moinhoNome(d.moinhoId)}
      </button>
    ),
  },
  { key: 'volume', header: 'Volume', align: 'right', render: (d) => formatTon(d.toneladas) },
  {
    key: 'share',
    header: '% do lote',
    align: 'right',
    render: (d) => formatPct(Math.round((d.toneladas / rec.volumeToneladas) * 100)),
  },
  {
    key: 'cobertura',
    header: 'Cobertura (antes → depois)',
    align: 'right',
    render: (d) => {
      const abaixo = d.coberturaAtualDias < politicaDe(d.moinhoId)
      return (
        <span className="tnums">
          <span className={abaixo ? 'font-semibold text-danger' : 'text-ink-muted'}>{d.coberturaAtualDias}d</span>
          <span className="mx-1 text-ink-subtle">→</span>
          <span className="font-semibold text-positive">{d.coberturaAposDias}d</span>
          <span className="ml-1 text-[11px] text-ink-subtle">(pol. {politicaDe(d.moinhoId)}d)</span>
        </span>
      )
    },
  },
]

const BADGE_DECISAO: Record<ModoDecisao, { rotulo: string; tone: 'positive' | 'warning' | 'info' }> = {
  aprovada: { rotulo: 'Aprovada hoje', tone: 'positive' },
  ajustada: { rotulo: 'Ajustada pela mesa', tone: 'warning' },
  encaminhada: { rotulo: 'Encaminhada — aguardando alçada', tone: 'info' },
}

export default function BuyRecommendation() {
  const decisao = useDecisao()
  const valorLoteRs = rec.volumeToneladas * rec.tlcRs

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Decisão"
        title="Recomendação de Compra"
        subtitle="Quando, quanto, de qual origem e por qual porto — otimizado pelo TLC ajustado ao risco."
      />

      {/* 1 · Card principal */}
      <RecommendationCard
        title={`Comprar ${formatTon(rec.volumeToneladas)} — ${origemNome(rec.origemId)} via ${portoNome(rec.portoId)}`}
        rationale={rec.racional}
        badges={
          <>
            {decisao && (
              <Badge kind="status" label={BADGE_DECISAO[decisao.modo].rotulo} tone={BADGE_DECISAO[decisao.modo].tone} />
            )}
            <Badge kind="acao" action="comprar" />
            <Badge kind="status" label={`Janela: próximos ${rec.janelaDias} dias`} tone="warning" />
          </>
        }
        stats={[
          {
            label: 'Volume · Janela',
            value: formatTon(rec.volumeToneladas),
            hint: `${formatPct(rec.anteciparPctTrimestre)} do trimestre · ${rec.janelaDias} dias`,
          },
          {
            label: 'TLC',
            value: `${formatBRL(rec.tlcRs)}/t`,
            hint: `vs baseline ${formatBRL(rec.baselineRs)}/t`,
          },
          {
            label: 'Economia',
            value: `${formatBRL(rec.economiaRsT)}/t`,
            hint: `${formatBRL(rec.economiaTotalRs, { compacto: true })} no lote`,
          },
          {
            label: 'Blend',
            value: rec.blend.map((b) => b.pct).join('/'),
            hint: rec.blend.map((b) => `${b.pct}% ${origemNome(b.origemId)}`).join(' + '),
          },
        ]}
        extra={
          <ConfidenceMeter
            value={rec.confiancaPct}
            label="Confiança da recomendação"
            className="max-w-sm"
          />
        }
        actions={
          <>
            <Link to="/tlc" className={btnGhost}>
              Ver decomposição do TLC
            </Link>
            <Link to="/hedge" className={btnGhost}>
              Ver hedge associado (60%)
            </Link>
          </>
        }
      />

      {/* 2 · Racional explicável */}
      <Card>
        <h3 className="font-display text-base font-semibold text-ink">Por que esta recomendação</h3>
        <p className="mt-0.5 text-xs text-ink-subtle">
          Explicabilidade completa: dados, premissas, restrições e fatores — a IA recomenda, o executivo decide.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {blocosRacional.map((bloco) => (
            <div key={bloco.titulo} className="rounded-card border border-edge/60 bg-navy/30 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/15 text-gold" aria-hidden="true">
                  <bloco.icone size={14} />
                </span>
                {bloco.titulo}
              </p>
              <ul className="mt-3 space-y-2">
                {bloco.itens.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs leading-snug text-ink-muted">
                    <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-positive" aria-hidden="true" />
                    <span className="tnums">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {/* 3 · Alternativas rejeitadas */}
        <div className="min-w-0">
          <h3 className="mb-3 font-display text-base font-semibold text-ink">Alternativas rejeitadas</h3>
          <DataTable
            caption="Alternativas de compra rejeitadas e motivo"
            columns={colunasRejeitadas}
            rows={rejeitadas}
            rowKey={(r) => r.origemId}
            minWidth={520}
          />
        </div>

        {/* 4 · Distribuição por moinho */}
        <div className="min-w-0">
          <h3 className="mb-3 font-display text-base font-semibold text-ink">Distribuição por moinho</h3>
          <Card padding="sm" className="mb-3">
            <div className="flex h-3 overflow-hidden rounded-full" role="img" aria-label="Divisão do lote entre os moinhos">
              {rec.distribuicaoMoinhos.map((d, i) => (
                <div
                  key={d.moinhoId}
                  className={`h-full ${CORES_SEGMENTO[i % CORES_SEGMENTO.length]}`}
                  style={{ width: `${(d.toneladas / rec.volumeToneladas) * 100}%` }}
                />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-subtle">
              {rec.distribuicaoMoinhos.map((d, i) => (
                <span key={d.moinhoId} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${CORES_SEGMENTO[i % CORES_SEGMENTO.length]}`} aria-hidden="true" />
                  {moinhoNome(d.moinhoId)} · {formatTon(d.toneladas)}
                </span>
              ))}
            </div>
          </Card>
          <DataTable
            caption="Volume destinado a cada moinho e efeito na cobertura"
            columns={colunasDistribuicao}
            rows={rec.distribuicaoMoinhos}
            rowKey={(d) => d.moinhoId}
            minWidth={440}
            rowClassName={(d) => (temAlertaEstoque(d.moinhoId) ? 'bg-danger/5' : '')}
          />
          <p className="mt-2 text-[11px] text-ink-subtle">
            Natal ({rec.distribuicaoMoinhos.find((d) => d.moinhoId === 'natal')?.coberturaAtualDias}d, efeito do{' '}
            {logistica.navioAtrasado.navio}) e Fortaleza (
            {rec.distribuicaoMoinhos.find((d) => d.moinhoId === 'fortaleza')?.coberturaAtualDias}d) estão abaixo da
            política — a compra recompõe ambos.
          </p>
        </div>
      </div>

      {/* 5 · Workflow de aprovação */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold text-ink">Workflow de aprovação</p>
            <p className="tnums mt-0.5 text-xs text-ink-subtle">
              Materialidade: lote de {formatBRL(valorLoteRs, { compacto: true })} · economia de{' '}
              {formatBRL(rec.economiaTotalRs, { compacto: true })} — <span className="text-warning">acima de R$ 1M → Finanças + Supply</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={btnPrimary} onClick={() => abrirAprovacao()}>
              {decisao ? 'Rever decisão' : 'Aprovar'}
            </button>
            <Link to="/simulador" className={btnGhost}>
              Ajustar
            </Link>
            <button
              type="button"
              className="rounded-full border border-edge px-4 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-danger/50 hover:text-danger"
              onClick={() => emitirToast({ tom: 'erro', titulo: 'Recomendação rejeitada', descricao: 'Feedback registrado para o modelo — a rejeição entra na trilha do VRO.' })}
            >
              Rejeitar
            </button>
            <button type="button" className={btnGhost} onClick={() => abrirAprovacao('encaminhada')}>
              Encaminhar
            </button>
            <Link to="/exportar" className={btnGhost}>
              Exportar one-pager
            </Link>
          </div>
        </div>
      </Card>

    </div>
  )
}
