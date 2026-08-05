/**
 * MOTOR ECONÔMICO da cadeia trigo → farinha → margem.
 *
 * Funções determinísticas e mockadas (sem backend) que respondem à pergunta
 * Make/Buy/Sell. Todas partem dos MESMOS números do elo do trigo: o custo do
 * trigo posto no moinho vem do motor de TLC já existente (calcularTlcMock), de
 * modo que mudar o cenário de compra move o custo da farinha e a margem junto —
 * é a "verdade única" atravessando os três elos.
 *
 * Convenções: valores em R$ por tonelada de FARINHA, salvo quando o nome diz
 * "Trigo". Arredondamento a 1 casa, como no motor de TLC.
 */
import type {
  AlternativaMbs,
  CenarioMakeBuySell,
  ComponenteCustoFarinha,
  CustoInternoFarinha,
  EficienciaMoinho,
  FarinhaId,
  MoinhoId,
  RegiaoComercial,
  ResultadoAlternativaMbs,
  SemaforoMoinho,
} from './types'
import { ECONOMIA_MOAGEM, MOINHOS, creditoFareloRsT, getMoinho, getPorto, regiaoDoMoinho } from './dominio'
import { getFarinha, precoExternoComparavel } from './farinha'
import { calcularTlcMock } from './tlc'
import { formatBRL } from './format'

const arred1 = (v: number) => Math.round(v * 10) / 10

/**
 * Moinho-âncora do cenário: é para ele que vale, exatamente, o custo interno
 * canônico de R$ 2.100/t (farinha de massas, no TLC de regime de Fortaleza).
 */
export const MOINHO_ANCORA: MoinhoId = 'fortaleza'
export const FARINHA_ANCORA: FarinhaId = 'massa'

/** Armazenagem de farinha acabada (R$/t/mês). */
export const ARMAZENAGEM_FARINHA_RS_T = 8
/** Custo de capital mensal sobre o estoque (0,95% a.m.). */
export const TAXA_CAPITAL_MES = 0.0095

// ---------------------------------------------------------------------------
// Trigo posto no moinho (a ponte com o elo 1)
// ---------------------------------------------------------------------------

/**
 * TLC do trigo posto num moinho (R$/t de TRIGO), pelo motor de TLC existente:
 * Argentina · porto preferencial do moinho · FOB. É o custo de regime do
 * moinho — cada um é abastecido pelo seu próprio porto.
 *
 * NÃO confundir com os R$ 1.480/t do cenário-âncora: aquele é o TLC do LOTE
 * recomendado (Argentina · Pecém), que desembarca em Eusébio. Atribuí-lo a
 * qualquer outro moinho seria ignorar o frete interno que o motor já precifica.
 */
export function tlcReferenciaMoinho(moinhoId: MoinhoId): number {
  const moinho = getMoinho(moinhoId)!
  return calcularTlcMock({
    origemId: 'argentina',
    portoId: moinho.portoPreferencialId,
    moinhoId,
    incoterm: 'FOB',
  }).totalRs
}

/**
 * Custo do trigo posto no moinho para a spec de uma farinha (R$/t de TRIGO):
 * o TLC do moinho mais o prêmio de blend que a spec exige. Sem diferencial
 * contra moinho-âncora nenhum — o motor de TLC já cobra o frete de cada um.
 */
export function tlcTrigoNoMoinho(moinhoId: MoinhoId, farinhaId: FarinhaId): number {
  return arred1(tlcReferenciaMoinho(moinhoId) + getFarinha(farinhaId)!.premioBlendRsT)
}

/**
 * Parcela de LOGÍSTICA INTERNA (porto → moinho) embutida no TLC, em R$/t de
 * TRIGO. Sai da mesma decomposição do motor de TLC, não é redigitada: é o que
 * separa um moinho de porto (Fortaleza, R$ 9,2/t) de um do interior
 * (Bento Gonçalves, R$ 112/t) e a razão de o custo da farinha divergir tanto.
 */
export function logisticaInternaTrigoRsT(moinhoId: MoinhoId): number {
  const moinho = getMoinho(moinhoId)!
  const tlc = calcularTlcMock({
    origemId: 'argentina',
    portoId: moinho.portoPreferencialId,
    moinhoId,
    incoterm: 'FOB',
  })
  return arred1(
    tlc.componentes.filter((c) => c.tipo === 'transporte').reduce((soma, c) => soma + c.valorRs, 0),
  )
}

/** Rendimento efetivo (%) = rendimento do moinho + ajuste da spec da farinha. */
export function rendimentoEfetivoPct(moinhoId: MoinhoId, farinhaId: FarinhaId): number {
  return arred1(getMoinho(moinhoId)!.rendimentoPct + getFarinha(farinhaId)!.ajusteRendimentoPp)
}

// ---------------------------------------------------------------------------
// Fórmula 1 — custo interno da farinha
// ---------------------------------------------------------------------------

/**
 * Custo interno da farinha (R$/t de farinha):
 *
 *   custoInterno = TLCtrigo / rendimento
 *                + conversão + energia/manutenção + perdas/financeiro + depreciação
 *                − créditoFarelo
 *   créditoFarelo = (1/rendimento − 1) × preçoFarelo
 *
 * No par-âncora (Fortaleza × farinha de massas) fecha exatamente em R$ 2.100/t.
 */
export function custoInternoFarinha(moinhoId: MoinhoId, farinhaId: FarinhaId): CustoInternoFarinha {
  const moinho = getMoinho(moinhoId)!

  const rendimentoPct = rendimentoEfetivoPct(moinhoId, farinhaId)
  const fatorTrigoPorFarinha = 100 / rendimentoPct
  const fatorFareloPorFarinha = fatorTrigoPorFarinha - 1

  const tlcTrigoRsT = tlcTrigoNoMoinho(moinhoId, farinhaId)
  const logisticaTrigoRsT = logisticaInternaTrigoRsT(moinhoId)
  // O trigo entra em DUAS linhas para que a logística interna fique visível:
  // ela é o que mais diferencia um moinho de porto de um do interior.
  const trigoRs = arred1((tlcTrigoRsT - logisticaTrigoRsT) * fatorTrigoPorFarinha)
  const logisticaRs = arred1(logisticaTrigoRsT * fatorTrigoPorFarinha)
  const creditoRs = creditoFareloRsT(rendimentoPct)

  const pct = (v: number) => v.toFixed(1).replace('.', ',')
  const rs = (v: number) => v.toFixed(1).replace('.', ',')

  const componentes: ComponenteCustoFarinha[] = [
    {
      rotulo: 'Trigo posto no porto, ajustado pelo rendimento',
      rotuloCurto: 'Trigo',
      valorRs: trigoRs,
      tipo: 'trigo',
      descricao: `TLC de R$ ${rs(tlcTrigoRsT)}/t de trigo, menos R$ ${rs(logisticaTrigoRsT)}/t de logística interna (linha própria), dividido pelo rendimento de ${pct(rendimentoPct)}% — ou seja, ${fatorTrigoPorFarinha.toFixed(3).replace('.', ',')} t de trigo por t de farinha.`,
    },
    {
      rotulo: 'Custo de conversão (moagem, mão de obra, embalagem)',
      rotuloCurto: 'Moagem',
      valorRs: moinho.custoConversaoRsT,
      tipo: 'conversao',
      descricao:
        'Mão de obra, insumos de moagem e embalagem. Cerca de 72% varia com o volume; o restante é fixo e só é absorvido com o moinho rodando.',
    },
    {
      rotulo: 'Energia e manutenção',
      rotuloCurto: 'Energia/manut.',
      valorRs: moinho.energiaManutRsT,
      tipo: 'energia',
      descricao:
        'Energia elétrica do processo e manutenção programada. Moinhos mais antigos consomem mais por tonelada moída.',
    },
    {
      rotulo: 'Logística interna (porto → moinho)',
      rotuloCurto: 'Logística',
      valorRs: logisticaRs,
      tipo: 'logistica',
      descricao: `R$ ${rs(logisticaTrigoRsT)}/t de trigo de transporte do porto ${getPorto(moinho.portoPreferencialId)?.nome ?? ''} até o moinho, convertidos para base farinha pelo rendimento. É o componente que mais separa moinhos de porto de moinhos do interior.`,
    },
    {
      rotulo: 'Perdas de processo e custo financeiro',
      rotuloCurto: 'Perdas/financeiro',
      valorRs: moinho.perdasFinanceiroRsT,
      tipo: 'perdas',
      descricao: 'Quebra técnica no processo e custo de capital do estoque em processo.',
    },
    {
      rotulo: 'Depreciação',
      rotuloCurto: 'Depreciação',
      valorRs: moinho.depreciacaoRsT,
      tipo: 'depreciacao',
      descricao:
        'Custo AFUNDADO: não desaparece ao comprar farinha de terceiros. Entra no custo pleno (P&L), mas fica fora do custo evitável que decide o Make/Buy.',
    },
    {
      rotulo: 'Crédito do farelo e subprodutos',
      rotuloCurto: 'Crédito farelo',
      valorRs: -creditoRs,
      tipo: 'credito',
      descricao: `Moer 1 t de farinha gera ${fatorFareloPorFarinha.toFixed(3).replace('.', ',')} t de farelo, vendidas a R$ ${ECONOMIA_MOAGEM.precoFareloRsT}/t. É receita e ABATE o custo — rendimento menor gera mais farelo e aumenta este crédito.`,
    },
  ]

  const totalRsT = arred1(componentes.reduce((soma, c) => soma + c.valorRs, 0))

  return {
    moinhoId,
    farinhaId,
    tlcTrigoRsT,
    rendimentoPct,
    fatorTrigoPorFarinha,
    fatorFareloPorFarinha,
    componentes,
    totalRsT,
    // Base correta do Make/Buy: a depreciação é AFUNDADA — comprar farinha de
    // fora não a faz desaparecer, então ela não pode pesar contra o "produzir".
    custoEvitavelRsT: arred1(totalRsT - moinho.depreciacaoRsT),
    // Piso de curto prazo: trigo + LOGÍSTICA INTERNA + variáveis − crédito.
    // A logística entra porque é 100% variável: cada tonelada extra de trigo
    // paga o mesmo frete do porto ao moinho. Omiti-la faria um moinho do
    // interior (frete de R$ 96–112/t) parecer o melhor lugar para produzir a
    // tonelada incremental — exatamente o inverso da verdade.
    custoMarginalRsT: arred1(trigoRs + logisticaRs + moinho.custoMarginalRsT - creditoRs),
  }
}

// ---------------------------------------------------------------------------
// Capacidade (em toneladas de FARINHA)
// ---------------------------------------------------------------------------

/** Capacidade instalada do moinho convertida em t de FARINHA por mês. */
export function capacidadeFarinhaT(moinhoId: MoinhoId, farinhaId: FarinhaId): number {
  const moinho = getMoinho(moinhoId)!
  return Math.round((moinho.capacidadeMensalT * rendimentoEfetivoPct(moinhoId, farinhaId)) / 100)
}

/** Capacidade OCIOSA (t de farinha/mês) — o que sobra para venda externa. */
export function capacidadeOciosaFarinhaT(moinhoId: MoinhoId, farinhaId: FarinhaId): number {
  const moinho = getMoinho(moinhoId)!
  return Math.round((capacidadeFarinhaT(moinhoId, farinhaId) * (100 - moinho.utilizacaoPct)) / 100)
}

// ---------------------------------------------------------------------------
// Eficiência do moinho e capacidade econômica mínima
// ---------------------------------------------------------------------------

/**
 * Custo FIXO absorvido por tonelada na utilização atual (R$/t de farinha):
 * a parcela não-variável de conversão/energia/perdas mais a depreciação.
 * É o que se dilui quando o moinho roda mais — e o que sufoca quando roda menos.
 */
export function custoFixoRsT(moinhoId: MoinhoId): number {
  const m = getMoinho(moinhoId)!
  return arred1(
    (m.custoConversaoRsT + m.energiaManutRsT + m.perdasFinanceiroRsT) *
      (1 - ECONOMIA_MOAGEM.parcelaVariavel) +
      m.depreciacaoRsT,
  )
}

/** Rótulo do semáforo — FONTE ÚNICA: tela e medidor leem daqui, para o mesmo
 * estado não aparecer com dois nomes lado a lado. */
export const ROTULO_SEMAFORO: Record<SemaforoMoinho, string> = {
  verde: 'Folga confortável',
  ambar: 'Folga estreita',
  vermelho: 'Abaixo do mínimo',
}

/** Folga (pp) a partir da qual o semáforo deixa de ser âmbar. */
const FOLGA_CONFORTAVEL_PP = 15

/**
 * Quanto o custo da farinha CAI com +1 ponto percentual de rendimento (R$/t).
 *
 * Derivando custo(r) = TLC/r − (1/r − 1) × farelo em relação a r, o efeito de
 * +1 pp é (farelo − TLC) / r² × 0,01 — negativo, porque cada ponto a mais de
 * rendimento troca farelo barato por farinha cara. Devolve o módulo (a economia).
 */
export function sensibilidadeRendimentoRsT(
  moinhoId: MoinhoId,
  farinhaId: FarinhaId = FARINHA_ANCORA,
): number {
  const r = rendimentoEfetivoPct(moinhoId, farinhaId) / 100
  const tlc = tlcTrigoNoMoinho(moinhoId, farinhaId)
  return arred1((Math.abs(tlc - ECONOMIA_MOAGEM.precoFareloRsT) / (r * r)) * 0.01)
}

/**
 * Retrato de eficiência do moinho na spec de referência.
 *
 * CAPACIDADE ECONÔMICA MÍNIMA: rodar menos não muda o custo variável, mas
 * espalha o mesmo custo fixo por menos toneladas. Partindo do custo atual,
 *
 *   custo(u) = custoAtual + fixoPorT × (utilizaçãoAtual / u − 1)
 *
 * e a utilização mínima é o u em que custo(u) alcança o preço de mercado:
 *
 *   uMin = utilizaçãoAtual ÷ (1 + (preçoExterno − custoAtual) / fixoPorT)
 *
 * Abaixo dela, moer custa mais do que comprar pronto — é o ponto em que a
 * ociosidade deixa de ser folga e vira destruição de valor. Quando o moinho
 * já perde para o mercado na utilização atual, nenhum u resolve: devolve null.
 */
export function eficienciaMoinho(
  moinhoId: MoinhoId,
  farinhaId: FarinhaId = FARINHA_ANCORA,
): EficienciaMoinho {
  const m = getMoinho(moinhoId)!
  const custo = custoInternoFarinha(moinhoId, farinhaId)
  const regiao = regiaoDoMoinho(moinhoId)
  const externo = precoExternoComparavel(farinhaId, regiao)
  const precoExternoRsT = externo?.precoRsT ?? 0
  const ganhoRsT = externo ? arred1(precoExternoRsT - custo.totalRsT) : 0
  const fixo = custoFixoRsT(moinhoId)

  const denominador = 1 + ganhoRsT / fixo
  const utilizacaoMinimaBruta = denominador > 0 ? m.utilizacaoPct / denominador : Number.POSITIVE_INFINITY
  // Mínimo acima da utilização ATUAL significa que a unidade já perde hoje —
  // tratamos como "nenhuma utilização resolve", que é o que o número diz.
  const utilizacaoMinimaPct =
    externo &&
    Number.isFinite(utilizacaoMinimaBruta) &&
    utilizacaoMinimaBruta <= 100 &&
    utilizacaoMinimaBruta < m.utilizacaoPct
      ? Math.round(utilizacaoMinimaBruta * 10) / 10
      : null
  const folgaPp = utilizacaoMinimaPct != null ? arred1(m.utilizacaoPct - utilizacaoMinimaPct) : null

  const semaforo: SemaforoMoinho =
    utilizacaoMinimaPct == null || folgaPp == null || folgaPp <= 0
      ? 'vermelho'
      : folgaPp < FOLGA_CONFORTAVEL_PP
        ? 'ambar'
        : 'verde'

  const pct = (v: number) => v.toFixed(1).replace('.', ',')
  const brl = (v: number) => formatBRL(v, { casas: 1 })
  const diagnostico = !externo
    ? `Sem cotação apples-to-apples desta spec na região ${regiao}: não há preço de mercado comparável para dizer se a unidade é competitiva. Antes de decidir, ajustar canal, apresentação e base logística de uma cotação existente.`
    : utilizacaoMinimaPct == null
      ? `Custo pleno de ${brl(custo.totalRsT)}/t já supera o mercado (${brl(precoExternoRsT)}/t) na utilização atual: nem rodando a 100% esta unidade fica competitiva nesta spec. O caso é comprar farinha ou trocar o mix — não encher o moinho.`
      : folgaPp! < FOLGA_CONFORTAVEL_PP
        ? `Opera a ${pct(m.utilizacaoPct)}% contra um mínimo econômico de ${pct(utilizacaoMinimaPct)}%: folga de apenas ${pct(folgaPp!)} pp. Uma parada de linha ou queda de demanda empurra o custo acima do mercado.`
        : `Opera a ${pct(m.utilizacaoPct)}% contra um mínimo econômico de ${pct(utilizacaoMinimaPct)}%: ${pct(folgaPp!)} pp de folga. Absorve os ${brl(fixo)}/t de custo fixo com margem.`

  return {
    moinhoId,
    farinhaId,
    rendimentoPct: custo.rendimentoPct,
    extracaoPct: m.extracaoPct,
    utilizacaoPct: m.utilizacaoPct,
    custoInternoRsT: custo.totalRsT,
    custoEvitavelRsT: custo.custoEvitavelRsT,
    custoMarginalRsT: custo.custoMarginalRsT,
    // Vender a tonelada extra também custa servir o cliente: frete, comissão,
    // embalagem e risco de crédito. Sem isso a "folga até o mercado" mede a
    // distância errada — e troca de sinal nas unidades apertadas.
    margemIncrementalRsT: externo
      ? arred1(precoExternoRsT - ECONOMIA_MOAGEM.custoServirRsT - custo.custoMarginalRsT)
      : 0,
    creditoFareloRsT: Math.abs(custo.componentes.find((c) => c.tipo === 'credito')!.valorRs),
    tlcTrigoRsT: custo.tlcTrigoRsT,
    custoFixoRsT: fixo,
    capacidadeFarinhaT: capacidadeFarinhaT(moinhoId, farinhaId),
    capacidadeOciosaT: capacidadeOciosaFarinhaT(moinhoId, farinhaId),
    precoExternoRsT,
    ganhoRsT,
    utilizacaoMinimaPct,
    folgaPp,
    semaforo,
    diagnostico,
  }
}

/** Os 7 moinhos avaliados na MESMA spec — a comparação like-for-like. */
export function eficienciaMoinhos(farinhaId: FarinhaId = FARINHA_ANCORA): EficienciaMoinho[] {
  return MOINHOS.map((m) => eficienciaMoinho(m.id, farinhaId))
}

export interface ResumoParqueMoageiro {
  farinhaId: FarinhaId
  /** Produção mensal do parque na spec (t de farinha) = capacidade × utilização. */
  producaoMensalT: number
  /** Custo médio PONDERADO PELA PRODUÇÃO (R$/t) — não é média simples. */
  custoMedioRsT: number
  /** Unidade de menor custo pleno. */
  maisCompetitivo: EficienciaMoinho
  /** Unidade de maior custo pleno. */
  menosCompetitivo: EficienciaMoinho
  /** Unidade de menor utilização — onde a ociosidade mais pesa. */
  menorUtilizacao: EficienciaMoinho
  /** Diferença de custo entre a melhor e a pior unidade (R$/t). */
  spreadRsT: number
  /** Capacidade ociosa somada do parque (t de farinha/mês). */
  capacidadeOciosaTotalT: number
  /** Unidades cujo custo pleno já perde para o mercado (semáforo vermelho). */
  abaixoDoMinimo: EficienciaMoinho[]
}

/**
 * Retrato do parque inteiro numa spec. O custo médio é ponderado pela PRODUÇÃO
 * de cada unidade: uma média simples daria o mesmo peso a Bento Gonçalves
 * (6,2 kt/mês) e a Eusébio (13,4 kt/mês) e distorceria o custo da companhia.
 */
export function resumoParqueMoageiro(farinhaId: FarinhaId = FARINHA_ANCORA): ResumoParqueMoageiro {
  const unidades = eficienciaMoinhos(farinhaId)
  const producoes = unidades.map((u) => Math.round((u.capacidadeFarinhaT * u.utilizacaoPct) / 100))
  const producaoMensalT = producoes.reduce((soma, p) => soma + p, 0)
  const custoMedioRsT = arred1(
    unidades.reduce((soma, u, i) => soma + u.custoInternoRsT * producoes[i], 0) / producaoMensalT,
  )
  const porCusto = [...unidades].sort((a, b) => a.custoInternoRsT - b.custoInternoRsT)
  const maisCompetitivo = porCusto[0]
  const menosCompetitivo = porCusto[porCusto.length - 1]

  return {
    farinhaId,
    producaoMensalT,
    custoMedioRsT,
    maisCompetitivo,
    menosCompetitivo,
    menorUtilizacao: [...unidades].sort((a, b) => a.utilizacaoPct - b.utilizacaoPct)[0],
    spreadRsT: arred1(menosCompetitivo.custoInternoRsT - maisCompetitivo.custoInternoRsT),
    capacidadeOciosaTotalT: unidades.reduce((soma, u) => soma + u.capacidadeOciosaT, 0),
    abaixoDoMinimo: unidades.filter((u) => u.semaforo === 'vermelho'),
  }
}

// ---------------------------------------------------------------------------
// Fórmula 2 — ganho da verticalização
// ---------------------------------------------------------------------------

export interface FabricaDestino {
  /** Região da fábrica — define qual preço externo é comparável. */
  regiao: RegiaoComercial
  /** Volume de farinha consumido pela fábrica na janela (t/mês). */
  volumeT: number
  rotulo?: string
}

export interface GanhoVerticalizacao {
  moinhoId: MoinhoId
  farinhaId: FarinhaId
  regiao: RegiaoComercial
  custoInternoRsT: number
  /** Preço equivalente de comprar a MESMA spec de terceiros (R$/t). */
  precoExternoRsT: number
  /** Ganho unitário (R$/t) = preço externo − custo interno. */
  ganhoRsT: number
  volumeT: number
  /** Ganho na janela (R$) = ganho unitário × volume. */
  ganhoTotalRs: number
  /** false quando não há cotação apples-to-apples na região. */
  comparavel: boolean
  racional: string
}

/**
 * Ganho da verticalização (R$/t de farinha):
 *
 *   ganho = preçoEquivalenteCompraExterna − custoInterno
 *
 * No cenário-âncora: R$ 2.350/t − R$ 2.100/t = R$ 250/t. Só usa preços marcados
 * como `comparavel` — comparar com "preço médio de farinha" é proibido.
 */
export function ganhoVerticalizacao(
  moinhoId: MoinhoId,
  farinhaId: FarinhaId,
  fabrica: FabricaDestino,
): GanhoVerticalizacao {
  const custoInternoRsT = custoInternoFarinha(moinhoId, farinhaId).totalRsT
  const externo = precoExternoComparavel(farinhaId, fabrica.regiao)
  const precoExternoRsT = externo?.precoRsT ?? 0
  const ganhoRsT = externo ? arred1(precoExternoRsT - custoInternoRsT) : 0
  const moinho = getMoinho(moinhoId)!
  const farinha = getFarinha(farinhaId)!

  return {
    moinhoId,
    farinhaId,
    regiao: fabrica.regiao,
    custoInternoRsT,
    precoExternoRsT,
    ganhoRsT,
    volumeT: fabrica.volumeT,
    ganhoTotalRs: Math.round(ganhoRsT * fabrica.volumeT),
    comparavel: externo != null,
    racional: externo
      ? `Moer ${farinha.nome.toLowerCase()} em ${moinho.nome} custa R$ ${custoInternoRsT.toFixed(1).replace('.', ',')}/t contra R$ ${precoExternoRsT}/t da mesma spec no mercado ${fabrica.regiao} (industrial, granel, posto fábrica). ` +
        `Cada tonelada verticalizada vale R$ ${ganhoRsT.toFixed(1).replace('.', ',')}.`
      : `Sem cotação apples-to-apples de ${farinha.nome.toLowerCase()} na região ${fabrica.regiao}: a comparação exigiria ajustar canal, apresentação e base logística antes de decidir.`,
  }
}

// ---------------------------------------------------------------------------
// Fórmula 3 — margem de venda externa
// ---------------------------------------------------------------------------

export interface ClienteVenda {
  id: string
  /** Moinho que atenderia o cliente — define o custo interno da conta. */
  moinhoId: MoinhoId
  /** Preço líquido (R$/t): já sem impostos, descontos e devoluções. */
  precoLiquidoRsT: number
  volumeT: number
  /** Custo de servir (R$/t). Sem valor, usa o padrão de R$ 120/t. */
  custoServirRsT?: number
}

export interface MargemVendaExterna {
  clienteId: string
  farinhaId: FarinhaId
  moinhoId: MoinhoId
  precoLiquidoRsT: number
  custoInternoRsT: number
  custoServirRsT: number
  /** Margem unitária (R$/t) = preço líquido − custo interno − custo de servir. */
  margemRsT: number
  /** Margem sobre o preço líquido (%). */
  margemPct: number
  volumeT: number
  margemTotalRs: number
  /** Preço mínimo (R$/t) que ainda cobre custo interno + custo de servir. */
  precoMinimoRsT: number
  /** Piso de curto prazo (R$/t): custo marginal + custo de servir. */
  precoMinimoMarginalRsT: number
  racional: string
}

/**
 * Margem da venda externa (R$/t de farinha):
 *
 *   margem = preçoLíquidoVenda − custoInterno − custoDeServir
 *
 * No cenário-âncora: R$ 2.500/t − R$ 2.100/t − R$ 120/t = R$ 280/t.
 */
export function margemVendaExterna(farinhaId: FarinhaId, cliente: ClienteVenda): MargemVendaExterna {
  const custo = custoInternoFarinha(cliente.moinhoId, farinhaId)
  const custoServirRsT = cliente.custoServirRsT ?? ECONOMIA_MOAGEM.custoServirRsT
  const margemRsT = arred1(cliente.precoLiquidoRsT - custo.totalRsT - custoServirRsT)
  const farinha = getFarinha(farinhaId)!

  return {
    clienteId: cliente.id,
    farinhaId,
    moinhoId: cliente.moinhoId,
    precoLiquidoRsT: cliente.precoLiquidoRsT,
    custoInternoRsT: custo.totalRsT,
    custoServirRsT,
    margemRsT,
    margemPct: arred1((margemRsT / cliente.precoLiquidoRsT) * 100),
    volumeT: cliente.volumeT,
    margemTotalRs: Math.round(margemRsT * cliente.volumeT),
    precoMinimoRsT: arred1(custo.totalRsT + custoServirRsT),
    precoMinimoMarginalRsT: arred1(custo.custoMarginalRsT + custoServirRsT),
    racional:
      `${farinha.nome} de ${getMoinho(cliente.moinhoId)!.nome} a R$ ${cliente.precoLiquidoRsT}/t líquidos: ` +
      `custo interno R$ ${custo.totalRsT.toFixed(1).replace('.', ',')}/t + custo de servir R$ ${custoServirRsT}/t ` +
      `⇒ margem de R$ ${margemRsT.toFixed(1).replace('.', ',')}/t (${arred1((margemRsT / cliente.precoLiquidoRsT) * 100).toFixed(1).replace('.', ',')}%). ` +
      `Preço mínimo para não destruir valor: R$ ${arred1(custo.totalRsT + custoServirRsT).toFixed(1).replace('.', ',')}/t.`,
  }
}

// ---------------------------------------------------------------------------
// A decisão — Make / Buy / Sell
// ---------------------------------------------------------------------------

export interface EntradaMbs {
  moinhoId: MoinhoId
  farinhaId: FarinhaId
  /** Demanda interna de farinha na janela (t/mês) — o volume em decisão. */
  demandaT: number
  /** Capacidade ociosa de farinha na janela (t/mês). Sem valor, é derivada. */
  capacidadeDisponivelT?: number
  precos: {
    /** Preço equivalente de comprar a MESMA spec de terceiros (R$/t). */
    externoRsT: number
    /** Preço líquido de venda a terceiros (R$/t). */
    vendaLiquidaRsT: number
    /** Custo de servir a venda externa (R$/t). Padrão: R$ 120/t. */
    custoServirRsT?: number
  }
  /** Volume já contratado com terceiros (t/mês) — teto de 'produzir-vender'. */
  volumeContratadoExternoT?: number
}

const ROTULO_ALTERNATIVA: Record<AlternativaMbs, string> = {
  'produzir-consumir': 'Produzir e consumir nas fábricas',
  comprar: 'Comprar farinha de terceiros',
  'produzir-vender': 'Produzir e vender a terceiros',
  estoque: 'Produzir e estocar',
  'parar-moagem': 'Parar a moagem',
}

/**
 * Compara as 5 alternativas de destino de uma tonelada de farinha e devolve a
 * recomendada com o racional. Os `resultadoRsT` são todos medidos contra a
 * MESMA referência — comprar a farinha no mercado, que por definição vale 0 —,
 * portanto são diretamente comparáveis entre si. Já os `resultadoRs` NÃO são:
 * cada alternativa se aplica ao seu próprio volume (a venda externa só alcança
 * o contratado dentro da capacidade ociosa, não a demanda inteira).
 *
 * A recomendação não é o maior número solto: 'produzir-vender' só concorre até
 * o volume contratado com terceiros e dentro da capacidade ociosa, porque
 * vender a farinha das fábricas obrigaria a comprar farinha de terceiros para o
 * consumo próprio — trocando controle de qualidade e segurança de suprimento
 * por um spread de curto prazo.
 */
export function decisaoMakeBuySell(entrada: EntradaMbs): CenarioMakeBuySell {
  const { moinhoId, farinhaId, demandaT } = entrada
  const moinho = getMoinho(moinhoId)!
  const farinha = getFarinha(farinhaId)!

  const custo = custoInternoFarinha(moinhoId, farinhaId)
  const custoInternoRsT = custo.totalRsT
  const precoExternoRsT = entrada.precos.externoRsT
  const precoVendaLiquidoRsT = entrada.precos.vendaLiquidaRsT
  const custoServirRsT = entrada.precos.custoServirRsT ?? ECONOMIA_MOAGEM.custoServirRsT

  const capacidadeDisponivelT =
    entrada.capacidadeDisponivelT ?? capacidadeOciosaFarinhaT(moinhoId, farinhaId)
  const contratadoExternoT = entrada.volumeContratadoExternoT ?? 0

  // Produzir para consumo próprio evita a compra externa da mesma spec.
  const ganhoProduzirRsT = arred1(precoExternoRsT - custoInternoRsT)
  // Vender a terceiros: preço líquido menos custo interno e custo de servir.
  const margemVenderRsT = arred1(precoVendaLiquidoRsT - custoInternoRsT - custoServirRsT)
  // Estocar: o mesmo ganho de produzir, menos o carrego de um mês.
  const carregoRsT = arred1(ARMAZENAGEM_FARINHA_RS_T + custoInternoRsT * TAXA_CAPITAL_MES)
  const ganhoEstoqueRsT = arred1(ganhoProduzirRsT - carregoRsT)
  // Parar: os fixos e a depreciação não são absorvidos e viram perda pura.
  const fixoNaoAbsorvidoRsT = arred1(
    (moinho.custoConversaoRsT + moinho.energiaManutRsT + moinho.perdasFinanceiroRsT) *
      (1 - ECONOMIA_MOAGEM.parcelaVariavel) +
      moinho.depreciacaoRsT,
  )

  // Moer o volume em decisão exige que ele caiba na capacidade INSTALADA de
  // farinha do moinho; a capacidade ociosa é o que sobra para a venda externa.
  const capacidadeSuficiente = capacidadeFarinhaT(moinhoId, farinhaId) >= demandaT
  const volumeVendavelT = Math.min(contratadoExternoT, capacidadeDisponivelT)

  // A mesma comparação na base do custo EVITÁVEL (sem a depreciação afundada).
  const evitavel = custo.custoEvitavelRsT
  const brl = (v: number) => v.toFixed(1).replace('.', ',')
  const tons = (v: number) => v.toLocaleString('pt-BR')

  const alternativas: ResultadoAlternativaMbs[] = [
    {
      alternativa: 'produzir-consumir',
      rotulo: ROTULO_ALTERNATIVA['produzir-consumir'],
      resultadoRsT: ganhoProduzirRsT,
      resultadoEvitavelRsT: arred1(precoExternoRsT - evitavel),
      volumeAplicavelT: demandaT,
      resultadoRs: Math.round(ganhoProduzirRsT * demandaT),
      escopo: 'demanda',
      viavel: capacidadeSuficiente,
      nota: `Evita comprar ${tons(demandaT)} t da mesma spec a R$ ${precoExternoRsT}/t. Mantém o controle de qualidade do blend e a segurança de suprimento das fábricas.`,
    },
    {
      alternativa: 'comprar',
      rotulo: ROTULO_ALTERNATIVA.comprar,
      resultadoRsT: 0,
      resultadoEvitavelRsT: 0,
      volumeAplicavelT: demandaT,
      resultadoRs: 0,
      escopo: 'demanda',
      viavel: true,
      nota: `Referência da comparação: pagar R$ ${precoExternoRsT}/t no mercado e redirecionar a capacidade para specs de maior margem. Transfere a qualidade da farinha para terceiros.`,
    },
    {
      alternativa: 'produzir-vender',
      rotulo: ROTULO_ALTERNATIVA['produzir-vender'],
      resultadoRsT: margemVenderRsT,
      resultadoEvitavelRsT: arred1(precoVendaLiquidoRsT - evitavel - custoServirRsT),
      volumeAplicavelT: volumeVendavelT,
      resultadoRs: Math.round(margemVenderRsT * volumeVendavelT),
      escopo: 'capacidade-ociosa',
      viavel: volumeVendavelT > 0 && margemVenderRsT > 0,
      nota:
        volumeVendavelT > 0
          ? `Disputa a CAPACIDADE OCIOSA (${tons(capacidadeDisponivelT)} t), não a demanda das fábricas: limitado às ${tons(volumeVendavelT)} t contratadas com terceiros.`
          : 'Sem volume contratado com terceiros dentro da capacidade ociosa — a margem unitária existe, mas não há a quem vender.',
    },
    {
      alternativa: 'estoque',
      rotulo: ROTULO_ALTERNATIVA.estoque,
      resultadoRsT: ganhoEstoqueRsT,
      resultadoEvitavelRsT: arred1(precoExternoRsT - evitavel - carregoRsT),
      volumeAplicavelT: demandaT,
      resultadoRs: Math.round(ganhoEstoqueRsT * demandaT),
      escopo: 'demanda',
      viavel: capacidadeSuficiente,
      nota: `Mesmo ganho de moer, menos R$ ${brl(carregoRsT)}/t de carrego (armazenagem + custo de capital de um mês). Com o preço de mercado parado, é sempre dominado por produzir e consumir: só vira resposta com expectativa de alta acima do carrego.`,
    },
    {
      alternativa: 'parar-moagem',
      rotulo: ROTULO_ALTERNATIVA['parar-moagem'],
      resultadoRsT: -fixoNaoAbsorvidoRsT,
      resultadoEvitavelRsT: -arred1(fixoNaoAbsorvidoRsT - moinho.depreciacaoRsT),
      volumeAplicavelT: demandaT,
      resultadoRs: Math.round(-fixoNaoAbsorvidoRsT * demandaT),
      escopo: 'demanda',
      viavel: true,
      nota: `Diferente de "comprar": aqui a capacidade NÃO é redirecionada. Fixos e depreciação de R$ ${brl(fixoNaoAbsorvidoRsT)}/t deixam de ser absorvidos e viram perda, sem receita em troca.`,
    },
  ]

  // DUAS decisões sobre tonelagens diferentes. A demanda das fábricas escolhe
  // entre produzir, comprar, estocar ou parar; a capacidade ociosa escolhe
  // entre vender e ficar parada. Disputá-las no mesmo ranking faria "vender"
  // (margem maior por tonelada) parecer melhor que "produzir" sem notar que a
  // demanda das fábricas continuaria descoberta.
  const daDemanda = alternativas.filter((a) => a.escopo === 'demanda' && a.viavel)
  const ordenadas = [...daDemanda].sort((a, b) => b.resultadoRsT - a.resultadoRsT)
  const melhor = ordenadas[0]
  const segunda = ordenadas[1]
  const recomendada = melhor.alternativa

  const vender = alternativas.find((a) => a.alternativa === 'produzir-vender')!
  const recomendadaCapacidadeOciosa: AlternativaMbs | null = vender.viavel ? 'produzir-vender' : null

  // Valor da DECISÃO: o quanto a recomendada rende a mais que a segunda melhor.
  // Quando 'comprar' vence, evitar a perda de moer É o benefício — reportar 0
  // apagaria justamente o caso em que o hub mais protege margem.
  const beneficioVsAlternativaRs = segunda
    ? Math.round((melhor.resultadoRsT - segunda.resultadoRsT) * melhor.volumeAplicavelT)
    : melhor.resultadoRs
  const resultadoRs = melhor.resultadoRs + (recomendadaCapacidadeOciosa ? vender.resultadoRs : 0)

  const complementoVenda = recomendadaCapacidadeOciosa
    ? ` Em paralelo, a capacidade ociosa de ${tons(capacidadeDisponivelT)} t sustenta ${tons(vender.volumeAplicavelT)} t de venda externa a R$ ${brl(vender.resultadoRsT)}/t de margem (R$ ${vender.resultadoRs.toLocaleString('pt-BR')}/mês).`
    : ''

  // Alerta quando a base de custo inverte a resposta: com a depreciação
  // afundada fora da conta, moer pode passar a compensar mesmo perdendo no
  // custo pleno. É o caso clássico de fechar moinho por um custo que não sai.
  const produzir = alternativas.find((a) => a.alternativa === 'produzir-consumir')!
  const divergeNaBase = produzir.resultadoRsT < 0 && produzir.resultadoEvitavelRsT > 0
  const alertaBase = divergeNaBase
    ? ` ATENÇÃO: no custo EVITÁVEL (sem a depreciação de R$ ${brl(moinho.depreciacaoRsT)}/t, que não desaparece ao comprar de fora) moer ainda rende R$ ${brl(produzir.resultadoEvitavelRsT)}/t — a decisão de comprar só se sustenta se a capacidade for de fato redirecionada.`
    : ''

  const racional =
    recomendada === 'produzir-consumir'
      ? `Moer ${farinha.nome.toLowerCase()} em ${moinho.nome} custa R$ ${brl(custoInternoRsT)}/t contra R$ ${precoExternoRsT}/t da mesma spec no mercado: cada tonelada verticalizada vale R$ ${brl(ganhoProduzirRsT)}.${complementoVenda}`
      : recomendada === 'comprar'
        ? `Com o trigo a R$ ${brl(custo.tlcTrigoRsT)}/t posto em ${moinho.nome} e rendimento de ${brl(custo.rendimentoPct)}%, o custo interno (R$ ${brl(custoInternoRsT)}/t) supera o mercado (R$ ${precoExternoRsT}/t): comprar a farinha evita R$ ${brl(Math.abs(ganhoProduzirRsT))}/t de perda e libera a capacidade para specs de maior margem.${alertaBase}${complementoVenda}`
        : `Produzir e estocar rende R$ ${brl(ganhoEstoqueRsT)}/t após o carrego de R$ ${brl(carregoRsT)}/t.${complementoVenda}`

  return {
    id: `mbs-${moinhoId}-${farinhaId}`,
    moinhoId,
    farinhaId,
    volumeT: demandaT,
    custoInternoRsT,
    custoEvitavelRsT: evitavel,
    precoExternoRsT,
    precoVendaLiquidoRsT,
    custoServirRsT,
    capacidadeDisponivelT,
    alternativas,
    recomendada,
    recomendadaCapacidadeOciosa,
    resultadoRs,
    beneficioVsAlternativaRs,
    racional,
  }
}
