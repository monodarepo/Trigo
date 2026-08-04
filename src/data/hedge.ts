import type { PosicaoHedge, RecomendacaoHedge } from './types'
import { PRECOS_ATUAIS } from './mercado'
import { SERIE_CAMBIO } from './previsao'

/** Limite de câmbio da política de riscos (gatilho de alerta). */
export const POLITICA_CAMBIO_LIMITE = 5.25

/** Premissa orçamentária: câmbio orçado do ano. Teto da banda (±3%) ≈ limite de política. */
export const CAMBIO_ORCADO = 5.1
export const BANDA_ORCAMENTO_PCT = 3

/** Exposição cambial por bucket de prazo (compras a pagar em US$). */
export const POSICOES_HEDGE: PosicaoHedge[] = [
  { bucketPrazo: '0-30', expostoUsd: 24_000_000, cobertoPct: 45, instrumento: 'NDF' },
  { bucketPrazo: '31-60', expostoUsd: 28_000_000, cobertoPct: 24, instrumento: 'NDF' },
  { bucketPrazo: '61-90', expostoUsd: 20_000_000, cobertoPct: 10, instrumento: 'NDF' },
  { bucketPrazo: '91-180', expostoUsd: 36_000_000, cobertoPct: 8 },
]

const BUCKETS_90D = POSICOES_HEDGE.filter((p) => p.bucketPrazo !== '91-180')

export const EXPOSICAO_90D_USD = BUCKETS_90D.reduce((soma, p) => soma + p.expostoUsd, 0) // US$ 72M

/** Cobertura atual ponderada no horizonte de 90 dias (~27%). */
export const COBERTURA_ATUAL_90D_PCT = Math.round(
  BUCKETS_90D.reduce((soma, p) => soma + p.expostoUsd * (p.cobertoPct / 100), 0) /
    EXPOSICAO_90D_USD *
    100,
)

/**
 * Recomendação do dia (cenário-âncora): elevar a cobertura de 27% para 60%
 * do horizonte de 90 dias — proteger 60% da exposição cambial.
 * Proteção estimada: US$ 23,5M × (R$ 5,35 − R$ 5,20) ≈ R$ 3,52M.
 */
export const RECOMENDACAO_HEDGE: RecomendacaoHedge = {
  id: 'rec-hedge-2025-08-12',
  criadaEm: '2025-08-12T06:45:00',
  horizonteDias: 90,
  exposicaoUsd: EXPOSICAO_90D_USD,
  coberturaAtualPct: COBERTURA_ATUAL_90D_PCT,
  coberturaAlvoPct: 60,
  notionalNovoUsd: 23_500_000,
  instrumento: 'NDF 90 dias',
  taxaForwardMedia: 5.27,
  cenarioCambioD90: SERIE_CAMBIO.horizontes.d90.valor, // R$ 5,35
  protecaoEstimadaRs: 3_520_000,
  varAntesRs: 8_400_000,
  varDepoisRs: 3_900_000,
  racional:
    `Dólar a R$ ${PRECOS_ATUAIS.cambioBrlUsd.toFixed(2).replace('.', ',')}, a 1% do limite de política (R$ 5,25), ` +
    'com projeção de R$ 5,35 em 90 dias e banda até R$ 5,60. O NDF de 90 dias a R$ 5,27 ainda embute ' +
    'desconto vs cenário-base — a janela fecha se o mercado precificar o risco fiscal. ' +
    'Elevar a cobertura de 27% para 60% (US$ 23,5M novos) reduz o VaR cambial de R$ 8,4M para R$ 3,9M ' +
    'e protege ~R$ 3,5M no cenário-base.',
}
