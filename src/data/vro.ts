/**
 * VRO — Realização de Valor. A tabela Recomendação × Decisão × Resultado é a
 * fonte; todos os agregados (CPV, hedge, EBITDA incremental, waterfall por
 * alavanca, curva acumulada, hit-rate) são DERIVADOS dela.
 *
 * Metodologia: IA recomenda, humano decide, resultado é medido — sem dupla
 * contagem (haircut de 15–20% já aplicado ao valor atribuído). Piloto desde
 * março/2025; run-rate dentro do business case de R$ 38–80M/ano.
 */
import type { AlavancaVRO, MetricasVRO, PontoCurvaVRO, RecomendacaoVRO, RegistroVRO } from './types'
import { RECOMENDACAO_COMPRA } from './compra'
import { RECOMENDACAO_HEDGE } from './hedge'

export const RECOMENDACOES_VRO: RecomendacaoVRO[] = [
  {
    id: 'vro-2025-08-12',
    data: '2025-08-12',
    titulo: 'Antecipar 18% do trimestre + hedge 60% (recomendação do dia)',
    alavanca: 'mercado-compra',
    recomendacaoIA: '32.000 t Argentina · Pecém a R$ 1.480/t + NDF US$ 23,5M a R$ 5,27',
    decisaoHumana: 'pendente',
    decisaoNota: 'Em alçada Finanças + Supply (> R$ 1M)',
    resultado: 'Projetado: R$ 1,3M no CPV + R$ 3,5M protegidos no cenário-base',
    valorCpvRs: RECOMENDACAO_COMPRA.economiaTotalRs,
    valorHedgeRs: RECOMENDACAO_HEDGE.protecaoEstimadaRs,
    status: 'projetado',
    confiancaPct: RECOMENDACAO_COMPRA.confiancaPct,
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

export const CPV_CAPTURADO_YTD_RS = realizadas.reduce((s, r) => s + r.valorCpvRs, 0) // R$ 14,0M
export const HEDGE_PROTEGIDO_YTD_RS = realizadas.reduce((s, r) => s + r.valorHedgeRs, 0) // R$ 5,4M

/** EBITDA incremental YTD = CPV + hedge (R$ 19,4M) — o número do cockpit. */
export const VALOR_CAPTURADO_YTD_RS = CPV_CAPTURADO_YTD_RS + HEDGE_PROTEGIDO_YTD_RS

/** Waterfall por alavanca (só CPV — hedge é KPI próprio, sem dupla contagem). */
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

/** Curva acumulada (CPV + hedge) vs meta linear do piso do business case (R$ 38M/ano). */
const META_ANUAL_RS = 38_000_000
const MESES = ['mar', 'abr', 'mai', 'jun', 'jul', 'ago'] as const
const MES_NUM: Record<string, string> = { mar: '03', abr: '04', mai: '05', jun: '06', jul: '07', ago: '08' }
export const CURVA_VRO: PontoCurvaVRO[] = MESES.map((mes, i) => {
  const ate = `2025-${MES_NUM[mes]}-31`
  const acumuladoRs = realizadas
    .filter((r) => r.data <= ate)
    .reduce((s, r) => s + r.valorCpvRs + r.valorHedgeRs, 0)
  return {
    mes,
    acumuladoRs,
    metaRs: Math.round((META_ANUAL_RS * (i + 1)) / 12),
    ...(mes === 'ago'
      ? { projetadoRs: acumuladoRs + RECOMENDACAO_COMPRA.economiaTotalRs + RECOMENDACAO_HEDGE.protecaoEstimadaRs }
      : {}),
  }
})

const MESES_DE_PILOTO = 5
export const METRICAS_VRO: MetricasVRO = {
  cpvCapturadoYtdRs: CPV_CAPTURADO_YTD_RS,
  hedgeProtegidoYtdRs: HEDGE_PROTEGIDO_YTD_RS,
  ebitdaIncrementalYtdRs: VALOR_CAPTURADO_YTD_RS,
  ebitdaIncrementalPp: Math.round((VALOR_CAPTURADO_YTD_RS / 10_440_000_000) * 100 * 100) / 100, // +0,19 p.p.
  runRateAnualRs: Math.round((VALOR_CAPTURADO_YTD_RS * 12) / MESES_DE_PILOTO / 1e6) * 1e6, // ~R$ 47M/ano
  acuraciaModeloPct: 84,
  hitRatePct: Math.round((executadas.filter((r) => r.valorCpvRs + r.valorHedgeRs > 0).length / executadas.length) * 100), // 88%
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
    id: 'vro-2025-08',
    data: '2025-08-12',
    categoria: 'compra',
    decisao: 'Recomendação do dia: antecipar 18% do trimestre + hedge de 60%',
    valorCapturadoRs: 4_800_000,
    status: 'projetado',
  },
]
