import type { AlternativaCompra, ComponenteTLC } from './types'
import { MV_RIO_PARANA } from './logistica'

/** Baseline: comprar no fluxo normal em ~30 dias (preço projetado + frete cheio). */
export const TLC_BASELINE_RS = 1520

/**
 * Decomposição do TLC da alternativa recomendada
 * (Argentina · Pecém · 32.000 t), em R$/t. Câmbio de conversão: R$ 5,20/US$.
 */
export const COMPONENTES_TLC_RECOMENDADO: ComponenteTLC[] = [
  { rotulo: 'FOB trigo (CBOT)', valorRs: 1066.0, tipo: 'fob', descricao: 'US$ 205/t × R$ 5,20' },
  { rotulo: 'Prêmio origem Argentina 11,5%', valorRs: 249.6, tipo: 'premio', descricao: 'US$ 48/t × R$ 5,20 — FOB total US$ 253/t' },
  { rotulo: 'Frete marítimo Up River → Pecém', valorRs: 98.8, tipo: 'frete', descricao: 'US$ 19/t × R$ 5,20' },
  { rotulo: 'Seguro da carga', valorRs: 3.9, tipo: 'seguro', descricao: '~0,3% do CIF' },
  { rotulo: 'AFRMM (8% do frete)', valorRs: 7.9, tipo: 'taxa' },
  { rotulo: 'Imposto de importação (Mercosul)', valorRs: 0, tipo: 'imposto', descricao: '0% intra-Mercosul (10% extra-Mercosul)' },
  { rotulo: 'Despesas portuárias (Pecém)', valorRs: 16.6, tipo: 'porto' },
  { rotulo: 'Demurrage (risco esperado)', valorRs: 5.8, tipo: 'risco', descricao: `Fila de 2 navios em Pecém e atraso do ${MV_RIO_PARANA.navio} elevam o risco da janela` },
  { rotulo: 'Armazenagem portuária', valorRs: 4.9, tipo: 'armazenagem' },
  { rotulo: 'Transporte interno porto → moinho', valorRs: 9.8, tipo: 'transporte' },
  { rotulo: 'Proteção cambial (custo NDF)', valorRs: 3.2, tipo: 'cambio' },
  { rotulo: 'Custo de capital (~40 dias)', valorRs: 13.5, tipo: 'capital' },
]

/** TLC recomendado derivado da soma dos componentes (R$ 1.480/t). */
export const TLC_RECOMENDADO_RS = Math.round(
  COMPONENTES_TLC_RECOMENDADO.reduce((soma, c) => soma + c.valorRs, 0),
)

/**
 * Alternativas comparadas pelo otimizador. A primeira é a recomendada;
 * deltaVsBaselineRs compara com o baseline de R$ 1.520/t.
 */
export const ALTERNATIVAS_COMPRA: AlternativaCompra[] = [
  {
    id: 'alt-argentina-pecem',
    origemId: 'argentina',
    portoId: 'pecem',
    fornecedorId: 'molinos-del-plata',
    fobUsd: 253,
    freteUsd: 19,
    impostoPct: 0,
    tlcRs: TLC_RECOMENDADO_RS,
    deltaVsBaselineRs: TLC_RECOMENDADO_RS - TLC_BASELINE_RS,
    qualidade: { proteina: 11.5, w: 280, fallingNumber: 320, pl: 0.9, pesoHectolitrico: 79, umidade: 12.5, cinzas: 1.55, don: 600 },
    atendeEspec: true,
    volumeDisponivelToneladas: 45_000,
    recomendada: true,
    observacao: 'Janela de frete de 5 dias antes da disputa com embarques de milho.',
  },
  {
    id: 'alt-eua-suape',
    origemId: 'eua-golfo',
    portoId: 'suape',
    fornecedorId: 'gulf-harvest',
    fobUsd: 262,
    freteUsd: 28,
    impostoPct: 10,
    tlcRs: 1736,
    deltaVsBaselineRs: 216,
    qualidade: { proteina: 12.5, w: 320, fallingNumber: 340, pl: 1.1, pesoHectolitrico: 80, umidade: 12, cinzas: 1.5, don: 400 },
    atendeEspec: true,
    volumeDisponivelToneladas: 30_000,
    observacao: 'Imposto de 10% extra-Mercosul pesa; manter HRW apenas na parcela de blend.',
  },
  {
    id: 'alt-russia-suape',
    origemId: 'russia',
    portoId: 'suape',
    fornecedorId: 'azov-commodities',
    fobUsd: 231,
    freteUsd: 31,
    impostoPct: 10,
    tlcRs: 1581,
    deltaVsBaselineRs: 61,
    qualidade: { proteina: 12, w: 260, fallingNumber: 280, pl: 1.0, pesoHectolitrico: 78, umidade: 13, cinzas: 1.6, don: 1800 },
    atendeEspec: false,
    volumeDisponivelToneladas: 27_000,
    observacao: 'DON de 1.800 ppb acima da política para biscoito; trânsito de 26 dias.',
  },
  {
    id: 'alt-uruguai-cabedelo',
    origemId: 'uruguai',
    portoId: 'cabedelo',
    fornecedorId: 'cereales-del-este',
    fobUsd: 256,
    freteUsd: 20,
    impostoPct: 0,
    tlcRs: 1507,
    deltaVsBaselineRs: -13,
    qualidade: { proteina: 11, w: 250, fallingNumber: 300, pl: 0.85, pesoHectolitrico: 78, umidade: 13, cinzas: 1.55, don: 700 },
    atendeEspec: true,
    volumeDisponivelToneladas: 12_000,
    observacao: 'Apenas 12.000 t disponíveis na janela — não cobre a necessidade.',
  },
  {
    id: 'alt-brasil-rs',
    origemId: 'brasil',
    fornecedorId: 'coop-triticola-rs',
    impostoPct: 0,
    tlcRs: 1425,
    deltaVsBaselineRs: -95,
    qualidade: { proteina: 10.5, w: 190, fallingNumber: 250, pl: 0.7, pesoHectolitrico: 77, umidade: 13.5, cinzas: 1.5, don: 900 },
    atendeEspec: false,
    volumeDisponivelToneladas: 8_000,
    observacao: 'Compra doméstica (RS, rodoviário). W 190 só atende biscoito; frete ao Nordeste anula a vantagem.',
  },
]
