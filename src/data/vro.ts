/**
 * VRO — Realização de Valor. A tabela Recomendação × Decisão × Resultado é a
 * fonte; todos os agregados (CPV, hedge, EBITDA incremental, waterfall por
 * alavanca, curva acumulada, hit-rate) são DERIVADOS dela.
 *
 * Metodologia: IA recomenda, humano decide, resultado é medido — sem dupla
 * contagem (haircut de 15–20% já aplicado ao valor atribuído). Piloto desde
 * março/2025; run-rate dentro do business case de R$ 38–80M/ano.
 */
import type {
  AlavancaVRO,
  AlternativaMbs,
  MetricasVRO,
  PontoCurvaVRO,
  RecomendacaoVRO,
  RegistroVRO,
} from './types'
import { RECOMENDACAO_COMPRA } from './compra'
import { RECOMENDACAO_HEDGE } from './hedge'
import { BENEFICIO_MAKE_BUY_SELL_RS } from './makeBuySell'

export const RECOMENDACOES_VRO: RecomendacaoVRO[] = [
  {
    id: 'vro-2025-08-12',
    data: '2025-08-12',
    titulo: 'Antecipar 18% do trimestre + hedge 60% + Make/Buy/Sell (recomendação do dia)',
    alavanca: 'mercado-compra',
    recomendacaoIA:
      '32.000 t Argentina · Pecém a R$ 1.480/t + NDF US$ 23,5M a R$ 5,27 + produzir e consumir, vendendo o excedente',
    decisaoHumana: 'pendente',
    decisaoNota: 'Em alçada Finanças + Supply (> R$ 1M)',
    resultado:
      'Projetado: R$ 1,3M no CPV + R$ 3,5M protegidos + a margem das decisões de destino da farinha',
    valorCpvRs: RECOMENDACAO_COMPRA.economiaTotalRs,
    valorHedgeRs: RECOMENDACAO_HEDGE.protecaoEstimadaRs,
    /** O valor da DECISÃO Make/Buy/Sell do dia — vem do motor, não é digitado. */
    valorMargemRs: BENEFICIO_MAKE_BUY_SELL_RS,
    decisaoMbs: 'produzir-consumir',
    status: 'projetado',
    confiancaPct: RECOMENDACAO_COMPRA.confiancaPct,
    agenteId: 'orquestrador',
  },
  {
    id: 'vro-2025-07-30',
    data: '2025-07-30',
    titulo: 'Comprar farinha de terceiros no Sul em vez de moer (Bento Gonçalves × massas)',
    alavanca: 'margem-farinha',
    recomendacaoIA:
      'Suspender 4.200 t/mês de moagem própria e comprar a mesma spec a R$ 2.180/t, redirecionando a capacidade',
    decisaoHumana: 'aprovada',
    resultado:
      'Perto da origem do trigo, o mercado bateu o custo evitável — R$ 1,4M de perda evitada em 2 meses',
    valorCpvRs: 0,
    valorHedgeRs: 0,
    valorMargemRs: 1_400_000,
    decisaoMbs: 'comprar',
    status: 'realizado',
    confiancaPct: 82,
    agenteId: 'make-buy-sell',
  },
  {
    id: 'vro-2025-06-27',
    data: '2025-06-27',
    titulo: 'Vender 6.400 t de excedente de farinha no Nordeste (capacidade ociosa)',
    alavanca: 'margem-farinha',
    recomendacaoIA: 'Alocar a folga de Fortaleza e Eusébio a 3 clientes industriais acima do custo marginal',
    decisaoHumana: 'aprovada',
    resultado: 'Margem incremental de R$ 280/t sobre volume que antes não era produzido — R$ 1,8M',
    valorCpvRs: 0,
    valorHedgeRs: 0,
    valorMargemRs: 1_800_000,
    decisaoMbs: 'produzir-vender',
    status: 'realizado',
    confiancaPct: 84,
    agenteId: 'comercial-farinha',
  },
  {
    id: 'vro-2025-05-22',
    data: '2025-05-22',
    titulo: 'Recuperar rendimento de moagem em Cabedelo (−0,8 p.p. vs regime)',
    alavanca: 'margem-farinha',
    recomendacaoIA: 'Parar 8 h para troca de cilindros antes que a perda de extração acumule mais um mês',
    decisaoHumana: 'ajustada',
    decisaoNota: 'Manutenção antecipou a parada para o fim de semana, com meia janela',
    resultado: 'Rendimento voltou a 75,9% — R$ 0,9M de custo de farinha evitado (esperado: R$ 1,2M)',
    valorCpvRs: 0,
    valorHedgeRs: 0,
    valorMargemRs: 900_000,
    decisaoMbs: 'produzir-consumir',
    status: 'realizado',
    confiancaPct: 77,
    agenteId: 'moinhos',
  },
  {
    id: 'vro-2025-04-30',
    data: '2025-04-30',
    titulo: 'Recusar venda de 2.100 t ao Norte a R$ 2.190/t',
    alavanca: 'margem-farinha',
    recomendacaoIA:
      'Preço abaixo do custo de reposição: atender exigiria comprar farinha para cobrir a demanda interna',
    decisaoHumana: 'aprovada',
    resultado: 'Venda recusada; a mesma tonelada foi consumida internamente — R$ 0,6M de destruição evitada',
    valorCpvRs: 0,
    valorHedgeRs: 0,
    valorMargemRs: 600_000,
    decisaoMbs: 'produzir-consumir',
    status: 'realizado',
    confiancaPct: 80,
    agenteId: 'comercial-farinha',
  },
  {
    id: 'vro-2025-07-25',
    data: '2025-07-25',
    titulo: 'Renegociar demurrage e janela de atracação em Aratu',
    alavanca: 'integracao',
    recomendacaoIA: 'Cruzar fila do porto com ETAs e reordenar 2 atracações',
    decisaoHumana: 'aprovada',
    resultado: 'Demurrage evitado e giro de armazém — R$ 1,9M no CPV',
    valorCpvRs: 1_900_000,
    valorHedgeRs: 0,
    status: 'realizado',
    confiancaPct: 81,
  },
  {
    id: 'vro-2025-07-15',
    data: '2025-07-15',
    titulo: 'Antecipar 12.000 t antes do relatório WASDE',
    alavanca: 'mercado-compra',
    recomendacaoIA: 'Compra spot Argentina antes da divulgação de estoques',
    decisaoHumana: 'aprovada',
    resultado: 'CBOT +US$ 6/t após o relatório — R$ 1,2M capturados',
    valorCpvRs: 1_200_000,
    valorHedgeRs: 0,
    status: 'realizado',
    confiancaPct: 74,
  },
  {
    id: 'vro-2025-06-18',
    data: '2025-06-18',
    titulo: 'Redirecionar 2 descargas de Suape para Pecém',
    alavanca: 'logistica-estoques',
    recomendacaoIA: 'Trocar porto de 2 navios para reduzir fila + transporte interno',
    decisaoHumana: 'aprovada',
    resultado: 'R$ 2,8M no CPV (fila evitada e rodovia mais curta)',
    valorCpvRs: 2_800_000,
    valorHedgeRs: 0,
    status: 'realizado',
    confiancaPct: 85,
  },
  {
    id: 'vro-2025-06-10',
    data: '2025-06-10',
    titulo: 'Compra spot Rússia 27.000 t (FOB baixo)',
    alavanca: 'mercado-compra',
    recomendacaoIA: 'Aproveitar FOB US$ 226/t no Mar Negro',
    decisaoHumana: 'rejeitada',
    decisaoNota: 'Mesa rejeitou por risco de qualidade (DON)',
    resultado: 'Pré-embarque confirmou DON alto — rejeição correta evitou ~R$ 1,2M de retrabalho',
    valorCpvRs: 0,
    valorHedgeRs: 0,
    status: 'realizado',
    confiancaPct: 58,
  },
  {
    id: 'vro-2025-05-09',
    data: '2025-05-09',
    titulo: 'NDF de US$ 38M no T2 a R$ 5,05',
    alavanca: 'hedge',
    recomendacaoIA: 'Elevar cobertura do T2 para 70% na janela de forward baixo',
    decisaoHumana: 'aprovada',
    resultado: 'Câmbio foi a R$ 5,19 no vencimento — R$ 5,4M protegidos',
    valorCpvRs: 0,
    valorHedgeRs: 5_400_000,
    status: 'realizado',
    confiancaPct: 83,
  },
  {
    id: 'vro-2025-05-05',
    data: '2025-05-05',
    titulo: 'Aguardar queda do frete Up River',
    alavanca: 'mercado-compra',
    recomendacaoIA: 'Postergar fixação de frete em 1 semana',
    decisaoHumana: 'aprovada',
    resultado: 'Frete subiu +US$ 2/t (disputa com milho) — miss de R$ 0,6M',
    valorCpvRs: -600_000,
    valorHedgeRs: 0,
    status: 'realizado',
    confiancaPct: 62,
  },
  {
    id: 'vro-2025-04-22',
    data: '2025-04-22',
    titulo: 'Blend soft nacional (W 160) em biscoitos',
    alavanca: 'qualidade-blend',
    recomendacaoIA: 'Substituir importado por RS/PR em 3 SKUs de biscoito',
    decisaoHumana: 'aprovada',
    resultado: 'Qualidade estável em linha — R$ 3,1M no CPV',
    valorCpvRs: 3_100_000,
    valorHedgeRs: 0,
    status: 'realizado',
    confiancaPct: 88,
  },
  {
    id: 'vro-2025-03-28',
    data: '2025-03-28',
    titulo: 'Antecipar 20.000 t Argentina (prêmio subindo)',
    alavanca: 'mercado-compra',
    recomendacaoIA: 'Comprar 20.000 t antes do reajuste de prêmio',
    decisaoHumana: 'ajustada',
    decisaoNota: 'Mesa reduziu para 15.000 t por caixa',
    resultado: 'Prêmio subiu US$ 7/t — R$ 1,6M capturados (esperado: R$ 2,3M)',
    valorCpvRs: 1_600_000,
    valorHedgeRs: 0,
    status: 'realizado',
    confiancaPct: 79,
  },
  {
    id: 'vro-2025-03-14',
    data: '2025-03-14',
    titulo: 'Antecipar 40.000 t Canadá antes do rali',
    alavanca: 'mercado-compra',
    recomendacaoIA: 'Comprar CWRS antes do aperto de oferta de proteína alta',
    decisaoHumana: 'aprovada',
    resultado: 'CWRS +US$ 11/t em 30 dias — R$ 4,0M capturados',
    valorCpvRs: 4_000_000,
    valorHedgeRs: 0,
    status: 'realizado',
    confiancaPct: 86,
  },
]

// --- Agregados derivados (coerência por construção) ---
const realizadas = RECOMENDACOES_VRO.filter((r) => r.status === 'realizado')
const executadas = realizadas.filter((r) => r.decisaoHumana === 'aprovada' || r.decisaoHumana === 'ajustada')

/** Total capturado numa recomendação: CPV + hedge + margem da cadeia. */
const totalDe = (r: RecomendacaoVRO) => r.valorCpvRs + r.valorHedgeRs + (r.valorMargemRs ?? 0)

export const CPV_CAPTURADO_YTD_RS = realizadas.reduce((s, r) => s + r.valorCpvRs, 0) // R$ 14,0M
export const HEDGE_PROTEGIDO_YTD_RS = realizadas.reduce((s, r) => s + r.valorHedgeRs, 0) // R$ 5,4M

/**
 * Margem capturada YTD nas decisões de destino da farinha (R$ 4,7M). Fica FORA
 * do CPV de propósito: o CPV mede o que se economizou comprando trigo; isto
 * mede o que se ganhou decidindo o que fazer com a farinha depois do moinho.
 * Somar os dois num número só esconderia qual elo da cadeia gerou o valor.
 */
export const MARGEM_CAPTURADA_YTD_RS = realizadas.reduce((s, r) => s + (r.valorMargemRs ?? 0), 0)

/** EBITDA incremental YTD = CPV + hedge + margem (R$ 24,1M) — o número do cockpit. */
export const VALOR_CAPTURADO_YTD_RS =
  CPV_CAPTURADO_YTD_RS + HEDGE_PROTEGIDO_YTD_RS + MARGEM_CAPTURADA_YTD_RS

/**
 * De onde veio a margem, por tipo de decisão. É o retrato que prova a tese v2:
 * "comprar" e "recusar venda" aparecem com valor POSITIVO porque o que se mede
 * é perda evitada — se só contássemos ganhos de produzir, o hub pareceria
 * inútil justamente quando evita o erro mais caro.
 */
export const MARGEM_POR_DECISAO_VRO: Array<{
  decisao: AlternativaMbs
  rotulo: string
  valorRs: number
}> = (
  [
    ['produzir-consumir', 'Produzir e consumir'],
    ['produzir-vender', 'Produzir e vender'],
    ['comprar', 'Comprar de terceiros'],
  ] as Array<[AlternativaMbs, string]>
)
  .map(([decisao, rotulo]) => ({
    decisao,
    rotulo,
    valorRs: realizadas
      .filter((r) => r.decisaoMbs === decisao)
      .reduce((s, r) => s + (r.valorMargemRs ?? 0), 0),
  }))
  .filter((d) => d.valorRs !== 0)

/** Waterfall por alavanca (só CPV — hedge e margem são KPIs próprios, sem dupla contagem). */
export const ALAVANCAS_VRO: Array<{ alavanca: AlavancaVRO; rotulo: string; valorRs: number }> = (
  [
    ['mercado-compra', 'Mercado / compra'],
    ['logistica-estoques', 'Logística / estoques'],
    ['qualidade-blend', 'Qualidade / blend'],
    ['integracao', 'Integração (mesma verdade)'],
  ] as Array<[AlavancaVRO, string]>
).map(([alavanca, rotulo]) => ({
  alavanca,
  rotulo,
  valorRs: realizadas.filter((r) => r.alavanca === alavanca).reduce((s, r) => s + r.valorCpvRs, 0),
}))

/** Curva acumulada (CPV + hedge + margem) vs meta linear do piso do case (R$ 38M/ano). */
const META_ANUAL_RS = 38_000_000
const MESES = ['mar', 'abr', 'mai', 'jun', 'jul', 'ago'] as const
const MES_NUM: Record<string, string> = { mar: '03', abr: '04', mai: '05', jun: '06', jul: '07', ago: '08' }
export const CURVA_VRO: PontoCurvaVRO[] = MESES.map((mes, i) => {
  const ate = `2025-${MES_NUM[mes]}-31`
  const acumuladoRs = realizadas.filter((r) => r.data <= ate).reduce((s, r) => s + totalDe(r), 0)
  return {
    mes,
    acumuladoRs,
    metaRs: Math.round((META_ANUAL_RS * (i + 1)) / 12),
    ...(mes === 'ago'
      ? {
          projetadoRs:
            acumuladoRs +
            RECOMENDACAO_COMPRA.economiaTotalRs +
            RECOMENDACAO_HEDGE.protecaoEstimadaRs +
            BENEFICIO_MAKE_BUY_SELL_RS,
        }
      : {}),
  }
})

const MESES_DE_PILOTO = 5
export const METRICAS_VRO: MetricasVRO = {
  cpvCapturadoYtdRs: CPV_CAPTURADO_YTD_RS,
  hedgeProtegidoYtdRs: HEDGE_PROTEGIDO_YTD_RS,
  margemCapturadaYtdRs: MARGEM_CAPTURADA_YTD_RS,
  ebitdaIncrementalYtdRs: VALOR_CAPTURADO_YTD_RS,
  ebitdaIncrementalPp: Math.round((VALOR_CAPTURADO_YTD_RS / 10_440_000_000) * 100 * 100) / 100, // +0,23 p.p.
  runRateAnualRs: Math.round((VALOR_CAPTURADO_YTD_RS * 12) / MESES_DE_PILOTO / 1e6) * 1e6, // ~R$ 58M/ano
  acuraciaModeloPct: 84,
  // O hit-rate conta as TRÊS fontes de valor: sem `valorMargemRs`, as decisões
  // de farinha entrariam como zero e puxariam o placar para baixo por omissão.
  hitRatePct: Math.round((executadas.filter((r) => totalDe(r) > 0).length / executadas.length) * 100),
  driftPct: 2.1,
  erroSerie: [6.2, 5.4, 4.8, 4.4, 3.9, 3.6],
  posturaDecisoesPct: { conservador: 25, recomendado: 63, oportunistico: 12 },
}

/** Trilha resumida por alavanca/mês (alimenta o KPI do cockpit). */
export const REGISTROS_VRO: RegistroVRO[] = [
  {
    id: 'vro-2025-03',
    data: '2025-03-14',
    categoria: 'compra',
    decisao: 'Antecipação de 40.000 t do Canadá antes do rali de março',
    valorCapturadoRs: 6_200_000,
    status: 'realizado',
  },
  {
    id: 'vro-2025-04',
    data: '2025-04-22',
    categoria: 'blend',
    decisao: 'Blend soft nacional em biscoitos (W 160) substituindo importado',
    valorCapturadoRs: 3_100_000,
    status: 'realizado',
  },
  {
    id: 'vro-2025-05',
    data: '2025-05-09',
    categoria: 'hedge',
    decisao: 'NDF de US$ 38M no T2 antes da alta do dólar',
    valorCapturadoRs: 5_400_000,
    status: 'realizado',
  },
  {
    id: 'vro-2025-06',
    data: '2025-06-18',
    categoria: 'logistica',
    decisao: 'Redirecionamento Suape → Pecém em duas descargas',
    valorCapturadoRs: 2_800_000,
    status: 'realizado',
  },
  {
    id: 'vro-2025-07',
    data: '2025-07-25',
    categoria: 'logistica',
    decisao: 'Renegociação de demurrage e janela de atracação em Aratu',
    valorCapturadoRs: 1_900_000,
    status: 'realizado',
  },
  {
    id: 'vro-2025-06b',
    data: '2025-06-27',
    categoria: 'margem',
    decisao: 'Venda de 6.400 t de excedente de farinha no Nordeste (capacidade ociosa)',
    valorCapturadoRs: 1_800_000,
    status: 'realizado',
  },
  {
    id: 'vro-2025-07b',
    data: '2025-07-30',
    categoria: 'margem',
    decisao: 'Compra de farinha de terceiros no Sul em vez de moer (Bento Gonçalves)',
    valorCapturadoRs: 1_400_000,
    status: 'realizado',
  },
  {
    id: 'vro-2025-08',
    data: '2025-08-12',
    categoria: 'compra',
    decisao: 'Recomendação do dia: antecipar 18% do trimestre + hedge de 60% + Make/Buy/Sell',
    /** Derivado: R$ 4,8M de compra+hedge somados ao valor da decisão de destino. */
    valorCapturadoRs:
      RECOMENDACAO_COMPRA.economiaTotalRs +
      RECOMENDACAO_HEDGE.protecaoEstimadaRs +
      BENEFICIO_MAKE_BUY_SELL_RS,
    status: 'projetado',
  },
]
