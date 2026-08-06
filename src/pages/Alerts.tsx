import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronRight,
  DollarSign,
  Factory,
  FlaskConical,
  Package,
  Scale,
  ShieldCheck,
  Ship,
  Store,
  TrendingUp,
  Wheat,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge, Card, EmptyState, KpiTile, SectionTitle, type Tone } from '../components/ui'
import { colors } from '../theme/tokens'
import { abrirObjeto } from '../components/object/objectBus'
import type { TipoObjeto } from '../data/objects'
import {
  snapshot,
  formatBRL,
  formatDataHoraPt,
  formatPct,
  formatTon,
  formatUSD,
  getAgente,
  sensibilidadeRendimentoRsT,
  type Alerta,
  type FarinhaId,
  type MoinhoId,
} from '../data'
import { ORCAMENTO_TRIGO_RS_T } from '../data/compra'

const { alertas } = snapshot

type Categoria = Alerta['categoria']
type Severidade = Alerta['severidade']

const fmtCambio = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`

// --- Categorias: ícone em selo colorido (círculo com ícone branco) ---
const CATEGORIAS: Array<{ id: Categoria; rotulo: string; icone: LucideIcon; cor: string }> = [
  { id: 'mercado', rotulo: 'Mercado', icone: TrendingUp, cor: colors.iconBadge.market },
  { id: 'cambio', rotulo: 'Câmbio', icone: DollarSign, cor: colors.gold.primary },
  { id: 'logistica', rotulo: 'Logística', icone: Ship, cor: colors.iconBadge.logistics },
  { id: 'estoque', rotulo: 'Estoque', icone: Package, cor: colors.iconBadge.weather },
  { id: 'hedge', rotulo: 'Hedge', icone: ShieldCheck, cor: colors.semantic.positive },
  { id: 'qualidade', rotulo: 'Qualidade', icone: FlaskConical, cor: colors.iconBadge.internal },
  // --- Elo farinha → margem ---
  { id: 'farinha', rotulo: 'Farinha', icone: Wheat, cor: colors.semantic.violet },
  { id: 'moinho', rotulo: 'Moinhos', icone: Factory, cor: colors.semantic.cyan },
  { id: 'margem', rotulo: 'Margem', icone: Scale, cor: colors.gold.light },
  { id: 'comercial', rotulo: 'Comercial', icone: Store, cor: colors.semantic.info },
]
const categoriaDe = (id: Categoria) => CATEGORIAS.find((c) => c.id === id)!

/**
 * Impacto formatado com a BASE explícita. Sem o rótulo da base, R$ 5,3M de
 * desvio trimestral e R$ 372 mil de economia mensal apareceriam na mesma
 * coluna como se fossem comparáveis.
 */
const ROTULO_BASE: Record<NonNullable<Alerta['impactoBase']>, string> = {
  mes: '/mês',
  trimestre: '/trimestre',
  evento: '',
}
function impactoFormatado(a: Alerta): { texto: string; positivo: boolean } | null {
  if (a.impactoRs == null) return null
  const positivo = a.impactoRs > 0
  const sinal = positivo ? '+' : '−'
  return {
    texto: `${sinal}${formatBRL(Math.abs(a.impactoRs), { compacto: true })}${ROTULO_BASE[a.impactoBase ?? 'evento']}`,
    positivo,
  }
}

const ORDEM_SEV: Record<Severidade, number> = { critico: 0, alto: 1, medio: 2, info: 3 }
const TONE_SEV: Record<Severidade, Tone> = { critico: 'danger', alto: 'warning', medio: 'info', info: 'neutral' }
const ROTULO_SEV: Record<Severidade, string> = { critico: 'Crítico', alto: 'Alto', medio: 'Médio', info: 'Info' }

const exigeDecisao = (a: Alerta) => a.severidade !== 'info'

/** Ficha de objeto relacionada a cada alerta (padrão Foundry). */
const FICHA_DO_ALERTA: Record<string, { tipo: TipoObjeto; id: string; rotulo: string }> = {
  'alerta-rio-parana': { tipo: 'navio', id: 'mv-rio-parana', rotulo: 'Ficha do navio' },
  'alerta-cobertura-natal': { tipo: 'moinho', id: 'natal', rotulo: 'Ficha do Moinho Natal' },
  'alerta-estoque-fortaleza': { tipo: 'moinho', id: 'fortaleza', rotulo: 'Ficha do Moinho Fortaleza' },
  'alerta-don-russia': { tipo: 'lote', id: 'alt-russia-suape', rotulo: 'Ficha do lote russo' },
  'alerta-restricao-exportacao': { tipo: 'origem', id: 'russia', rotulo: 'Ficha da origem Rússia' },
  'alerta-farinha-abaixo-custo': { tipo: 'moinho', id: 'bento-goncalves', rotulo: 'Ficha do Moinho Bento Gonçalves' },
  'alerta-rendimento-cabedelo': { tipo: 'moinho', id: 'cabedelo', rotulo: 'Ficha do Moinho Cabedelo' },
  'alerta-capacidade-minima-rolandia': { tipo: 'moinho', id: 'rolandia', rotulo: 'Ficha do Moinho Rolândia' },
  'alerta-capacidade-ociosa-salvador': { tipo: 'moinho', id: 'salvador', rotulo: 'Ficha do Moinho Salvador' },
  'alerta-cambio-vira-decisao': { tipo: 'moinho', id: 'rolandia', rotulo: 'Ficha do Moinho Rolândia' },
  'alerta-farinha-sem-destino': { tipo: 'moinho', id: 'rolandia', rotulo: 'Ficha do Moinho Rolândia' },
}

const ordenados = [...alertas].sort(
  (a, b) => ORDEM_SEV[a.severidade] - ORDEM_SEV[b.severidade] || b.timestamp.localeCompare(a.timestamp),
)

const contagem = {
  total: alertas.length,
  critico: alertas.filter((a) => a.severidade === 'critico').length,
  alto: alertas.filter((a) => a.severidade === 'alto').length,
  medio: alertas.filter((a) => a.severidade === 'medio').length,
}

// --- Dados relacionados por alerta (tudo do snapshot) ---
function detalhesDoAlerta(alerta: Alerta): Array<{ rotulo: string; valor: string }> {
  const navio = snapshot.logistica.navioAtrasado
  const hedgeRec = snapshot.hedge.recomendacao
  const compraRec = snapshot.compra.recomendacao
  const cambio = snapshot.previsao.cambio
  const trigo = snapshot.previsao.precoTrigo
  const estoque = (id: string) => snapshot.compra.estoqueMoinhos.find((e) => e.moinhoId === id)!
  const distr = (id: string) => compraRec.distribuicaoMoinhos.find((d) => d.moinhoId === id)!
  const altRussia = snapshot.tlc.alternativas.find((a) => a.id === 'alt-russia-suape')!
  /** Atalhos do elo farinha — mesmas funções do motor que as telas chamam. */
  const ef = (m: MoinhoId, f: FarinhaId) => snapshot.moinhos.eficiencia(m, f)
  const mbs = (m: MoinhoId) => snapshot.makeBuySell.cenarios.find((c) => c.moinhoId === m)!

  switch (alerta.id) {
    case 'alerta-rio-parana':
      return [
        { rotulo: 'Navio · rota', valor: `${navio.navio} · Argentina → Natal` },
        { rotulo: 'Volume', valor: formatTon(navio.volumeToneladas) },
        { rotulo: 'ETA original → nova', valor: `14 ago → 20 ago (+${navio.atrasoDias} dias)` },
        { rotulo: 'Demurrage em risco', valor: formatBRL(navio.riscoDemurrageRs ?? 0, { compacto: true }) },
        { rotulo: 'Cobertura Moinho Natal', valor: `${estoque('natal').coberturaDias} dias (política 30)` },
        { rotulo: 'Mitigação na compra', valor: `${formatTon(distr('natal').toneladas)} → ${distr('natal').coberturaAposDias} dias` },
      ]
    case 'alerta-dolar-limite':
      return [
        { rotulo: 'Spot', valor: fmtCambio(snapshot.mercado.precos.cambioBrlUsd) },
        { rotulo: 'Limite de política', valor: fmtCambio(snapshot.hedge.politicaCambioLimite) },
        { rotulo: 'Projeção 90d', valor: `${fmtCambio(cambio.horizontes.d90.valor)} (banda até ${fmtCambio(cambio.horizontes.d90.bandaMax!)})` },
        { rotulo: 'Cobertura atual → alvo', valor: `${formatPct(hedgeRec.coberturaAtualPct)} → ${formatPct(hedgeRec.coberturaAlvoPct)}` },
        { rotulo: 'NDF recomendado', valor: `${formatUSD(hedgeRec.notionalNovoUsd, { compacto: true })} a ${fmtCambio(hedgeRec.taxaForwardMedia)}` },
      ]
    case 'alerta-safra-argentina':
      return [
        { rotulo: 'Safra argentina', valor: '52,0 → 49,9 Mt (−2,1 Mt)' },
        { rotulo: 'Prob. de alta em 15d', valor: formatPct(snapshot.mercado.precos.probAltaTrigo15dPct) },
        { rotulo: 'CBOT hoje → 30d', valor: `US$ ${trigo.valorAtual} → US$ ${trigo.horizontes.d30.valor}/t` },
        { rotulo: 'FOB Argentina', valor: `US$ ${snapshot.mercado.precos.fobArgentinaUsdT}/t` },
      ]
    case 'alerta-estoque-fortaleza':
      return [
        { rotulo: 'Cobertura atual', valor: `${estoque('fortaleza').coberturaDias} dias` },
        { rotulo: 'Política mínima', valor: `${estoque('fortaleza').politicaMinimaDias} dias` },
        { rotulo: 'Estoque físico', valor: formatTon(estoque('fortaleza').estoqueToneladas) },
        { rotulo: 'Alocação recomendada', valor: `${formatTon(distr('fortaleza').toneladas)} → ${distr('fortaleza').coberturaAposDias} dias` },
      ]
    case 'alerta-janela-hedge':
      return [
        { rotulo: 'NDF 90 dias', valor: fmtCambio(hedgeRec.taxaForwardMedia) },
        { rotulo: 'Cenário-base 90d', valor: fmtCambio(hedgeRec.cenarioCambioD90) },
        { rotulo: 'Notional recomendado', valor: formatUSD(hedgeRec.notionalNovoUsd, { compacto: true }) },
        { rotulo: 'Proteção estimada', valor: formatBRL(hedgeRec.protecaoEstimadaRs, { compacto: true }) },
        { rotulo: 'Janela estimada', valor: '2–3 pregões' },
      ]
    case 'alerta-cobertura-natal':
      return [
        { rotulo: 'Cobertura atual', valor: `${estoque('natal').coberturaDias} dias` },
        { rotulo: 'Política mínima', valor: `${estoque('natal').politicaMinimaDias} dias` },
        { rotulo: 'Causa', valor: `${navio.navio} +${navio.atrasoDias} dias` },
        { rotulo: 'Alocação recomendada', valor: `${formatTon(distr('natal').toneladas)} → ${distr('natal').coberturaAposDias} dias` },
      ]
    case 'alerta-prob-alta':
      return [
        { rotulo: 'Probabilidade de alta (15d)', valor: formatPct(snapshot.mercado.precos.probAltaTrigo15dPct) },
        { rotulo: 'CBOT 30d', valor: `US$ ${trigo.horizontes.d30.valor}/t (${trigo.horizontes.d30.bandaMin}–${trigo.horizontes.d30.bandaMax})` },
        { rotulo: 'Fator de maior peso', valor: `${trigo.fatores[0].rotulo} (+${formatPct(Math.round(trigo.fatores[0].peso * 100))})` },
      ]
    case 'alerta-don-russia':
      return [
        { rotulo: 'DON medido', valor: `${altRussia.qualidade.don.toLocaleString('pt-BR')} ppb` },
        { rotulo: 'Política (biscoito)', valor: '≤ 1.000 ppb' },
        { rotulo: 'TLC da alternativa', valor: `${formatBRL(altRussia.tlcRs)}/t` },
        { rotulo: 'Status', valor: 'Fora da recomendação do dia' },
      ]
    case 'alerta-restricao-exportacao':
      return [
        { rotulo: 'Origem afetada', valor: 'Rússia (Mar Negro)' },
        { rotulo: 'Volume alternativo', valor: formatTon(altRussia.volumeDisponivelToneladas) },
        { rotulo: 'TLC da alternativa', valor: `${formatBRL(altRussia.tlcRs)}/t (+${formatBRL(altRussia.deltaVsBaselineRs)}/t vs baseline)` },
        { rotulo: 'Exposição da recomendação', valor: 'Nenhuma — compra do dia é Argentina' },
      ]

    // --- Elo farinha → margem ---
    case 'alerta-farinha-abaixo-custo': {
      const c = mbs('bento-goncalves')
      return [
        { rotulo: 'Custo pleno (P&L)', valor: `${formatBRL(c.custoInternoRsT)}/t` },
        { rotulo: 'Custo evitável (base da decisão)', valor: `${formatBRL(c.custoEvitavelRsT)}/t` },
        { rotulo: 'Preço externo comparável', valor: `${formatBRL(c.precoExternoRsT)}/t` },
        { rotulo: 'Economia ao comprar', valor: `${formatBRL(c.custoEvitavelRsT - c.precoExternoRsT)}/t` },
        { rotulo: 'Volume da janela', valor: formatTon(c.volumeT) },
        { rotulo: 'Base de comparação', valor: 'Industrial · granel · posto fábrica' },
      ]
    }
    case 'alerta-venda-supera-interno': {
      const lista = snapshot.comercial.oportunidades.filter(
        (o) => o.status === 'recomendada' && o.superaUsoInterno === true,
      )
      return [
        { rotulo: 'Pedidos que superam o uso interno', valor: String(lista.length) },
        { rotulo: 'Volume somado', valor: formatTon(lista.reduce((s, o) => s + o.volumeT, 0)) },
        ...lista.map((o) => ({
          rotulo: snapshot.comercial.clientes.find((c) => c.id === o.clienteId)?.nome ?? o.clienteId,
          valor: `${formatBRL(o.margemRsT)}/t vs ${formatBRL(o.ganhoUsoInternoRsT ?? 0)}/t interno`,
        })),
        { rotulo: 'Ruptura', valor: 'Nenhuma — todos cabem na folga do parque' },
      ]
    }
    case 'alerta-orcamento-trigo':
      return [
        { rotulo: 'TLC do dia', valor: `${formatBRL(snapshot.tlc.recomendadoRs)}/t` },
        { rotulo: 'Orçamento do trimestre', valor: `${formatBRL(ORCAMENTO_TRIGO_RS_T)}/t` },
        { rotulo: 'Baseline (não agir)', valor: `${formatBRL(snapshot.tlc.baselineRs)}/t` },
        { rotulo: 'Volume ainda a comprar', valor: formatTon(compraRec.volumeTrimestreToneladas) },
        {
          rotulo: 'Desvio no trimestre',
          valor: formatBRL((snapshot.tlc.recomendadoRs - ORCAMENTO_TRIGO_RS_T) * compraRec.volumeTrimestreToneladas, {
            compacto: true,
          }),
        },
      ]
    case 'alerta-rendimento-cabedelo': {
      const e = ef('cabedelo', 'biscoito')
      return [
        { rotulo: 'Rendimento de regime', valor: formatPct(e.rendimentoPct, 1) },
        { rotulo: 'Queda observada', valor: '0,8 p.p.' },
        { rotulo: 'Custo por p.p. de rendimento', valor: `${formatBRL(sensibilidadeRendimentoRsT('cabedelo', 'biscoito'))}/t` },
        { rotulo: 'Produção do mês', valor: formatTon(Math.round((e.capacidadeFarinhaT * e.utilizacaoPct) / 100)) },
        { rotulo: 'Custo pleno atual', valor: `${formatBRL(e.custoInternoRsT)}/t` },
      ]
    }
    case 'alerta-capacidade-minima-rolandia': {
      const e = ef('rolandia', 'massa')
      return [
        { rotulo: 'Utilização atual', valor: formatPct(e.utilizacaoPct) },
        { rotulo: 'Capacidade econômica mínima', valor: formatPct(e.utilizacaoMinimaPct ?? 0, 1) },
        { rotulo: 'Folga', valor: `${(e.folgaPp ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} p.p.` },
        { rotulo: 'Custo pleno', valor: `${formatBRL(e.custoInternoRsT)}/t` },
        { rotulo: 'Preço de mercado (Sul)', valor: `${formatBRL(e.precoExternoRsT)}/t` },
        { rotulo: 'Vantagem atual', valor: `${formatBRL(e.ganhoRsT)}/t — a menor do parque` },
      ]
    }
    case 'alerta-capacidade-ociosa-salvador': {
      const e = ef('salvador', 'massa')
      return [
        { rotulo: 'Capacidade ociosa', valor: formatTon(e.capacidadeOciosaT) },
        { rotulo: 'Custo marginal', valor: `${formatBRL(e.custoMarginalRsT)}/t` },
        { rotulo: 'Preço comparável', valor: `${formatBRL(e.precoExternoRsT)}/t` },
        { rotulo: 'Margem incremental', valor: `${formatBRL(e.margemIncrementalRsT)}/t (líquida do custo de servir)` },
        { rotulo: 'Utilização atual', valor: formatPct(e.utilizacaoPct) },
        { rotulo: 'Condição', valor: 'Potencial — depende de contratar cliente' },
      ]
    }
    case 'alerta-ruptura-cerrado': {
      const o = snapshot.comercial.oportunidades.find((x) => x.guardrail.semaforo === 'ruptura')!
      return [
        { rotulo: 'Volume pedido', valor: formatTon(o.volumeT) },
        { rotulo: 'Cabe na folga', valor: formatTon(o.guardrail.volumeSeguroT) },
        { rotulo: 'Em ruptura', valor: formatTon(o.guardrail.volumeEmRupturaT) },
        { rotulo: 'Custo de reposição', valor: `${formatBRL(o.guardrail.custoReposicaoRsT)}/t` },
        { rotulo: 'Margem aparente', valor: `${formatBRL(o.margemRsT)}/t` },
        { rotulo: 'Margem com reposição', valor: `${formatBRL(o.guardrail.margemPonderadaRsT)}/t` },
      ]
    }
    case 'alerta-cambio-vira-decisao':
      return [
        { rotulo: 'Câmbio hoje', valor: fmtCambio(snapshot.mercado.precos.cambioBrlUsd) },
        { rotulo: 'Ponto de virada (Rolândia)', valor: 'R$ 5,25' },
        { rotulo: 'Topo da banda 90d', valor: fmtCambio(cambio.horizontes.d90.bandaMax ?? 5.6) },
        { rotulo: 'Parcela dolarizada do TLC', valor: 'US$ 274/t' },
        { rotulo: 'Custo pleno hoje', valor: `${formatBRL(ef('rolandia', 'massa').custoInternoRsT)}/t` },
        { rotulo: 'Preço de mercado (Sul)', valor: `${formatBRL(ef('rolandia', 'massa').precoExternoRsT)}/t` },
      ]
    case 'alerta-lote-incompativel': {
      const l = snapshot.estoqueTrigo.lotes.find((x) => x.status === 'bloqueado')!
      return [
        { rotulo: 'Lote', valor: l.id },
        { rotulo: 'Quantidade', valor: formatTon(l.quantidadeT) },
        { rotulo: 'DON medido', valor: `${l.qualidade.don.toLocaleString('pt-BR')} ppb` },
        { rotulo: 'Política (biscoito)', valor: '≤ 1.000 ppb' },
        { rotulo: 'Capital parado', valor: formatBRL(l.quantidadeT * snapshot.tlc.recomendadoRs, { compacto: true }) },
        { rotulo: 'Destino sugerido', valor: 'Ração ou novo laudo' },
      ]
    }
    case 'alerta-farinha-sem-destino': {
      const p = snapshot.demanda.planoMoinhos.find((x) => x.moinhoId === 'rolandia')!
      return [
        { rotulo: 'Capacidade de trigo', valor: formatTon(p.capacidadeTrigoT) },
        { rotulo: 'Consumo interno', valor: formatTon(p.trigoInternoT) },
        { rotulo: 'Ocupação', valor: formatPct(p.ocupacaoPct, 1) },
        { rotulo: 'Farinha sem destino', valor: formatTon(p.farinhaDisponivelT) },
        { rotulo: 'Armazenagem', valor: `${formatBRL(8)}/t por mês` },
      ]
    }
    case 'alerta-preco-farinha-ne': {
      const s = snapshot.farinha.mercado.series.find(
        (x) => x.farinhaId === 'massa' && x.regiao === 'nordeste',
      )!
      return [
        { rotulo: 'Preço comparável hoje', valor: `${formatBRL(s.precoAtualRsT)}/t` },
        { rotulo: 'Projeção 30 dias', valor: `${formatBRL(s.projecaoD30RsT)}/t` },
        { rotulo: 'Custo interno (Fortaleza)', valor: `${formatBRL(snapshot.farinha.kpis.custoFarinhaRsT)}/t` },
        { rotulo: 'Ganho da verticalização', valor: `${formatBRL(snapshot.farinha.kpis.ganhoVerticalizacaoRsT)}/t` },
        { rotulo: 'Base', valor: 'Industrial · granel · posto fábrica' },
      ]
    }
    default:
      return []
  }
}

function FiltroChips<T extends string>({
  rotulo,
  opcoes,
  valor,
  onChange,
}: {
  rotulo: string
  opcoes: ReadonlyArray<{ id: T; rotulo: string }>
  valor: T
  onChange: (v: T) => void
}) {
  return (
    <div role="group" aria-label={rotulo} className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">{rotulo}</span>
      {opcoes.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={o.id === valor}
          onClick={() => onChange(o.id)}
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
            o.id === valor
              ? 'border-gold/50 bg-gold/15 text-gold-light'
              : 'border-edge bg-card-2 text-ink-muted hover:border-gold/40 hover:text-ink'
          }`}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  )
}

function LinhaAlerta({ alerta, onAbrir }: { alerta: Alerta; onAbrir: () => void }) {
  const cat = categoriaDe(alerta.categoria)
  const agente = alerta.agenteId ? getAgente(alerta.agenteId) : undefined
  const impacto = impactoFormatado(alerta)
  return (
    <li className="flex items-center gap-3 rounded-card border border-edge/60 bg-card p-3 transition-colors hover:border-gold/40">
      <button type="button" onClick={onAbrir} className="flex min-w-0 flex-1 items-start gap-3 text-left">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: cat.cor }}
          aria-label={`Categoria: ${cat.rotulo}`}
        >
          <cat.icone size={16} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <Badge kind="status" label={ROTULO_SEV[alerta.severidade]} tone={TONE_SEV[alerta.severidade]} />
            <span className="tnums text-[11px] text-ink-subtle">{formatDataHoraPt(alerta.timestamp)}</span>
            {agente && <span className="text-[11px] text-ink-faint">· {agente.nome}</span>}
          </span>
          <span className="mt-1 block truncate text-sm font-medium text-ink">{alerta.titulo}</span>
          <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-ink-subtle">{alerta.descricao}</span>
        </span>
      </button>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {impacto && (
          <span
            className={`tnums font-mono text-sm font-semibold ${impacto.positivo ? 'text-positive' : 'text-danger'}`}
            title={alerta.impactoNota}
          >
            {impacto.texto}
          </span>
        )}
        <Link
          to={alerta.acaoRota}
          className="flex items-center gap-1 rounded-full border border-edge px-3 py-1.5 text-[11px] font-semibold text-gold transition-colors hover:border-gold/40"
        >
          {alerta.acaoRotulo}
          <ChevronRight size={12} aria-hidden="true" />
        </Link>
      </div>
    </li>
  )
}

export default function Alerts() {
  const [categoria, setCategoria] = useState<'todas' | Categoria>('todas')
  const [severidade, setSeveridade] = useState<'todas' | Severidade>('todas')
  const [grupo, setGrupo] = useState<'todos' | 'decisao' | 'informativo'>('todos')
  const [aberto, setAberto] = useState<Alerta | null>(null)

  useEffect(() => {
    if (!aberto) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [aberto])

  const filtrados = useMemo(
    () =>
      ordenados.filter(
        (a) =>
          (categoria === 'todas' || a.categoria === categoria) &&
          (severidade === 'todas' || a.severidade === severidade) &&
          (grupo === 'todos' || (grupo === 'decisao' ? exigeDecisao(a) : !exigeDecisao(a))),
      ),
    [categoria, severidade, grupo],
  )
  const decisao = filtrados.filter(exigeDecisao)
  const informativos = filtrados.filter((a) => !exigeDecisao(a))
  const limparFiltros = () => {
    setCategoria('todas')
    setSeveridade('todas')
    setGrupo('todos')
  }

  const secoes: Array<{ titulo: string; itens: Alerta[] }> =
    grupo === 'todos'
      ? [
          { titulo: `Exigem decisão (${decisao.length})`, itens: decisao },
          { titulo: `Informativos (${informativos.length})`, itens: informativos },
        ].filter((s) => s.itens.length > 0)
      : [{ titulo: `${filtrados.length} alerta(s)`, itens: filtrados }]

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Margem & Decisão"
        title="Alertas & Decisões"
        subtitle="Gestão por exceção: o que mudou desde ontem e exige uma decisão hoje."
      />

      {/* 1 · Contadores (clicáveis = filtro de severidade) + o que está em jogo */}
      {/* 4 contadores + o card de impacto (col-span-2) = 6 unidades numa linha */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <button type="button" className="min-w-0 text-left" onClick={limparFiltros} aria-pressed={severidade === 'todas'}>
          <KpiTile label="Total de alertas" value={String(contagem.total)} hint={`${snapshot.contagemAlertas} no sino (críticos + altos)`} />
        </button>
        <button
          type="button"
          className="min-w-0 text-left"
          onClick={() => setSeveridade(severidade === 'critico' ? 'todas' : 'critico')}
          aria-pressed={severidade === 'critico'}
        >
          <KpiTile label="Críticos" value={String(contagem.critico)} delta={{ label: 'ação imediata', direction: 'up', tone: 'danger' }} />
        </button>
        <button
          type="button"
          className="min-w-0 text-left"
          onClick={() => setSeveridade(severidade === 'alto' ? 'todas' : 'alto')}
          aria-pressed={severidade === 'alto'}
        >
          <KpiTile label="Altos" value={String(contagem.alto)} delta={{ label: 'decidir hoje', direction: 'up', tone: 'warning' }} />
        </button>
        <button
          type="button"
          className="min-w-0 text-left"
          onClick={() => setSeveridade(severidade === 'medio' ? 'todas' : 'medio')}
          aria-pressed={severidade === 'medio'}
        >
          <KpiTile label="Médios" value={String(contagem.medio)} delta={{ label: 'monitorar', direction: 'flat', tone: 'info' }} />
        </button>
        {/* O número que o CFO lê primeiro: quanto vale agir sobre estes alertas.
            Só entram os de base MENSAL — misturar com o desvio trimestral de
            orçamento daria um total que não é nem mês nem trimestre. */}
        <div className="min-w-0 xl:col-span-2">
          <KpiTile
            label="Em jogo neste mês"
            value={formatBRL(snapshot.impactoAlertasRs, { compacto: true })}
            delta={{
              label: `${formatBRL(snapshot.oportunidadeAlertasRs, { compacto: true })} a capturar · ${formatBRL(snapshot.riscoAlertasRs, { compacto: true })} a evitar`,
              direction: 'flat',
              tone: 'gold',
            }}
            hint="Só alertas de impacto mensal com ação pendente"
          />
        </div>
      </div>

      {/* 3 · Filtros */}
      <Card padding="sm">
        <div className="flex flex-col gap-3">
          <FiltroChips
            rotulo="Categoria"
            valor={categoria}
            onChange={setCategoria}
            opcoes={[{ id: 'todas' as const, rotulo: 'Todas' }, ...CATEGORIAS.map((c) => ({ id: c.id, rotulo: c.rotulo }))]}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FiltroChips
              rotulo="Severidade"
              valor={severidade}
              onChange={setSeveridade}
              opcoes={[
                { id: 'todas' as const, rotulo: 'Todas' },
                { id: 'critico' as const, rotulo: 'Crítico' },
                { id: 'alto' as const, rotulo: 'Alto' },
                { id: 'medio' as const, rotulo: 'Médio' },
                { id: 'info' as const, rotulo: 'Info' },
              ]}
            />
            <FiltroChips
              rotulo="Agrupar"
              valor={grupo}
              onChange={setGrupo}
              opcoes={[
                { id: 'todos' as const, rotulo: 'Todos' },
                { id: 'decisao' as const, rotulo: 'Exige decisão' },
                { id: 'informativo' as const, rotulo: 'Informativo' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* 2 · Lista priorizada / 5 · vazio */}
      {filtrados.length === 0 ? (
        <EmptyState
          title="Nenhum alerta com estes filtros"
          description="Tudo tratado por aqui. Ajuste os filtros ou volte ao conjunto completo do dia."
          action={
            <button
              type="button"
              onClick={limparFiltros}
              className="rounded-full bg-gold px-4 py-2 text-xs font-semibold text-navy transition-colors hover:bg-gold-light"
            >
              Limpar filtros
            </button>
          }
        />
      ) : (
        <div className="space-y-5">
          {secoes.map((secao) => (
            <div key={secao.titulo}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">{secao.titulo}</p>
              <ul className="space-y-2">
                {secao.itens.map((alerta) => (
                  <LinhaAlerta key={alerta.id} alerta={alerta} onAbrir={() => setAberto(alerta)} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* 4 · Drawer de detalhe */}
      <AnimatePresence>
        {aberto && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setAberto(null)}
              aria-hidden="true"
            />
            <motion.aside
              className="fixed inset-y-0 right-0 z-50 w-[400px] max-w-full overflow-y-auto border-l border-edge bg-card p-5"
              initial={{ x: 420 }}
              animate={{ x: 0 }}
              exit={{ x: 420 }}
              transition={{ type: 'tween', duration: 0.2 }}
              role="dialog"
              aria-modal="true"
              aria-label={`Detalhe do alerta: ${aberto.titulo}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: categoriaDe(aberto.categoria).cor }}
                  aria-hidden="true"
                >
                  {(() => {
                    const Icone = categoriaDe(aberto.categoria).icone
                    return <Icone size={18} />
                  })()}
                </span>
                <button
                  type="button"
                  onClick={() => setAberto(null)}
                  aria-label="Fechar detalhe"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-ink-subtle hover:bg-white/5 hover:text-ink"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge kind="status" label={ROTULO_SEV[aberto.severidade]} tone={TONE_SEV[aberto.severidade]} />
                <Badge kind="status" label={categoriaDe(aberto.categoria).rotulo} tone="neutral" />
                <span className="tnums text-[11px] text-ink-subtle">{formatDataHoraPt(aberto.timestamp)}</span>
              </div>
              <h3 className="mt-3 font-display text-lg font-semibold leading-snug text-ink">{aberto.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{aberto.descricao}</p>

              {(() => {
                const impacto = impactoFormatado(aberto)
                if (!impacto) return null
                return (
                  <div
                    className={`mt-4 rounded-card border px-3 py-2.5 ${
                      impacto.positivo ? 'border-positive/30 bg-positive/10' : 'border-danger/30 bg-danger/10'
                    }`}
                  >
                    <p className="eyebrow">{impacto.positivo ? 'Valor a capturar' : 'Perda ou risco'}</p>
                    <p
                      className={`tnums mt-1 font-display text-2xl font-semibold ${
                        impacto.positivo ? 'text-positive' : 'text-danger'
                      }`}
                    >
                      {impacto.texto}
                    </p>
                    {aberto.impactoNota && (
                      <p className="mt-1 text-[11px] leading-snug text-ink-subtle">{aberto.impactoNota}</p>
                    )}
                  </div>
                )
              })()}

              {(() => {
                const agente = aberto.agenteId ? getAgente(aberto.agenteId) : undefined
                if (!agente) return null
                return (
                  <div className="mt-4 rounded-card border border-edge/60 bg-navy/40 px-3 py-2.5">
                    <p className="eyebrow">Quem levantou</p>
                    <p className="mt-1 text-sm font-semibold text-ink">{agente.nome}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-ink-subtle">{agente.pergunta}</p>
                  </div>
                )
              })()}

              <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                Dados relacionados
              </p>
              <dl className="mt-2 space-y-2 rounded-card border border-edge/60 bg-navy/40 p-3">
                {detalhesDoAlerta(aberto).map((d) => (
                  <div key={d.rotulo} className="flex items-start justify-between gap-3 text-xs">
                    <dt className="text-ink-subtle">{d.rotulo}</dt>
                    <dd className="tnums text-right font-semibold text-ink">{d.valor}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Link
                  to={aberto.acaoRota}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-xs font-semibold text-navy transition-colors hover:bg-gold-light"
                >
                  {aberto.acaoRotulo}
                  <ChevronRight size={14} aria-hidden="true" />
                </Link>
                {FICHA_DO_ALERTA[aberto.id] && (
                  <button
                    type="button"
                    onClick={() => {
                      const ficha = FICHA_DO_ALERTA[aberto.id]
                      setAberto(null)
                      abrirObjeto(ficha.tipo, ficha.id)
                    }}
                    className="rounded-full border border-edge px-4 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-gold/40 hover:text-ink"
                  >
                    {FICHA_DO_ALERTA[aberto.id].rotulo}
                  </button>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
