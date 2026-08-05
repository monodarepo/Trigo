import { Link } from 'react-router-dom'
import { ArrowRight, ChevronRight, Ship } from 'lucide-react'
import {
  Badge,
  Card,
  DataTable,
  KpiTile,
  Pill,
  RecommendationCard,
  SectionTitle,
  Sparkline,
  type DataTableColumn,
  type Tone,
} from '../components/ui'
import {
  snapshot,
  formatBRL,
  formatDataHoraPt,
  formatDataPt,
  formatPct,
  formatTon,
  formatUSD,
  type Alerta,
  type Embarque,
} from '../data'
import { abrirObjeto } from '../components/object/objectBus'
import { SourceBadge } from '../components/trust/SourceBadge'
import { AnimatedNumber } from '../components/live/AnimatedNumber'
import { abrirAprovacao } from '../components/approval/approvalBus'
import { useDecisao, type ModoDecisao } from '../components/approval/decisionStore'
import { useFrescorRelativo, useFxAoVivo } from '../live/useLiveData'
import { FONTE_FRANKFURTER } from '../data'

const { recomendacaoDoDia, kpis, tlc, compra, hedge, previsao, logistica, alertas, simulador, vro, mercado } =
  snapshot

// --- helpers de apresentação (números continuam vindo do snapshot) ---
const fmtCambio = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`
const fmtDelta = (v: number) => `${v < 0 ? '−' : '+'}${formatBRL(Math.abs(v), { compacto: true })}`
const fmtPp = (v: number) =>
  `${v < 0 ? '−' : '+'}${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} p.p.`

const origemNome = (id: string) => snapshot.dominio.origens.find((o) => o.id === id)?.nome ?? id
const portoNome = (id: string) => snapshot.dominio.portos.find((p) => p.id === id)?.nome ?? id
const moinhoNome = (id: string) => snapshot.dominio.moinhos.find((m) => m.id === id)?.nome ?? id

const btnPrimary =
  'rounded-full bg-gold px-4 py-2 text-xs font-semibold text-navy transition-colors hover:bg-gold-light'
const btnGhost =
  'rounded-full border border-edge px-4 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-gold/40 hover:text-ink'

// --- KPIs (linha 2) ---
const contratadoT = logistica.contratos
  .filter((c) => c.status === 'ativo')
  .reduce((soma, c) => soma + c.volumeToneladas, 0)
const pctContratado = Math.round((contratadoT / compra.volumeTrimestreToneladas) * 100)
const moinhosAbaixoPolitica = compra.estoqueMoinhos.filter(
  (e) => e.coberturaDias < e.politicaMinimaDias,
).length
const vroProjetadoHoje = vro.registros.find((r) => r.status === 'projetado')!

// --- Painel risco de mercado ---
const sinalSafra = mercado.sinais.find((s) => s.id === 'sinal-safra-argentina')!
const sinalClima = mercado.sinais.find((s) => s.id === 'sinal-mar-negro')!
const indicadoresMercado: Array<{ rotulo: string; nivel: 'baixo' | 'medio' | 'alto'; texto: string }> = [
  {
    rotulo: 'Preço',
    nivel: 'alto',
    texto: `Prob. de alta de ${formatPct(mercado.precos.probAltaTrigo15dPct)} em 15 dias · CBOT US$ ${previsao.precoTrigo.valorAtual} → US$ ${previsao.precoTrigo.horizontes.d30.valor} em 30d`,
  },
  { rotulo: 'Safra', nivel: 'alto', texto: sinalSafra.titulo },
  { rotulo: 'Clima', nivel: 'medio', texto: sinalClima.titulo },
  {
    rotulo: 'Geopolítica',
    nivel: 'baixo',
    texto: 'Rotas contratadas fora do Mar Negro — exposição limitada à alternativa russa',
  },
]

// --- Painel risco logístico ---
const embarquesAtivos = logistica.embarques.filter((e) => e.status !== 'descarregado')
const emTransito = embarquesAtivos.filter((e) => e.status === 'em-transito' || e.status === 'atrasado').length
const navioAtrasado = logistica.navioAtrasado
const coberturasOrdenadas = [...compra.estoqueMoinhos].sort((a, b) => a.coberturaDias - b.coberturaDias)
const menorCobertura = coberturasOrdenadas[0]

const statusEmbarque: Record<Embarque['status'], { label: string; tone: Tone }> = {
  programado: { label: 'Programado', tone: 'neutral' },
  'em-transito': { label: 'Em trânsito', tone: 'info' },
  atrasado: { label: 'Atrasado', tone: 'danger' },
  atracado: { label: 'Atracado', tone: 'positive' },
  descarregado: { label: 'Descarregado', tone: 'neutral' },
}

const colunasEmbarques: DataTableColumn<Embarque>[] = [
  {
    key: 'navio',
    header: 'Navio',
    render: (e) => (
      <div>
        <button
          type="button"
          onClick={() => abrirObjeto('navio', e.id)}
          className={`text-left font-medium underline-offset-2 hover:underline ${e.status === 'atrasado' ? 'text-danger' : 'text-ink hover:text-gold-light'}`}
        >
          {e.navio}
        </button>
        <p className="text-xs text-ink-subtle">
          {origemNome(e.origemId)} → {portoNome(e.portoDestinoId)}
        </p>
      </div>
    ),
  },
  { key: 'volume', header: 'Volume', align: 'right', render: (e) => formatTon(e.volumeToneladas) },
  { key: 'eta', header: 'ETA', align: 'right', render: (e) => formatDataPt(e.etaAtual) },
  {
    key: 'status',
    header: 'Situação',
    align: 'right',
    render: (e) => {
      const s = statusEmbarque[e.status]
      return (
        <Badge
          kind="status"
          label={e.status === 'atrasado' ? `+${e.atrasoDias} dias` : s.label}
          tone={s.tone}
        />
      )
    },
  },
]

// --- Top 5 oportunidades (valores derivados do snapshot) ---
const altUruguai = tlc.alternativas.find((a) => a.id === 'alt-uruguai-cabedelo')!
const altBrasil = tlc.alternativas.find((a) => a.id === 'alt-brasil-rs')!
const oportunidades = [
  {
    id: 'op-hedge',
    rota: '/hedge',
    descricao: `Elevar hedge cambial para ${formatPct(hedge.recomendacao.coberturaAlvoPct)} — NDF 90d a ${fmtCambio(hedge.recomendacao.taxaForwardMedia)}`,
    valorRs: hedge.recomendacao.protecaoEstimadaRs,
  },
  {
    id: 'op-compra',
    rota: '/compra',
    descricao: `Antecipar ${formatTon(compra.recomendacao.volumeToneladas)} Argentina · Pecém a ${formatBRL(compra.recomendacao.tlcRs)}/t`,
    valorRs: compra.recomendacao.economiaTotalRs,
  },
  {
    id: 'op-brasil',
    rota: '/tlc',
    descricao: `Trigo doméstico RS para biscoito — TLC ${formatBRL(altBrasil.tlcRs)}/t (${fmtDelta(altBrasil.deltaVsBaselineRs)}/t)`,
    valorRs: -altBrasil.deltaVsBaselineRs * altBrasil.volumeDisponivelToneladas,
  },
  {
    id: 'op-demurrage',
    rota: '/tlc',
    descricao: `Priorizar atracação do ${navioAtrasado.navio} — evitar demurrage`,
    valorRs: navioAtrasado.riscoDemurrageRs ?? 0,
  },
  {
    id: 'op-uruguai',
    rota: '/tlc',
    descricao: `Complemento Uruguai ${formatTon(altUruguai.volumeDisponivelToneladas)} via Cabedelo (${fmtDelta(altUruguai.deltaVsBaselineRs)}/t)`,
    valorRs: -altUruguai.deltaVsBaselineRs * altUruguai.volumeDisponivelToneladas,
  },
].sort((a, b) => b.valorRs - a.valorRs)

// --- Top 5 exceções ---
const ordemSeveridade: Record<Alerta['severidade'], number> = { critico: 0, alto: 1, medio: 2, info: 3 }
const toneSeveridade: Record<Alerta['severidade'], Tone> = {
  critico: 'danger',
  alto: 'warning',
  medio: 'info',
  info: 'neutral',
}
const rotuloSeveridade: Record<Alerta['severidade'], string> = {
  critico: 'Crítico',
  alto: 'Alto',
  medio: 'Médio',
  info: 'Info',
}
const excecoes = [...alertas]
  .sort((a, b) => ordemSeveridade[a.severidade] - ordemSeveridade[b.severidade])
  .slice(0, 5)

// --- Faixa de impacto projetado ---
const perfisOrdem = ['conservador', 'recomendado', 'oportunistico'] as const

/** Reflexo do estado de decisão no hero. */
const BADGE_DECISAO: Record<ModoDecisao, { rotulo: (hora: string) => string; tone: Tone }> = {
  aprovada: { rotulo: (h) => `Aprovada às ${h}`, tone: 'positive' },
  ajustada: { rotulo: (h) => `Ajustada pela mesa às ${h}`, tone: 'warning' },
  encaminhada: { rotulo: () => 'Encaminhada — aguardando alçada', tone: 'info' },
}
const BOTAO_DECISAO: Record<ModoDecisao, string> = {
  aprovada: '✓ Recomendação aprovada',
  ajustada: '✓ Ajuste registrado',
  encaminhada: '→ Encaminhada para aprovação',
}

export default function Cockpit() {
  const decisao = useDecisao()
  const rec = recomendacaoDoDia
  // PERIFERIA ao vivo: só o VALOR EXIBIDO do câmbio; deltas/projeções seguem encenados
  const fx = useFxAoVivo()
  const frescorFx = useFrescorRelativo(fx.updatedAt)
  const cambioExibido = fx.isLive ? fx.value.taxa : kpis.cambioAtual

  return (
    <div className="relative space-y-6">
      {/* Brilho radial muito sutil atrás do header (azure→violet) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-32 left-1/4 h-80 w-[36rem] max-w-full rounded-full opacity-[0.08] blur-3xl"
          style={{ background: 'radial-gradient(closest-side, #5B8DEF, #9B7BF0 55%, transparent 75%)' }}
        />
      </div>
      <SectionTitle
        eyebrow="Um único trigo"
        title="A decisão de hoje"
        subtitle={`A mesma verdade para todas as áreas — ${formatDataHoraPt(snapshot.agora)}.`}
      />

      {/* 1+2 · HERO + KPIs — no ultrawide (≥1800px) viram uma linha do grid de parede */}
      <div className="space-y-6 wide:grid wide:grid-cols-3 wide:items-start wide:gap-4 wide:space-y-0">
      <RecommendationCard
        className="wide:col-span-2"
        title={rec.resumo}
        rationale={rec.compra.racional}
        fontes={
          <>
            <SourceBadge familia="preco" />
            <SourceBadge familia="cambio" />
            <SourceBadge familia="frete" />
            <SourceBadge familia="safra" />
          </>
        }
        badges={
          <>
            {decisao && (
              <Badge
                kind="status"
                label={BADGE_DECISAO[decisao.modo].rotulo(decisao.horaRotulo)}
                tone={BADGE_DECISAO[decisao.modo].tone}
              />
            )}
            <Pill tone="warning">Prob. de alta em 15 dias: {formatPct(rec.probAlta15dPct)}</Pill>
            <Pill tone="positive">
              Impacto protegido: {formatBRL(rec.impactoProtegidoRs, { compacto: true })}
            </Pill>
            <Badge kind="confianca" value={rec.compra.confiancaPct} />
          </>
        }
        stats={[
          { label: 'Volume', value: formatTon(rec.compra.volumeToneladas), hint: `janela de ${rec.compra.janelaDias} dias` },
          {
            label: 'TLC',
            value: `${formatBRL(rec.compra.tlcRs)}/t`,
            hint: `vs ${formatBRL(rec.compra.baselineRs)}/t baseline`,
          },
          {
            label: 'Blend',
            value: rec.compra.blend.map((b) => b.pct).join('/'),
            hint: rec.compra.blend.map((b) => origemNome(b.origemId)).join(' + '),
          },
          {
            label: 'Hedge',
            value: formatPct(rec.hedge.coberturaAlvoPct),
            hint: `NDF ${formatUSD(rec.hedge.notionalNovoUsd, { compacto: true })} a ${fmtCambio(rec.hedge.taxaForwardMedia)}`,
          },
        ]}
        actions={
          <>
            <button
              type="button"
              className={decisao ? `${btnPrimary} cursor-default bg-positive text-navy hover:bg-positive` : btnPrimary}
              onClick={() => abrirAprovacao()}
              disabled={decisao != null}
            >
              {decisao ? BOTAO_DECISAO[decisao.modo] : 'Aprovar'}
            </button>
            <Link to="/simulador" className={btnGhost}>
              Simular
            </Link>
            <Link to="/compra" className={btnGhost}>
              Ver racional
            </Link>
            <Link to="/exportar" className={btnGhost}>
              Exportar
            </Link>
          </>
        }
      />

      {/* 2 · KPIs (ultrawide: coluna 2×3 ao lado do hero) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6 wide:grid-cols-2 wide:content-start">
        <KpiTile
          label="Contratado / trimestre"
          value={formatTon(contratadoT)}
          hint={`${formatPct(pctContratado)} da necessidade de ${formatTon(compra.volumeTrimestreToneladas)}`}
          fonte={<SourceBadge familia="estoque" />}
        />
        <KpiTile
          label="Custo landed (TLC do dia)"
          value={formatBRL(tlc.recomendadoRs)}
          unit="/t"
          delta={{ label: `−${formatBRL(tlc.baselineRs - tlc.recomendadoRs)}/t vs baseline`, direction: 'down', tone: 'positive' }}
          fonte={<SourceBadge familia="preco" />}
        />
        <KpiTile
          label="Câmbio"
          value={<AnimatedNumber valor={cambioExibido} formatar={fmtCambio} />}
          delta={{ label: `+${formatPct(previsao.cambio.variacao30dPct, 1)} em 30d`, direction: 'up', tone: 'warning' }}
          hint={`proj. ${fmtCambio(previsao.cambio.horizontes.d90.valor)} em 90d`}
          fonte={
            fx.isLive ? (
              <SourceBadge familia="cambio" fonteOverride={FONTE_FRANKFURTER} frescorOverride={frescorFx ?? undefined} />
            ) : (
              <SourceBadge familia="cambio" />
            )
          }
        />
        <KpiTile
          label="Protegido vs exposto (90d)"
          value={formatPct(kpis.protegidoPct)}
          delta={{ label: `alvo ${formatPct(kpis.protegidoAlvoPct)} após hedge`, direction: 'up', tone: 'info' }}
          fonte={<SourceBadge familia="cambio" />}
        />
        <KpiTile
          label="Cobertura média"
          value={String(kpis.coberturaMediaDias)}
          unit="dias"
          delta={{ label: `${moinhosAbaixoPolitica} moinhos abaixo da política`, direction: 'down', tone: 'warning' }}
          fonte={<SourceBadge familia="estoque" />}
        />
        <KpiTile
          label="Impacto EBITDA YTD (VRO)"
          value={formatBRL(vro.valorCapturadoYtdRs, { compacto: true })}
          delta={{
            label: `${fmtDelta(vroProjetadoHoje.valorCapturadoRs)} projetado hoje`,
            direction: 'up',
            tone: 'positive',
          }}
          fonte={<SourceBadge familia="alertas" />}
        />
      </div>
      </div>

      {/* 3+4 · Risco + listas — tablet: 2 colunas · ultrawide: 4 painéis lado a lado */}
      <div className="grid items-start gap-4 md:grid-cols-2 wide:grid-cols-4">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-base font-semibold text-ink">Risco de mercado</h3>
            <Link
              to="/previsao"
              className="flex items-center gap-1 text-xs font-medium text-gold transition-colors hover:text-gold-light"
            >
              Ver previsão <ChevronRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-card border border-edge/60 bg-navy/40 px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Trigo CBOT</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="tnums font-display text-lg font-semibold text-ink">
                  US$ {previsao.precoTrigo.valorAtual}
                  <span className="ml-1 text-xs font-medium text-ink-subtle">/t</span>
                </p>
                <Sparkline data={previsao.precoTrigo.historico.map((p) => p.valor)} tone="gold" width={72} />
              </div>
            </div>
            <div className="rounded-card border border-edge/60 bg-navy/40 px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Câmbio</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="tnums font-display text-lg font-semibold text-ink">{fmtCambio(kpis.cambioAtual)}</p>
                <Sparkline data={previsao.cambio.historico.map((p) => p.valor)} tone="danger" width={72} />
              </div>
            </div>
          </div>
          <ul className="mt-4 space-y-3">
            {indicadoresMercado.map((ind) => (
              <li key={ind.rotulo} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{ind.rotulo}</p>
                  <p className="mt-0.5 text-xs text-ink-subtle">{ind.texto}</p>
                </div>
                <Badge kind="risco" level={ind.nivel} className="shrink-0" />
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-base font-semibold text-ink">Risco logístico</h3>
            <Link
              to="/tlc"
              className="flex items-center gap-1 text-xs font-medium text-gold transition-colors hover:text-gold-light"
            >
              Ver TLC <ChevronRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-card border border-edge/60 bg-navy/40 px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Em trânsito</p>
              <p className="tnums mt-1 font-display text-lg font-semibold text-ink">
                {emTransito} <span className="text-xs font-medium text-ink-subtle">navios</span>
              </p>
            </div>
            <div className="rounded-card border border-danger/40 bg-danger/10 px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Demurrage em risco</p>
              <p className="tnums mt-1 font-display text-lg font-semibold text-danger">
                {formatBRL(navioAtrasado.riscoDemurrageRs ?? 0, { compacto: true })}
              </p>
            </div>
            <div className="rounded-card border border-edge/60 bg-navy/40 px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Menor cobertura</p>
              <p className="tnums mt-1 font-display text-lg font-semibold text-warning">
                {menorCobertura.coberturaDias}d{' '}
                <span className="text-xs font-medium text-ink-subtle">{moinhoNome(menorCobertura.moinhoId)}</span>
              </p>
            </div>
          </div>
          <DataTable
            className="mt-4 shadow-none"
            caption="Embarques em andamento com ETA e situação"
            columns={colunasEmbarques}
            rows={embarquesAtivos}
            rowKey={(e) => e.id}
            minWidth={440}
          />
          <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
            Cobertura por moinho (menores)
          </p>
          <ul className="mt-2 space-y-2">
            {coberturasOrdenadas.slice(0, 4).map((e) => {
              const abaixo = e.coberturaDias < e.politicaMinimaDias
              const largura = Math.min(100, (e.coberturaDias / e.politicaMinimaDias) * 100)
              return (
                <li key={e.moinhoId} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => abrirObjeto('moinho', e.moinhoId)}
                    className="w-28 shrink-0 text-left text-xs text-ink-muted underline-offset-2 hover:text-ink hover:underline"
                  >
                    {moinhoNome(e.moinhoId)}
                  </button>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-edge/50">
                    <div
                      className={`h-full rounded-full ${abaixo ? 'bg-danger' : 'bg-positive'}`}
                      style={{ width: `${largura}%` }}
                    />
                  </div>
                  <span className={`tnums w-20 shrink-0 text-right text-xs font-semibold ${abaixo ? 'text-danger' : 'text-ink-muted'}`}>
                    {e.coberturaDias}d / {e.politicaMinimaDias}d
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>

        {/* 4 · Oportunidades e exceções (mesmo grid de parede) */}
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-base font-semibold text-ink">Top 5 oportunidades financeiras</h3>
            <Pill tone="gold">{formatBRL(oportunidades.reduce((s, o) => s + o.valorRs, 0), { compacto: true })}</Pill>
          </div>
          <ul className="mt-4 space-y-2">
            {oportunidades.map((op) => (
              <li key={op.id}>
                <Link
                  to={op.rota}
                  className="group flex items-center justify-between gap-3 rounded-card border border-edge/60 bg-navy/30 px-3 py-2.5 transition-colors hover:border-gold/40 hover:bg-white/5"
                >
                  <span className="min-w-0 text-sm text-ink-muted group-hover:text-ink">{op.descricao}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="tnums text-sm font-semibold text-positive">
                      {formatBRL(op.valorRs, { compacto: true })}
                    </span>
                    <ArrowRight
                      size={14}
                      className="text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-gold"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-base font-semibold text-ink">Top 5 exceções que exigem decisão</h3>
            <Link
              to="/alertas"
              className="flex items-center gap-1 text-xs font-medium text-gold transition-colors hover:text-gold-light"
            >
              Ver todos <ChevronRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <ul className="mt-4 space-y-2">
            {excecoes.map((alerta) => (
              <li key={alerta.id}>
                <Link
                  to={alerta.acaoRota}
                  className="group flex items-center justify-between gap-3 rounded-card border border-edge/60 bg-navy/30 px-3 py-2.5 transition-colors hover:border-gold/40 hover:bg-white/5"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Badge
                      kind="status"
                      label={rotuloSeveridade[alerta.severidade]}
                      tone={toneSeveridade[alerta.severidade]}
                      className="shrink-0"
                    />
                    <span className="truncate text-sm text-ink-muted group-hover:text-ink">{alerta.titulo}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-gold">
                    {alerta.acaoRotulo}
                    <ChevronRight size={14} aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* 5 · Impacto projetado (régua de perfis) */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-semibold text-ink">Impacto projetado no trimestre</h3>
            <p className="mt-0.5 text-xs text-ink-subtle">
              Cenário-base: trigo +{formatPct(simulador.defaults.variacaoPrecoTrigoPct)} · câmbio +
              {formatPct(simulador.defaults.variacaoCambioPct, 1)} · atraso de {simulador.defaults.atrasoLogisticoDias}{' '}
              dias ({navioAtrasado.navio})
            </p>
          </div>
          <Link to="/simulador" className={btnGhost}>
            Abrir simulador
          </Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {perfisOrdem.map((perfil) => {
            const cfg = simulador.perfis[perfil]
            const out = simulador.cenarioDefault.porPerfil[perfil]
            const destaque = perfil === 'recomendado'
            return (
              <div
                key={perfil}
                className={`rounded-card border px-4 py-3 ${
                  destaque ? 'border-gold/50 bg-gold/10' : 'border-edge/60 bg-navy/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm font-semibold ${destaque ? 'text-gold-light' : 'text-ink'}`}>{cfg.rotulo}</p>
                  {destaque && <Badge kind="status" label="Recomendado" tone="gold" />}
                </div>
                <div className={`mt-2 h-1 rounded-full ${destaque ? 'bg-gold' : 'bg-edge/60'}`} aria-hidden="true" />
                <dl className="mt-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink-subtle">Δ CPV vs baseline</dt>
                    <dd className="tnums font-semibold text-ink">{fmtDelta(out.deltaVsBaselineRs)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink-subtle">EBITDA</dt>
                    <dd className="tnums font-semibold text-ink">
                      {fmtDelta(-out.deltaVsBaselineRs)} · {fmtPp(out.impactoMargemEbitdaPp)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink-subtle">Capital empregado</dt>
                    <dd className="tnums font-semibold text-ink">{formatBRL(out.custoTrimestreRs, { compacto: true })}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-ink-subtle">Exposição FX residual</dt>
                    <dd className="tnums font-semibold text-ink">{formatUSD(out.exposicaoResidualUsd, { compacto: true })}</dd>
                  </div>
                </dl>
              </div>
            )
          })}
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs text-ink-subtle">
          <Ship size={14} aria-hidden="true" />
          Antecipar {formatPct(compra.recomendacao.anteciparPctTrimestre)} e proteger{' '}
          {formatPct(hedge.recomendacao.coberturaAlvoPct)} equilibra custo e risco: menor CPV que o conservador com
          exposição residual controlada.
        </p>
      </Card>
    </div>
  )
}
