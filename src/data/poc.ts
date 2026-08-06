/**
 * MODO POC — o piloto de 90 dias, com escopo deliberadamente pequeno.
 *
 * A pergunta que o POC responde não é "o hub funciona?", e sim: **com os dados
 * que a empresa JÁ TINHA, quanto valor passou pela mesa sem ser visto?** Por
 * isso tudo aqui é reconstrução histórica: seis meses fechados, o custo real da
 * farinha mês a mês, o que teria custado comprar, qual seria a margem de venda,
 * qual decisão teria maximizado o resultado e quanto disso era capturável.
 *
 * REGRA DE HONESTIDADE que governa este arquivo: o resultado ex-post é um TETO,
 * não uma promessa. Escolher em março o melhor mês de junho é visão perfeita —
 * e visão perfeita não existe. Por isso todo valor aparece em duas colunas: o
 * teto ex-post e a captura realista com o mesmo haircut de 15–20% que o VRO
 * aplica. Vender o teto como meta é o erro que mata um piloto no segundo mês.
 *
 * ÂNCORA: a série de câmbio e FOB termina exatamente no cenário de hoje, então
 * o último mês do POC reproduz os números canônicos (TLC R$ 1.473,4/t de regime
 * em Fortaleza, custo interno R$ 2.100/t na farinha de massas). Isso é
 * verificado em tempo de módulo — se divergir, o próprio motor acusa.
 */
import type { FarinhaId, MoinhoId, OrigemId, RegiaoComercial } from './types'
import { ECONOMIA_MOAGEM, getMoinho } from './dominio'
import { getFarinha, precoExternoComparavel } from './farinha'
import { capacidadeFarinhaT, custoInternoFarinha, rendimentoEfetivoPct } from './economics'
import { decomposicaoCambialDoTlc } from './simuladorMbs'
import { SERIES_FARINHA_MERCADO } from './mercadoFarinha'
import { CENARIO_MBS_ANCORA } from './makeBuySell'

// ---------------------------------------------------------------------------
// Escopo do piloto
// ---------------------------------------------------------------------------

export interface FabricaPoc {
  id: string
  nome: string
  cidade: string
  farinhaId: FarinhaId
  /** Consumo de farinha da fábrica (t/mês). */
  consumoT: number
}

export const MOINHO_POC: MoinhoId = 'fortaleza'

/** As duas specs que Fortaleza realmente roda — o piloto não simula produto. */
export const FARINHAS_POC: FarinhaId[] = ['massa', 'biscoito']

/** Onde o piloto vende: a região da fábrica e uma vizinha de expansão. */
export const REGIOES_POC: RegiaoComercial[] = ['nordeste', 'norte']

/** Origens no escopo: as duas do blend recomendado + a doméstica de contraste. */
export const ORIGENS_POC: OrigemId[] = ['argentina', 'eua-golfo', 'brasil']

/**
 * As duas fábricas atendidas. O consumo de massas é o mesmo do cenário-âncora
 * (8.000 t/mês); o de biscoitos completa a produção real de Fortaleza, para que
 * o piloto não invente volume que o moinho não tem.
 */
const producaoRealT = Math.round(
  (capacidadeFarinhaT(MOINHO_POC, 'massa') * (getMoinho(MOINHO_POC)?.utilizacaoPct ?? 0)) / 100,
)
const consumoMassaT = CENARIO_MBS_ANCORA.volumeT

export const FABRICAS_POC: FabricaPoc[] = [
  {
    id: 'fab-massas-ce',
    nome: 'Fábrica de massas — Eusébio',
    cidade: 'Eusébio/CE',
    farinhaId: 'massa',
    consumoT: consumoMassaT,
  },
  {
    id: 'fab-biscoitos-ce',
    nome: 'Fábrica de biscoitos — Maracanaú',
    cidade: 'Maracanaú/CE',
    farinhaId: 'biscoito',
    consumoT: producaoRealT - consumoMassaT,
  },
]

/** Folga do moinho depois de atendidas as duas fábricas (t de farinha/mês). */
export const FOLGA_POC_T = capacidadeFarinhaT(MOINHO_POC, 'massa') - producaoRealT

// ---------------------------------------------------------------------------
// Reconstrução do custo real, mês a mês
// ---------------------------------------------------------------------------

/**
 * Câmbio e FOB dos seis meses fechados. A série termina em R$ 5,20 e fator 1,00
 * — isto é, no cenário de hoje —, o que faz o último mês do POC coincidir com
 * os números canônicos por construção, e não por coincidência.
 */
interface MesPoc {
  mes: string
  rotulo: string
  cambio: number
  /** Fator sobre o FOB base (1,00 = FOB de hoje). */
  fatorFob: number
  nota: string
}

const MESES_POC: MesPoc[] = [
  { mes: '2025-03', rotulo: 'mar/25', cambio: 5.05, fatorFob: 1.0, nota: 'Câmbio baixo e FOB estável: a janela mais barata do semestre.' },
  { mes: '2025-04', rotulo: 'abr/25', cambio: 5.12, fatorFob: 1.02, nota: 'Prêmio argentino começa a subir com a exportação aquecida.' },
  { mes: '2025-05', rotulo: 'mai/25', cambio: 5.19, fatorFob: 1.05, nota: 'Pico do semestre: câmbio e prêmio subindo juntos.' },
  { mes: '2025-06', rotulo: 'jun/25', cambio: 5.24, fatorFob: 1.03, nota: 'Câmbio no topo, prêmio cedendo com a colheita do Hemisfério Norte.' },
  { mes: '2025-07', rotulo: 'jul/25', cambio: 5.18, fatorFob: 1.01, nota: 'Alívio parcial nas duas pontas.' },
  { mes: '2025-08', rotulo: 'ago/25', cambio: 5.2, fatorFob: 1.0, nota: 'Mês corrente — o cenário que as demais telas mostram.' },
]

const decomp = decomposicaoCambialDoTlc(MOINHO_POC)

/**
 * Parcela do custo da farinha que NÃO depende do trigo (conversão, energia,
 * perdas, depreciação, menos o crédito do farelo), por spec. Sai da própria
 * decomposição do motor: `total − (linha do trigo + linha da logística)`.
 * Derivar em vez de digitar é o que garante que mexer no motor mova o POC.
 */
function fixoDaFarinhaRsT(farinhaId: FarinhaId): number {
  const c = custoInternoFarinha(MOINHO_POC, farinhaId)
  const trigoELogistica = c.componentes
    .filter((x) => x.tipo === 'trigo' || x.tipo === 'logistica')
    .reduce((s, x) => s + x.valorRs, 0)
  return c.totalRsT - trigoELogistica
}

/** TLC do trigo posto no moinho (R$/t de TRIGO) no câmbio e FOB do mês. */
function tlcNoMes(m: MesPoc, farinhaId: FarinhaId): number {
  const premio = getFarinha(farinhaId)?.premioBlendRsT ?? 0
  return decomp.usdPorT * m.fatorFob * m.cambio + decomp.brlFixoRsT + premio
}

const arred1 = (v: number) => Math.round(v * 10) / 10

/** Custo interno REAL da farinha naquele mês (R$/t de farinha). */
function custoNoMes(m: MesPoc, farinhaId: FarinhaId): number {
  const rend = rendimentoEfetivoPct(MOINHO_POC, farinhaId) / 100
  return arred1(tlcNoMes(m, farinhaId) / rend + fixoDaFarinhaRsT(farinhaId))
}

/** Preço externo comparável do mês — vem da MESMA série da tela de Mercado. */
function externoNoMes(indice: number, farinhaId: FarinhaId): number {
  const serie = SERIES_FARINHA_MERCADO.find(
    (s) => s.farinhaId === farinhaId && s.regiao === 'nordeste',
  )
  return serie ? serie.historicoRsT[indice] : 0
}

/**
 * Spread contratual: quanto a venda negociada fica acima da cotação genérica.
 * Fixado pelo cenário de hoje (venda líquida R$ 2.500/t contra cotação de
 * R$ 2.350/t em massas) e mantido constante ao longo do histórico — variá-lo
 * mês a mês seria inventar negociação que não aconteceu.
 */
const spreadContratualRsT: Record<string, number> = {
  massa: CENARIO_MBS_ANCORA.precoVendaLiquidoRsT - CENARIO_MBS_ANCORA.precoExternoRsT,
  biscoito: 115,
}

// ---------------------------------------------------------------------------
// A decisão de cada mês: o que se fez × o que teria sido melhor
// ---------------------------------------------------------------------------

export type DecisaoPoc = 'produzir-consumir' | 'comprar' | 'produzir-vender'

export const ROTULO_DECISAO_POC: Record<DecisaoPoc, string> = {
  'produzir-consumir': 'Produzir e consumir',
  comprar: 'Comprar de terceiros',
  'produzir-vender': 'Produzir e vender a folga',
}

export interface LinhaPoc {
  mes: string
  rotulo: string
  farinhaId: FarinhaId
  cambio: number
  /** TLC do trigo posto no moinho naquele mês (R$/t de trigo). */
  tlcTrigoRsT: number
  /** Custo interno REAL da farinha no mês (R$/t de farinha). */
  custoRealRsT: number
  /** O custo que o sistema contábil reportava — um padrão anual, fixo. */
  custoPadraoRsT: number
  /** Erro do custo-padrão contra o real (R$/t; positivo = padrão otimista). */
  erroPadraoRsT: number
  /** O que teria custado comprar a mesma spec no mercado (R$/t). */
  compraExternaRsT: number
  /** Preço líquido de venda contratada (R$/t). */
  vendaLiquidaRsT: number
  /** Ganho de produzir para consumo próprio (R$/t) = externo − custo real. */
  ganhoProduzirRsT: number
  /** Margem de vender a folga (R$/t) = venda − custo real − custo de servir. */
  margemVenderRsT: number
  /** Volume consumido pelas fábricas no mês (t de farinha). */
  volumeInternoT: number
  /** Folga do moinho no mês (t de farinha). */
  folgaT: number
  /** Decisão efetivamente tomada — sem o hub, moía-se e não se vendia a folga. */
  decisaoTomada: DecisaoPoc
  /** A decisão que teria maximizado o resultado do mês. */
  decisaoOtima: DecisaoPoc
  /** Resultado do que foi feito (R$). */
  resultadoTomadoRs: number
  /** Resultado da decisão ótima (R$). */
  resultadoOtimoRs: number
  /** Valor deixado na mesa (R$) — teto ex-post. */
  deixadoNaMesaRs: number
  /** Parte que veio de errar a decisão da DEMANDA (produzir vs comprar). */
  deixadoNaDemandaRs: number
  /** Parte que veio de deixar a FOLGA parada. */
  deixadoNaFolgaRs: number
  nota: string
}

/**
 * Custo-padrão do piloto: a média dos seis meses, arredondada — que é
 * exatamente como um custo-padrão anual se comporta na prática. Ele não está
 * "errado" em média; está errado em TODO mês, e é essa a descoberta do POC.
 */
function custoPadraoDe(farinhaId: FarinhaId): number {
  const media = MESES_POC.reduce((s, m) => s + custoNoMes(m, farinhaId), 0) / MESES_POC.length
  return Math.round(media / 5) * 5
}

export const CUSTO_PADRAO_POC: Record<string, number> = {
  massa: custoPadraoDe('massa'),
  biscoito: custoPadraoDe('biscoito'),
}

const custoServirRsT = ECONOMIA_MOAGEM.custoServirRsT

function montarLinha(m: MesPoc, indice: number, farinhaId: FarinhaId): LinhaPoc {
  const fabrica = FABRICAS_POC.find((f) => f.farinhaId === farinhaId)!
  const custoRealRsT = custoNoMes(m, farinhaId)
  const compraExternaRsT = externoNoMes(indice, farinhaId)
  const vendaLiquidaRsT = compraExternaRsT + (spreadContratualRsT[farinhaId] ?? 0)
  const ganhoProduzirRsT = arred1(compraExternaRsT - custoRealRsT)
  const margemVenderRsT = arred1(vendaLiquidaRsT - custoRealRsT - custoServirRsT)

  /**
   * A folga é rateada entre as duas specs na proporção do consumo — o moinho é
   * um só e a capacidade ociosa não pertence a nenhuma delas isoladamente.
   */
  const consumoTotal = FABRICAS_POC.reduce((s, f) => s + f.consumoT, 0)
  const folgaT = Math.round((FOLGA_POC_T * fabrica.consumoT) / consumoTotal)

  /**
   * O que se fez sem o hub: moer para as fábricas e deixar a folga parada.
   * Não é caricatura — é o comportamento padrão de quem não tem o custo real
   * por moinho × spec e, por isso, não sabe se a venda externa dá margem.
   */
  const resultadoTomadoRs = Math.round(ganhoProduzirRsT * fabrica.consumoT)

  /**
   * A ótima ex-post. Para a demanda das fábricas: produzir quando o ganho é
   * positivo, comprar quando é negativo. Para a folga: vender quando a margem
   * é positiva. As duas coisas somam porque são tonelagens diferentes — é a
   * mesma separação que o Make/Buy/Sell faz.
   */
  const melhorDemandaRs = Math.round(Math.max(ganhoProduzirRsT, 0) * fabrica.consumoT)
  const melhorFolgaRs = Math.round(Math.max(margemVenderRsT, 0) * folgaT)
  const resultadoOtimoRs = melhorDemandaRs + melhorFolgaRs

  const decisaoOtima: DecisaoPoc =
    ganhoProduzirRsT < 0 ? 'comprar' : melhorFolgaRs > 0 ? 'produzir-vender' : 'produzir-consumir'

  const erroPadraoRsT = arred1(custoRealRsT - CUSTO_PADRAO_POC[farinhaId])

  return {
    mes: m.mes,
    rotulo: m.rotulo,
    farinhaId,
    cambio: m.cambio,
    tlcTrigoRsT: arred1(tlcNoMes(m, farinhaId)),
    custoRealRsT,
    custoPadraoRsT: CUSTO_PADRAO_POC[farinhaId],
    erroPadraoRsT,
    compraExternaRsT,
    vendaLiquidaRsT,
    ganhoProduzirRsT,
    margemVenderRsT,
    volumeInternoT: fabrica.consumoT,
    folgaT,
    decisaoTomada: 'produzir-consumir',
    decisaoOtima,
    resultadoTomadoRs,
    resultadoOtimoRs,
    deixadoNaMesaRs: resultadoOtimoRs - resultadoTomadoRs,
    deixadoNaDemandaRs: melhorDemandaRs - resultadoTomadoRs,
    deixadoNaFolgaRs: melhorFolgaRs,
    nota: m.nota,
  }
}

export const LINHAS_POC: LinhaPoc[] = MESES_POC.flatMap((m, i) =>
  FARINHAS_POC.map((f) => montarLinha(m, i, f)),
)

/** Só a spec-âncora, para a leitura mês a mês sem duplicar linhas. */
export const LINHAS_POC_MASSA = LINHAS_POC.filter((l) => l.farinhaId === 'massa')

// ---------------------------------------------------------------------------
// Consolidado do piloto
// ---------------------------------------------------------------------------

/**
 * Haircut do VRO. O teto ex-post supõe visão perfeita — escolher em março o
 * melhor mês de junho. A captura realista desconta isso, e é o número que vale
 * levar para o business case.
 */
export const HAIRCUT_POC = 0.2

// --- Terceira alavanca: o TIMING da compra do trigo ---

/**
 * Aplica a REGRA DO PRODUTO (antecipar 18% do trimestre na janela) ao histórico,
 * em vez de comprar no mínimo ex-post. A diferença importa: escolher o menor TLC
 * do semestre inteiro é adivinhação; escolher o menor entre os dois primeiros
 * meses do trimestre é uma decisão que o comprador podia ter tomado com a
 * informação da época. O número fica menor — e defensável.
 */
export interface TrimestrePoc {
  rotulo: string
  meses: string[]
  /** TLC médio pago comprando de forma uniforme (R$/t). */
  tlcUniformeRsT: number
  /** TLC do mês escolhido pela regra (R$/t). */
  tlcAntecipadoRsT: number
  mesEscolhido: string
  /** Volume de trigo do trimestre no piloto (t). */
  volumeTrimestreT: number
  /** Os 18% antecipados (t). */
  volumeAntecipadoT: number
  economiaRs: number
}

/** Trigo consumido pelo piloto por mês (t) = farinha produzida ÷ rendimento. */
const TRIGO_MES_POC = Math.round(producaoRealT / (rendimentoEfetivoPct(MOINHO_POC, 'massa') / 100))

/** A mesma fração de antecipação que a Recomendação de Compra usa. */
const ANTECIPACAO_PCT = 18

function montarTrimestre(rotulo: string, indices: number[]): TrimestrePoc {
  const meses = indices.map((i) => MESES_POC[i])
  const tlcs = meses.map((m) => tlcNoMes(m, 'massa'))
  const tlcUniformeRsT = arred1(tlcs.reduce((s, v) => s + v, 0) / tlcs.length)
  // Janela de decisão: só os DOIS primeiros meses do trimestre estão ao alcance
  // de quem decide no começo dele. O terceiro é informação que ainda não existe.
  const janela = tlcs.slice(0, 2)
  const melhorIdx = janela.indexOf(Math.min(...janela))
  const volumeTrimestreT = TRIGO_MES_POC * meses.length
  const volumeAntecipadoT = Math.round((volumeTrimestreT * ANTECIPACAO_PCT) / 100)
  const tlcAntecipadoRsT = arred1(janela[melhorIdx])
  return {
    rotulo,
    meses: meses.map((m) => m.rotulo),
    tlcUniformeRsT,
    tlcAntecipadoRsT,
    mesEscolhido: meses[melhorIdx].rotulo,
    volumeTrimestreT,
    volumeAntecipadoT,
    economiaRs: Math.round((tlcUniformeRsT - tlcAntecipadoRsT) * volumeAntecipadoT),
  }
}

export const TRIMESTRES_POC: TrimestrePoc[] = [
  montarTrimestre('1º trimestre do piloto', [0, 1, 2]),
  montarTrimestre('2º trimestre do piloto', [3, 4, 5]),
]

const economiaTimingRs = TRIMESTRES_POC.reduce((s, t) => s + t.economiaRs, 0)

export interface ResumoPoc {
  mesesReconstruidos: number
  /** Amplitude do custo real no período (R$/t) — o tamanho da cegueira. */
  amplitudeCustoRsT: number
  custoMinRsT: number
  custoMaxRsT: number
  /** Maior erro do custo-padrão em um mês (R$/t, valor absoluto). */
  maiorErroPadraoRsT: number
  /** Valor por alavanca (teto ex-post, R$). */
  porAlavancaRs: { demanda: number; folga: number; timing: number }
  /** Teto ex-post do valor deixado na mesa no período (R$). */
  tetoExPostRs: number
  /** Captura realista (teto − haircut). */
  capturaRealistaRs: number
  /** Projeção anual da captura realista (R$/ano). */
  runRateAnualRs: number
  /** Extrapolação para os 7 moinhos — ordem de grandeza, não promessa. */
  extrapolacaoParqueRs: number
  /** Meses em que a decisão da DEMANDA teria mudado (produzir → comprar). */
  mesesComDemandaDiferente: number
  /** Meses em que a folga ficou parada valendo dinheiro. */
  mesesComFolgaParada: number
}

const custosMassa = LINHAS_POC_MASSA.map((l) => l.custoRealRsT)
const valorDemandaRs = LINHAS_POC.reduce((s, l) => s + l.deixadoNaDemandaRs, 0)
const valorFolgaRs = LINHAS_POC.reduce((s, l) => s + l.deixadoNaFolgaRs, 0)
const tetoExPostRs = valorDemandaRs + valorFolgaRs + economiaTimingRs
const capturaRealistaRs = Math.round(tetoExPostRs * (1 - HAIRCUT_POC))
const runRateAnualRs = Math.round((capturaRealistaRs * 12) / MESES_POC.length)

export const RESUMO_POC: ResumoPoc = {
  mesesReconstruidos: MESES_POC.length,
  amplitudeCustoRsT: arred1(Math.max(...custosMassa) - Math.min(...custosMassa)),
  custoMinRsT: Math.min(...custosMassa),
  custoMaxRsT: Math.max(...custosMassa),
  maiorErroPadraoRsT: arred1(Math.max(...LINHAS_POC.map((l) => Math.abs(l.erroPadraoRsT)))),
  porAlavancaRs: { demanda: valorDemandaRs, folga: valorFolgaRs, timing: economiaTimingRs },
  tetoExPostRs,
  capturaRealistaRs,
  runRateAnualRs,
  extrapolacaoParqueRs: runRateAnualRs * 7,
  mesesComDemandaDiferente: LINHAS_POC_MASSA.filter((l) => l.deixadoNaDemandaRs > 0).length,
  mesesComFolgaParada: LINHAS_POC_MASSA.filter((l) => l.deixadoNaFolgaRs > 0).length,
}

/**
 * Verificação de âncora em tempo de módulo: o último mês do POC TEM de
 * reproduzir o custo canônico da spec-âncora. Se a série de câmbio/FOB for
 * mexida sem re-ancorar a ponta, isto aparece no console em vez de virar uma
 * divergência silenciosa entre o POC e as outras telas.
 */
const ultimoMassa = LINHAS_POC_MASSA[LINHAS_POC_MASSA.length - 1]
const custoCanonico = custoInternoFarinha(MOINHO_POC, 'massa').totalRsT
if (Math.abs(ultimoMassa.custoRealRsT - custoCanonico) > 0.5 && import.meta.env?.DEV) {
  console.warn(
    `[POC] âncora fora: último mês ${ultimoMassa.custoRealRsT} vs canônico ${custoCanonico}. ` +
      'Re-ancore MESES_POC na ponta antes de confiar nos números do piloto.',
  )
}

/** O quanto o piloto é menor que o parque — o argumento de "começar pequeno". */
export const PROPORCAO_POC = {
  moinhos: `1 de 7`,
  farinhas: `${FARINHAS_POC.length} de 6`,
  regioes: `${REGIOES_POC.length} de 6`,
  origens: `${ORIGENS_POC.length} de 6`,
  fabricas: `${FABRICAS_POC.length}`,
}

/** Preço externo comparável de hoje, por spec do piloto (para o cabeçalho). */
export const PRECOS_HOJE_POC = FARINHAS_POC.map((f) => ({
  farinhaId: f,
  precoRsT: precoExternoComparavel(f, 'nordeste')?.precoRsT ?? 0,
  custoRsT: custoInternoFarinha(MOINHO_POC, f).totalRsT,
}))
