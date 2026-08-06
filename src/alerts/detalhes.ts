/**
 * COMO UM ALERTA SE APRESENTA EM DETALHE — categorias, impacto e os "dados
 * relacionados" de cada alerta.
 *
 * Saiu de `pages/Alerts.tsx` quando o detalhe deixou de ser exclusividade da
 * aba: o banner contextual de cada tela abre o MESMO drawer, e um segundo
 * mapa de categorias (ou uma segunda tabela de dados por alerta) seria a
 * divergência esperando para acontecer.
 *
 * Os "dados relacionados" saem todos do snapshot pelas mesmas funções que as
 * telas chamam — nada é digitado aqui.
 */
import {
  DollarSign,
  Factory,
  FlaskConical,
  Package,
  ShieldCheck,
  Ship,
  Sprout,
  Store,
  TrendingUp,
  Wheat,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { colors } from '../theme/tokens'
import {
  ARMAZENAGEM_FARINHA_RS_T,
  snapshot,
  formatBRL,
  formatPct,
  formatTon,
  formatUSD,
  sensibilidadeRendimentoRsT,
  type Alerta,
  type FarinhaId,
  type MoinhoId,
} from '../data'
import { ORCAMENTO_TRIGO_RS_T } from '../data/compra'

type Categoria = Alerta['categoria']

export const fmtCambio = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`

// --- Categorias: ícone em selo colorido (círculo com ícone branco) ---
export const CATEGORIAS: Array<{ id: Categoria; rotulo: string; icone: LucideIcon; cor: string }> = [
  { id: 'mercado', rotulo: 'Mercado', icone: TrendingUp, cor: colors.iconBadge.market },
  { id: 'cambio', rotulo: 'Câmbio', icone: DollarSign, cor: colors.gold.primary },
  { id: 'logistica', rotulo: 'Logística', icone: Ship, cor: colors.iconBadge.logistics },
  { id: 'estoque', rotulo: 'Estoque', icone: Package, cor: colors.iconBadge.weather },
  { id: 'hedge', rotulo: 'Hedge', icone: ShieldCheck, cor: colors.semantic.positive },
  { id: 'qualidade', rotulo: 'Qualidade', icone: FlaskConical, cor: colors.iconBadge.internal },
  // --- Elo farinha → margem ---
  { id: 'safra', rotulo: 'Safra', icone: Sprout, cor: colors.semantic.positive },
  { id: 'moagem', rotulo: 'Moagem', icone: Factory, cor: colors.semantic.cyan },
  { id: 'farinha', rotulo: 'Farinha', icone: Wheat, cor: colors.semantic.violet },
  { id: 'comercial', rotulo: 'Comercial', icone: Store, cor: colors.semantic.info },
]
export const categoriaDe = (id: Categoria) => CATEGORIAS.find((c) => c.id === id)!

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
export function impactoFormatado(a: Alerta): { texto: string; positivo: boolean } | null {
  if (a.impactoRs == null) return null
  // `impactoRs` é magnitude; quem dá a direção é `tipo`. Ler o sinal do número
  // voltaria a espalhar Math.abs por toda superfície que ordena ou soma.
  const positivo = a.tipo === 'oportunidade'
  return {
    texto: `${positivo ? '+' : '−'}${formatBRL(a.impactoRs, { compacto: true })}${ROTULO_BASE[a.impactoBase ?? 'evento']}`,
    positivo,
  }
}

/* A severidade (rótulo, tom, cor) vive em `severidade.ts` — um mapa só para
   sino, Central, faixa crítica, banner e detalhe. */

/**
 * Rótulo do botão que abre a ficha. O QUE abrir vem do próprio alerta
 * (`entidade`) — antes havia um mapa id→objeto aqui, uma segunda verdade que
 * silenciosamente não cobria alertas novos.
 */
export const ROTULO_FICHA: Record<string, string> = {
  navio: 'Ficha do navio',
  moinho: 'Ficha do moinho',
  origem: 'Ficha da origem',
  lote: 'Ficha do lote',
  porto: 'Ficha do porto',
  contrato: 'Ficha do contrato',
  fornecedor: 'Ficha do fornecedor',
  recomendacao: 'Ficha da recomendação',
  oportunidade: 'Ficha da oportunidade',
}


// --- Dados relacionados por alerta (tudo do snapshot) ---
export function detalhesDoAlerta(alerta: Alerta): Array<{ rotulo: string; valor: string }> {
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
        { rotulo: 'Armazenagem', valor: `${formatBRL(ARMAZENAGEM_FARINHA_RS_T)}/t por mês` },
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
