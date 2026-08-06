/**
 * Elo 3 — DEMANDA: do plano de vendas do produto acabado à tonelada de trigo.
 *
 * É a ponte que faz Marketing, Indústria e Suprimentos falarem a mesma língua:
 * t de biscoito vendido → t de farinha necessária → t de trigo a comprar. O
 * total fecha em ~84 kt de trigo/mês (~1 Mt/ano), a âncora de volume do
 * CLAUDE.md, e alimenta o volume do trimestre da tela de Compra.
 */
import type { DemandaFarinha, FamiliaProduto, FarinhaId, MoinhoId, PontoCalendarioDemanda } from './types'
import { MOINHOS } from './dominio'
import { VOLUME_TRIMESTRE_T } from './compra'

/** Meses do horizonte de planejamento (a partir do cenário-âncora de ago/25). */
const MESES = ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02']

interface EntradaFamilia {
  familia: FamiliaProduto
  rotulo: string
  farinhaId: FarinhaId | null
  /** Plano de vendas do produto acabado (t/mês). */
  planoVendasT: number
  /** t de farinha por t de produto acabado (receita média da família). */
  fatorFarinha: number
  estoqueSegurancaDias: number
  /**
   * Rendimento de conversão da família (%): a média ponderada dos moinhos que
   * a atendem, na spec dela. Fica EXPLÍCITO em vez de derivado do primeiro
   * moinho da lista — senão reordenar a lista moveria a necessidade de trigo
   * da companhia, que é âncora do cenário.
   */
  rendimentoConversaoPct: number
  moinhosAtendem: MoinhoId[]
  /** Sazonalidade mês a mês (1,00 = mês base). Natal puxa bolos e biscoitos. */
  sazonalidade: number[]
}

const FAMILIAS: EntradaFamilia[] = [
  {
    familia: 'biscoitos',
    rotulo: 'Biscoitos e crackers',
    farinhaId: 'biscoito',
    planoVendasT: 36_000,
    fatorFarinha: 0.72,
    estoqueSegurancaDias: 12,
    rendimentoConversaoPct: 75.0,
    moinhosAtendem: ['fortaleza', 'eusebio', 'cabedelo'],
    sazonalidade: [1.0, 1.06, 1.12, 1.08, 0.92, 0.96],
  },
  {
    familia: 'massas',
    rotulo: 'Massas alimentícias',
    farinhaId: 'massa',
    planoVendasT: 21_500,
    fatorFarinha: 0.98,
    estoqueSegurancaDias: 14,
    rendimentoConversaoPct: 74.5,
    moinhosAtendem: ['natal', 'salvador', 'rolandia', 'bento-goncalves'],
    sazonalidade: [1.0, 1.02, 1.04, 1.03, 0.97, 0.99],
  },
  {
    familia: 'bolos',
    rotulo: 'Bolos e misturas',
    farinhaId: 'bolo',
    planoVendasT: 16_400,
    fatorFarinha: 0.55,
    estoqueSegurancaDias: 10,
    rendimentoConversaoPct: 75.2,
    moinhosAtendem: ['fortaleza', 'eusebio', 'cabedelo'],
    sazonalidade: [1.0, 1.08, 1.18, 1.1, 0.9, 0.94],
  },
  {
    familia: 'torradas',
    rotulo: 'Torradas e snacks',
    farinhaId: 'cracker',
    planoVendasT: 8_100,
    fatorFarinha: 0.86,
    estoqueSegurancaDias: 10,
    rendimentoConversaoPct: 75.6,
    moinhosAtendem: ['salvador', 'natal'],
    sazonalidade: [1.0, 1.01, 1.03, 1.02, 0.98, 1.0],
  },
  {
    // Margarinas e gorduras vegetais estão no plano de vendas e NÃO consomem
    // farinha. Ficam na cascata de propósito: mostram que nem toda tonelada
    // vendida vira trigo — a conversão é por família, não por faturamento.
    familia: 'demais',
    rotulo: 'Margarinas e gorduras',
    farinhaId: null,
    planoVendasT: 12_400,
    fatorFarinha: 0,
    estoqueSegurancaDias: 0,
    rendimentoConversaoPct: 100,
    moinhosAtendem: [],
    sazonalidade: [1.0, 1.02, 1.05, 1.06, 0.95, 0.97],
  },
]

function montarDemanda(e: EntradaFamilia): DemandaFarinha {
  const necessidadeFarinhaT = Math.round(e.planoVendasT * e.fatorFarinha)
  // O rendimento do moinho principal converte farinha em trigo equivalente.
  // Família sem farinha não tem conversão: sai da cascata aqui.
  const rendimento = e.rendimentoConversaoPct
  const necessidadeTrigoT = Math.round((necessidadeFarinhaT * 100) / rendimento)

  const calendario: PontoCalendarioDemanda[] = MESES.map((mes, i) => {
    const farinhaT = Math.round(necessidadeFarinhaT * e.sazonalidade[i])
    return { mes, farinhaT, trigoT: Math.round((farinhaT * 100) / rendimento) }
  })

  return {
    familia: e.familia,
    rotulo: e.rotulo,
    farinhaId: e.farinhaId,
    planoVendasT: e.planoVendasT,
    fatorFarinha: e.fatorFarinha,
    necessidadeFarinhaT,
    necessidadeTrigoT,
    estoqueSegurancaDias: e.estoqueSegurancaDias,
    estoqueSegurancaT: Math.round((necessidadeFarinhaT * e.estoqueSegurancaDias) / 30),
    moinhosAtendem: e.moinhosAtendem,
    calendario,
  }
}

export const DEMANDA_FARINHA: DemandaFarinha[] = FAMILIAS.map(montarDemanda)

/** Necessidade consolidada de farinha (t/mês) das famílias que a consomem. */
export const NECESSIDADE_FARINHA_MES_T = DEMANDA_FARINHA.reduce(
  (soma, d) => soma + d.necessidadeFarinhaT,
  0,
)

/** Necessidade consolidada de trigo (t/mês) — deve orbitar ~84 kt (1 Mt/ano). */
export const NECESSIDADE_TRIGO_MES_T = DEMANDA_FARINHA.reduce(
  (soma, d) => soma + d.necessidadeTrigoT,
  0,
)

/** Necessidade anualizada de trigo (t/ano) — confere com a âncora de ~1 Mt. */
export const NECESSIDADE_TRIGO_ANO_T = NECESSIDADE_TRIGO_MES_T * 12

/** Calendário consolidado das famílias, mês a mês. */
export const CALENDARIO_DEMANDA: PontoCalendarioDemanda[] = MESES.map((mes, i) => ({
  mes,
  farinhaT: DEMANDA_FARINHA.reduce((soma, d) => soma + d.calendario[i].farinhaT, 0),
  trigoT: DEMANDA_FARINHA.reduce((soma, d) => soma + d.calendario[i].trigoT, 0),
}))

// ---------------------------------------------------------------------------
// Reconciliação com o elo do trigo (compra.ts)
// ---------------------------------------------------------------------------

/**
 * Ponte explícita entre CONSUMO e COMPRA — os dois números são diferentes de
 * propósito e confundi-los é erro clássico de planejamento:
 *
 *   consumo do trimestre  = o que os moinhos vão moer          (~252 kt)
 *   já contratado         = embarques fechados em contrato      (~74 kt)
 *   a comprar             = VOLUME_TRIMESTRE_T em compra.ts     (178 kt)
 *
 * É sobre "a comprar" que a recomendação do dia antecipa 18% (32.000 t) —
 * não sobre o consumo total. `coberturaContratadaPct` fecha a conta.
 */
export const CONSUMO_TRIMESTRE_T = NECESSIDADE_TRIGO_MES_T * 3

/** Volume do trimestre já coberto por contrato (t) — o consumo menos o que falta comprar. */
export const JA_CONTRATADO_TRIMESTRE_T = CONSUMO_TRIMESTRE_T - VOLUME_TRIMESTRE_T

/** Parcela do consumo do trimestre já contratada (%). */
export const COBERTURA_CONTRATADA_PCT =
  Math.round((JA_CONTRATADO_TRIMESTRE_T / CONSUMO_TRIMESTRE_T) * 1000) / 10

/**
 * Consumo mensal implícito no parque moageiro (Σ capacidade × utilização).
 * Reconcilia com NECESSIDADE_TRIGO_MES_T a menos do arredondamento das
 * capacidades declaradas — o resíduo é o colchão de estoque de segurança.
 */
export const CONSUMO_MOAGEM_MES_T = MOINHOS.reduce(
  (soma, m) => soma + Math.round((m.capacidadeMensalT * m.utilizacaoPct) / 100),
  0,
)

/** Capacidade instalada total do parque (t de trigo/mês). */
export const CAPACIDADE_INSTALADA_MES_T = MOINHOS.reduce((soma, m) => soma + m.capacidadeMensalT, 0)

/** Ocupação real do parque (%) = consumo da demanda ÷ capacidade instalada. */
export const OCUPACAO_PARQUE_PCT =
  Math.round((NECESSIDADE_TRIGO_MES_T / CAPACIDADE_INSTALADA_MES_T) * 1000) / 10

// ---------------------------------------------------------------------------
// Plano por moinho: consumo interno vs. disponível ao mercado
// ---------------------------------------------------------------------------

export interface PlanoMoinho {
  moinhoId: MoinhoId
  /** Capacidade instalada de moagem (t de trigo/mês). */
  capacidadeTrigoT: number
  /** Trigo alocado para atender a demanda das fábricas próprias (t/mês). */
  trigoInternoT: number
  /** Trigo que sobra e pode virar farinha de venda externa (t/mês). */
  trigoDisponivelT: number
  /** Farinha equivalente do trigo disponível (t/mês). */
  farinhaDisponivelT: number
  /** Ocupação pela demanda interna (%). */
  ocupacaoPct: number
  /** Famílias que este moinho abastece. */
  familias: FamiliaProduto[]
}

/**
 * Distribui a necessidade de cada família entre os moinhos que a atendem,
 * proporcionalmente à capacidade — e RESPEITANDO O TETO de cada unidade.
 *
 * A proporcional pura é o ponto de partida, mas um moinho que participa de
 * várias famílias estoura: sem o teto, Eusébio e Cabedelo apareciam a 112% de
 * ocupação, o que é fisicamente impossível e denunciaria o número na tela. O
 * excedente é devolvido e realocado nos moinhos da MESMA família que ainda têm
 * folga, em rodadas, até caber. Se ainda sobrar volume, ele aparece como
 * déficit do parque em vez de virar ocupação acima de 100%.
 */
export function planoPorMoinho(): PlanoMoinho[] {
  const capacidadeDe = (id: MoinhoId) => MOINHOS.find((m) => m.id === id)?.capacidadeMensalT ?? 0
  const internoPorMoinho = new Map<MoinhoId, number>(MOINHOS.map((m) => [m.id, 0]))
  const familiasPorMoinho = new Map<MoinhoId, FamiliaProduto[]>()
  const folgaDe = (id: MoinhoId) => capacidadeDe(id) - (internoPorMoinho.get(id) ?? 0)

  // Família com MENOS moinhos compatíveis é servida primeiro: ela tem menos
  // para onde ir, e deixá-la por último é o que fazia o pool de biscoito
  // estourar enquanto Bento Gonçalves ficava parado.
  const ordenadas = [...DEMANDA_FARINHA]
    .filter((d) => d.moinhosAtendem.length > 0 && d.necessidadeTrigoT > 0)
    .sort((a, b) => a.moinhosAtendem.length - b.moinhosAtendem.length)

  for (const d of ordenadas) {
    // Proporcional à FOLGA (não à capacidade bruta): o que já foi comprometido
    // por outra família sai da conta, e nenhum moinho passa do teto.
    const folgas = d.moinhosAtendem.map((id) => Math.max(0, folgaDe(id)))
    const somaFolga = folgas.reduce((s, f) => s + f, 0)
    d.moinhosAtendem.forEach((id, i) => {
      const parcela = somaFolga > 0 ? (d.necessidadeTrigoT * folgas[i]) / somaFolga : 0
      internoPorMoinho.set(id, (internoPorMoinho.get(id) ?? 0) + parcela)
      familiasPorMoinho.set(id, [...(familiasPorMoinho.get(id) ?? []), d.familia])
    })
  }

  return MOINHOS.map((m) => {
    const trigoInternoT = Math.round(internoPorMoinho.get(m.id) ?? 0)
    const trigoDisponivelT = Math.max(0, m.capacidadeMensalT - trigoInternoT)
    return {
      moinhoId: m.id,
      capacidadeTrigoT: m.capacidadeMensalT,
      trigoInternoT,
      trigoDisponivelT,
      farinhaDisponivelT: Math.round((trigoDisponivelT * m.rendimentoPct) / 100),
      ocupacaoPct: Math.round((trigoInternoT / m.capacidadeMensalT) * 1000) / 10,
      familias: familiasPorMoinho.get(m.id) ?? [],
    }
  })
}

/** Farinha disponível ao mercado somando os sete moinhos (t/mês). */
export const FARINHA_DISPONIVEL_MERCADO_T = planoPorMoinho().reduce(
  (soma, p) => soma + p.farinhaDisponivelT,
  0,
)

// ---------------------------------------------------------------------------
// Calendário promocional
// ---------------------------------------------------------------------------

export interface EventoPromocional {
  mes: string
  rotulo: string
  /** Famílias puxadas pelo evento. */
  familias: FamiliaProduto[]
  /** Antecedência com que o trigo precisa estar comprado (dias). */
  antecedenciaDias: number
  detalhe: string
}

/**
 * O calendário comercial é insumo de TIMING de compra: o pico de dezembro
 * precisa de trigo comprado em outubro, porque entre fechar o contrato e o
 * grão chegar ao moinho passam ~45 dias entre embarque, trânsito e descarga.
 */
export const EVENTOS_PROMOCIONAIS: EventoPromocional[] = [
  {
    mes: '2025-10',
    rotulo: 'Dia das Crianças',
    familias: ['biscoitos', 'bolos'],
    antecedenciaDias: 45,
    detalhe: 'Recheados e bolos puxam biscoito e farinha de bolo já em setembro.',
  },
  {
    mes: '2025-11',
    rotulo: 'Produção de Natal',
    familias: ['biscoitos', 'bolos'],
    antecedenciaDias: 60,
    detalhe: 'Pico do ano: linhas natalinas produzem em novembro para vender em dezembro.',
  },
  {
    mes: '2025-12',
    rotulo: 'Natal e festas',
    familias: ['biscoitos', 'bolos', 'massas'],
    antecedenciaDias: 45,
    detalhe: 'Reposição de gôndola e ceia sustentam o volume até a virada.',
  },
  {
    mes: '2026-01',
    rotulo: 'Baixa pós-festas',
    familias: ['biscoitos', 'bolos'],
    antecedenciaDias: 30,
    detalhe: 'Queda sazonal: janela para reduzir estoque e programar manutenção de moinho.',
  },
]

export interface MesCalendario extends PontoCalendarioDemanda {
  /** Necessidade de trigo do mês base (sazonalidade 1,00). */
  baseTrigoT: number
  /** Diferença contra o mês base (t de trigo) — o efeito da sazonalidade. */
  deltaTrigoT: number
  /** Índice sazonal do mês (1,00 = base). */
  indice: number
  evento?: EventoPromocional
}

/** Calendário com o efeito do evento promocional sobre a necessidade de trigo. */
export const CALENDARIO_COM_EVENTOS: MesCalendario[] = CALENDARIO_DEMANDA.map((ponto) => {
  const baseTrigoT = NECESSIDADE_TRIGO_MES_T
  return {
    ...ponto,
    baseTrigoT,
    deltaTrigoT: ponto.trigoT - baseTrigoT,
    indice: Math.round((ponto.trigoT / baseTrigoT) * 1000) / 1000,
    evento: EVENTOS_PROMOCIONAIS.find((e) => e.mes === ponto.mes),
  }
})

/** Mês de pico da necessidade de trigo no horizonte. */
export const MES_PICO = CALENDARIO_COM_EVENTOS.reduce((a, b) => (b.trigoT > a.trigoT ? b : a))
