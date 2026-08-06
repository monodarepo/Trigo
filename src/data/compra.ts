import type { EstoqueMoinho, RecomendacaoCompra } from './types'
import { PRECOS_ATUAIS } from './mercado'
import { TLC_BASELINE_RS, TLC_RECOMENDADO_RS } from './tlc'

/** Volume ainda a comprar no trimestre corrente (T4 civil / pré-safra local). */
export const VOLUME_TRIMESTRE_T = 178_000

/**
 * Custo landed orçado para o trimestre (R$/t de trigo). É a referência contra
 * a qual o CFO mede o desvio — diferente do baseline de R$ 1.520/t, que é o
 * cenário de NÃO agir. Confundir os dois faz o mesmo lote parecer economia
 * (vs baseline) e estouro (vs orçamento) sem que ninguém note que são réguas
 * distintas: o baseline é uma previsão, o orçamento é um compromisso.
 */
export const ORCAMENTO_TRIGO_RS_T = 1_450

/**
 * Posição de estoque por moinho (dias de cobertura vs política mínima).
 * Natal já reflete o atraso de +6 dias do MV Río Paraná (19 dias);
 * Fortaleza está abaixo da política (21 < 30) — ambos geram alertas.
 */
export const ESTOQUE_MOINHOS: EstoqueMoinho[] = [
  { moinhoId: 'fortaleza', estoqueToneladas: 14_000, coberturaDias: 21, politicaMinimaDias: 30 },
  { moinhoId: 'eusebio', estoqueToneladas: 15_300, coberturaDias: 28, politicaMinimaDias: 30 },
  { moinhoId: 'natal', estoqueToneladas: 6_900, coberturaDias: 19, politicaMinimaDias: 30 },
  { moinhoId: 'salvador', estoqueToneladas: 15_000, coberturaDias: 33, politicaMinimaDias: 30 },
  { moinhoId: 'cabedelo', estoqueToneladas: 8_000, coberturaDias: 24, politicaMinimaDias: 30 },
  { moinhoId: 'rolandia', estoqueToneladas: 19_900, coberturaDias: 41, politicaMinimaDias: 35 },
  { moinhoId: 'bento-goncalves', estoqueToneladas: 10_400, coberturaDias: 38, politicaMinimaDias: 35 },
]

export const COBERTURA_MEDIA_DIAS = Math.round(
  ESTOQUE_MOINHOS.reduce((soma, e) => soma + e.coberturaDias, 0) / ESTOQUE_MOINHOS.length,
)

const ECONOMIA_RS_T = TLC_BASELINE_RS - TLC_RECOMENDADO_RS // R$ 40/t

/**
 * A recomendação do dia (cenário-âncora): antecipar 18% do volume do
 * trimestre (32.000 t de 178.000 t) via Argentina · Pecém, blend 65/35.
 */
export const RECOMENDACAO_COMPRA: RecomendacaoCompra = {
  id: 'rec-compra-2025-08-12',
  criadaEm: '2025-08-12T06:45:00',
  acao: 'comprar',
  origemId: 'argentina',
  portoId: 'pecem',
  fornecedorId: 'molinos-del-plata',
  volumeToneladas: 32_000,
  janelaDias: 5,
  blend: [
    { origemId: 'argentina', pct: 65 },
    { origemId: 'eua-golfo', pct: 35 },
  ],
  tlcRs: TLC_RECOMENDADO_RS,
  baselineRs: TLC_BASELINE_RS,
  economiaRsT: ECONOMIA_RS_T,
  economiaTotalRs: 32_000 * ECONOMIA_RS_T, // R$ 1,28M
  probAlta15dPct: PRECOS_ATUAIS.probAltaTrigo15dPct,
  confiancaPct: 87,
  anteciparPctTrimestre: 18,
  volumeTrimestreToneladas: VOLUME_TRIMESTRE_T,
  racional:
    'Probabilidade de 72% de alta do trigo em 15 dias (safra argentina revisada para baixo e seca no Mar Negro), ' +
    'janela de frete Up River de 5 dias antes da disputa com embarques de milho e fila curta em Pecém. ' +
    'Antecipar 18% do trimestre trava TLC de R$ 1.480/t vs baseline de R$ 1.520/t (economia de R$ 40/t, R$ 1,28M no lote) ' +
    'e recompõe a cobertura de Fortaleza e Natal, hoje abaixo da política. ' +
    'Blend 65% Argentina + 35% EUA (HRW) mantém W médio ≥ 290 e proteína ≥ 11,8% para o mix de massas e pães.',
  distribuicaoMoinhos: [
    { moinhoId: 'fortaleza', toneladas: 12_000, coberturaAtualDias: 21, coberturaAposDias: 39 },
    { moinhoId: 'eusebio', toneladas: 8_000, coberturaAtualDias: 28, coberturaAposDias: 43 },
    { moinhoId: 'natal', toneladas: 7_000, coberturaAtualDias: 19, coberturaAposDias: 38 },
    { moinhoId: 'cabedelo', toneladas: 5_000, coberturaAtualDias: 24, coberturaAposDias: 39 },
  ],
  alternativasRejeitadas: [
    { origemId: 'eua-golfo', motivo: 'TLC de R$ 1.736/t (+R$ 256/t vs Argentina) com imposto extra-Mercosul; manter HRW apenas na parcela de 35% do blend.' },
    { origemId: 'russia', motivo: 'DON de 1.800 ppb acima da política para biscoito e trânsito de 26 dias no Mar Negro.' },
    { origemId: 'uruguai', motivo: 'Somente 12.000 t disponíveis na janela — não cobre as 32.000 t necessárias.' },
    { origemId: 'brasil', motivo: 'W 190 não atende massas e pães; frete RS → Nordeste anula a vantagem de preço.' },
  ],
}
