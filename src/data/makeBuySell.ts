/**
 * Elo 5 — MAKE / BUY / SELL: a decisão consolidada da cadeia.
 *
 * Cada cenário confronta as 5 alternativas de destino da farinha num moinho ×
 * spec. Nada aqui é digitado: o custo interno vem do motor econômico (que puxa
 * o TLC do trigo do elo 1) e o preço externo vem SEMPRE de uma cotação marcada
 * como apples-to-apples (mesma spec, canal industrial, granel, posto fábrica).
 */
import type { CenarioMakeBuySell, FarinhaId, KpiFarinha, MoinhoId, RegiaoComercial } from './types'
import { MOINHOS } from './dominio'
import {
  FARINHA_ANCORA,
  MOINHO_ANCORA,
  capacidadeOciosaFarinhaT,
  custoInternoFarinha,
  decisaoMakeBuySell,
  ganhoVerticalizacao,
} from './economics'
import { precoExternoComparavel } from './farinha'
import { TLC_RECOMENDADO_RS } from './tlc'

interface EntradaCenario {
  moinhoId: MoinhoId
  farinhaId: FarinhaId
  /** Região da fábrica/mercado que define o preço externo comparável. */
  regiao: RegiaoComercial
  /** Demanda interna de farinha na janela (t/mês). */
  demandaT: number
  /** Preço líquido de venda a terceiros na região (R$/t). */
  vendaLiquidaRsT: number
  custoServirRsT: number
  /** Volume já contratado com terceiros (t/mês). */
  contratadoExternoT: number
}

/**
 * Os 6 cenários da demo. O primeiro é o par-âncora (Fortaleza × massas):
 * custo interno R$ 2.100/t contra R$ 2.350/t do mercado ⇒ verticalizar vale
 * R$ 250/t. Os dois do Sul mostram a tensão inversa — perto da origem do
 * trigo, o mercado bate o custo interno e COMPRAR passa a ser a resposta.
 */
const ENTRADAS: EntradaCenario[] = [
  {
    moinhoId: 'fortaleza',
    farinhaId: 'massa',
    regiao: 'nordeste',
    demandaT: 8000,
    vendaLiquidaRsT: 2500,
    custoServirRsT: 120,
    contratadoExternoT: 1600,
  },
  {
    moinhoId: 'eusebio',
    farinhaId: 'biscoito',
    regiao: 'nordeste',
    demandaT: 9800,
    vendaLiquidaRsT: 2400,
    custoServirRsT: 130,
    contratadoExternoT: 0,
  },
  {
    moinhoId: 'natal',
    farinhaId: 'pao',
    regiao: 'nordeste',
    demandaT: 5200,
    vendaLiquidaRsT: 2620,
    custoServirRsT: 185,
    contratadoExternoT: 900,
  },
  {
    moinhoId: 'cabedelo',
    farinhaId: 'biscoito',
    regiao: 'nordeste',
    demandaT: 3400,
    vendaLiquidaRsT: 2380,
    custoServirRsT: 150,
    contratadoExternoT: 1200,
  },
  {
    moinhoId: 'rolandia',
    farinhaId: 'massa',
    regiao: 'sul',
    demandaT: 6100,
    vendaLiquidaRsT: 2260,
    custoServirRsT: 105,
    contratadoExternoT: 800,
  },
  {
    moinhoId: 'bento-goncalves',
    farinhaId: 'massa',
    regiao: 'sul',
    demandaT: 4200,
    vendaLiquidaRsT: 2240,
    custoServirRsT: 105,
    contratadoExternoT: 0,
  },
]

/**
 * Monta o cenário, ou devolve null quando falta cotação apples-to-apples —
 * um Make/Buy/Sell não pode ser decidido sobre preço não comparável. Devolver
 * null (e não lançar) é deliberado: um throw aqui roda na AVALIAÇÃO DO MÓDULO,
 * antes de o React montar, e derrubaria o app inteiro por causa de uma fixture
 * de preço faltando.
 */
function montarCenario(e: EntradaCenario): CenarioMakeBuySell | null {
  const externo = precoExternoComparavel(e.farinhaId, e.regiao)
  if (!externo) return null
  return decisaoMakeBuySell({
    moinhoId: e.moinhoId,
    farinhaId: e.farinhaId,
    demandaT: e.demandaT,
    precos: {
      externoRsT: externo.precoRsT,
      vendaLiquidaRsT: e.vendaLiquidaRsT,
      custoServirRsT: e.custoServirRsT,
    },
    volumeContratadoExternoT: e.contratadoExternoT,
  })
}

export const CENARIOS_MAKE_BUY_SELL: CenarioMakeBuySell[] = ENTRADAS.map(montarCenario).filter(
  (c): c is CenarioMakeBuySell => c !== null,
)

/** O cenário-âncora da demo: Fortaleza × farinha de massas. */
export const CENARIO_MBS_ANCORA = CENARIOS_MAKE_BUY_SELL[0]

/**
 * Benefício mensal das decisões Make/Buy/Sell (R$): soma o VALOR DA DECISÃO de
 * cada cenário — quanto a recomendada rende a mais que a segunda melhor.
 * Usar `resultadoRs` zeraria os cenários em que 'comprar' vence (a referência
 * vale 0 por definição), justamente onde o hub evita a maior perda.
 *
 * As oportunidades comerciais NÃO entram aqui: a venda externa dos cenários já
 * é contabilizada em `recomendadaCapacidadeOciosa`, e somar as duas contaria a
 * mesma tonelada duas vezes. A margem comercial vive em comercial.ts.
 */
export const BENEFICIO_MAKE_BUY_SELL_RS = CENARIOS_MAKE_BUY_SELL.reduce(
  (soma, c) => soma + c.beneficioVsAlternativaRs,
  0,
)

// ---------------------------------------------------------------------------
// Os 10 KPIs executivos do elo farinha
// ---------------------------------------------------------------------------

const custoAncora = custoInternoFarinha(MOINHO_ANCORA, FARINHA_ANCORA)
const ganhoAncora = ganhoVerticalizacao(MOINHO_ANCORA, FARINHA_ANCORA, {
  regiao: 'nordeste',
  volumeT: CENARIO_MBS_ANCORA.volumeT,
})

/** Utilização média ponderada pela capacidade instalada dos 7 moinhos (%). */
const UTILIZACAO_PONDERADA_PCT =
  Math.round(
    (MOINHOS.reduce((soma, m) => soma + m.capacidadeMensalT * m.utilizacaoPct, 0) /
      MOINHOS.reduce((soma, m) => soma + m.capacidadeMensalT, 0)) *
      10,
  ) / 10

/**
 * Os 10 KPIs do elo farinha — todos DERIVADOS do motor econômico e do cenário
 * de compra. Nenhum é digitado à mão: mexer no TLC do trigo move todos juntos.
 */
export const KPIS_FARINHA: KpiFarinha = {
  custoTrigoPostoRsT: TLC_RECOMENDADO_RS,
  custoFarinhaRsT: custoAncora.totalRsT,
  precoExternoEquivalenteRsT: ganhoAncora.precoExternoRsT,
  ganhoVerticalizacaoRsT: ganhoAncora.ganhoRsT,
  margemVendaExternaRsT:
    Math.round(
      (CENARIO_MBS_ANCORA.precoVendaLiquidoRsT -
        CENARIO_MBS_ANCORA.custoInternoRsT -
        CENARIO_MBS_ANCORA.custoServirRsT) *
        10,
    ) / 10,
  rendimentoPct: custoAncora.rendimentoPct,
  creditoFareloRsT: Math.abs(
    custoAncora.componentes.find((c) => c.tipo === 'credito')!.valorRs,
  ),
  utilizacaoCapacidadePct: UTILIZACAO_PONDERADA_PCT,
  gapInternoMercadoPct:
    Math.round((ganhoAncora.ganhoRsT / ganhoAncora.precoExternoRsT) * 1000) / 10,
  beneficioMakeBuySellRs: BENEFICIO_MAKE_BUY_SELL_RS,
}

/** Capacidade ociosa consolidada de farinha (t/mês) nos 7 moinhos. */
export const CAPACIDADE_OCIOSA_TOTAL_T = MOINHOS.reduce(
  (soma, m) => soma + capacidadeOciosaFarinhaT(m.id, FARINHA_ANCORA),
  0,
)
