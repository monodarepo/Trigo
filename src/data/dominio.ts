import type { Fornecedor, Moinho, Origem, Porto } from './types'

/** Referência financeira (âncoras do CLAUDE.md). */
export const FINANCEIRO = {
  receitaAnualRs: 10_440_000_000,
  ebitdaAnualRs: 1_100_000_000,
  ebitdaYtdRs: 642_000_000,
  margemEbitdaPct: 10.6,
  volumeTrigoAnualToneladas: 1_000_000,
  custoLandedAnualRs: 1_430_000_000,
  /** ±10% no preço do trigo ≈ ±R$ 145M no CPV. */
  sensibilidadeTrigo10PctRs: 145_000_000,
  materiasPrimasPctReceita: 44.8,
} as const

export const ORIGENS: Origem[] = [
  {
    id: 'argentina',
    nome: 'Argentina',
    pais: 'Argentina',
    mercosul: true,
    classeTrigo: 'Pan — hard médio',
    faixaW: [250, 300],
    faixaProteina: [10.5, 12],
    transitoDias: 12,
  },
  {
    id: 'eua-golfo',
    nome: 'EUA-Golfo (HRW/HRS)',
    pais: 'Estados Unidos',
    mercosul: false,
    classeTrigo: 'HRW/HRS — hard alto W',
    faixaW: [300, 350],
    faixaProteina: [11.5, 14],
    transitoDias: 18,
  },
  {
    id: 'canada',
    nome: 'Canadá (CWRS)',
    pais: 'Canadá',
    mercosul: false,
    classeTrigo: 'CWRS — hard premium',
    faixaW: [320, 350],
    faixaProteina: [12.5, 14],
    transitoDias: 22,
  },
  {
    id: 'russia',
    nome: 'Rússia (Mar Negro)',
    pais: 'Rússia',
    mercosul: false,
    classeTrigo: 'Milling — hard médio, qualidade variável',
    faixaW: [220, 280],
    faixaProteina: [11, 12.5],
    transitoDias: 26,
  },
  {
    id: 'uruguai',
    nome: 'Uruguai',
    pais: 'Uruguai',
    mercosul: true,
    classeTrigo: 'Pan — hard médio',
    faixaW: [230, 270],
    faixaProteina: [10.5, 11.5],
    transitoDias: 10,
  },
  {
    id: 'brasil',
    nome: 'Brasil (RS/PR)',
    pais: 'Brasil',
    mercosul: true,
    classeTrigo: 'Pão/doméstico — W médio-baixo',
    faixaW: [160, 220],
    faixaProteina: [9.5, 11],
    transitoDias: 0,
  },
]

export const FORNECEDORES: Fornecedor[] = [
  { id: 'molinos-del-plata', nome: 'Molinos del Plata', origemId: 'argentina', rating: 'A', volumeAnualKt: 320 },
  { id: 'pampa-agro', nome: 'Pampa Agroexport', origemId: 'argentina', rating: 'A', volumeAnualKt: 260 },
  { id: 'gulf-harvest', nome: 'Gulf Harvest Trading', origemId: 'eua-golfo', rating: 'A', volumeAnualKt: 410 },
  { id: 'prairie-gold', nome: 'Prairie Gold Grain', origemId: 'canada', rating: 'A', volumeAnualKt: 180 },
  { id: 'azov-commodities', nome: 'Azov Commodities', origemId: 'russia', rating: 'B', volumeAnualKt: 520 },
  { id: 'cereales-del-este', nome: 'Cereales del Este', origemId: 'uruguai', rating: 'B', volumeAnualKt: 90 },
  { id: 'coop-triticola-rs', nome: 'Cooperativa Tritícola RS', origemId: 'brasil', rating: 'B', volumeAnualKt: 140 },
]

export const PORTOS: Porto[] = [
  { id: 'pecem', nome: 'Pecém', uf: 'CE', filaNavios: 2, custoPortuarioRsT: 16.6, capacidadeMensalKt: 120, coordenadas: { lat: -3.55, lon: -38.8 } },
  { id: 'mucuripe', nome: 'Mucuripe', uf: 'CE', filaNavios: 0, custoPortuarioRsT: 15.2, capacidadeMensalKt: 60, coordenadas: { lat: -3.72, lon: -38.48 } },
  { id: 'suape', nome: 'Suape', uf: 'PE', filaNavios: 1, custoPortuarioRsT: 15.9, capacidadeMensalKt: 100, coordenadas: { lat: -8.39, lon: -34.97 } },
  { id: 'aratu', nome: 'Aratu-Salvador', uf: 'BA', filaNavios: 1, custoPortuarioRsT: 17.1, capacidadeMensalKt: 80, coordenadas: { lat: -12.79, lon: -38.44 } },
  { id: 'cabedelo', nome: 'Cabedelo', uf: 'PB', filaNavios: 0, custoPortuarioRsT: 18.4, capacidadeMensalKt: 50, coordenadas: { lat: -6.97, lon: -34.83 } },
  { id: 'natal', nome: 'Natal', uf: 'RN', filaNavios: 1, custoPortuarioRsT: 19.2, capacidadeMensalKt: 40, coordenadas: { lat: -5.77, lon: -35.19 } },
]

/**
 * Economia da moagem — constantes do elo trigo → farinha (CLAUDE.md § Modelo
 * econômico). Nenhum outro arquivo redefine estes valores.
 */
export const ECONOMIA_MOAGEM = {
  /** Preço do farelo e subprodutos (R$/t) — receita que ABATE o custo da farinha. */
  precoFareloRsT: 682,
  /** Custo de servir padrão da venda externa (R$/t): frete ao cliente,
   * comissão, embalagem industrial e risco de crédito. */
  custoServirRsT: 120,
  /** Parcela VARIÁVEL de conversão + energia + perdas — base do custo marginal.
   * O restante é fixo e só é absorvido com o moinho rodando. */
  parcelaVariavel: 0.72,
} as const

const arred1 = (v: number) => Math.round(v * 10) / 10

/**
 * Crédito do farelo por tonelada de FARINHA, dado o rendimento (%).
 * Moer 1 t de farinha consome 1/rendimento t de trigo e gera
 * (1/rendimento − 1) t de farelo, vendido a `precoFareloRsT`.
 *
 * O campo `Moinho.creditoFareloRsT` guarda o valor no rendimento BASE do
 * moinho — é a referência de ficha técnica. O crédito que entra no custo é
 * sempre recalculado por esta função com o rendimento EFETIVO da spec
 * (base + ajuste da farinha), porque farinha mais refinada rende menos farinha
 * e, portanto, gera mais farelo. Os dois divergem de propósito.
 */
export function creditoFareloRsT(rendimentoPct: number): number {
  return arred1((100 / rendimentoPct - 1) * ECONOMIA_MOAGEM.precoFareloRsT)
}

/** Custo marginal de moer +1 t de farinha (R$/t) — só a parcela variável. */
function custoMarginal(conversao: number, energia: number, perdas: number): number {
  return arred1((conversao + energia + perdas) * ECONOMIA_MOAGEM.parcelaVariavel)
}

/**
 * Os 7 moinhos com os parâmetros de moagem. Fortaleza é o moinho-âncora do
 * cenário: com o SEU TLC (Argentina · Mucuripe · FOB = R$ 1.473,4/t, calculado
 * pelo motor de TLC) e a farinha de massas, a composição fecha exatamente no
 * custo interno canônico de R$ 2.100/t (ver economics.ts). Atenção: os
 * R$ 1.480/t do cenário-âncora são outra coisa — o TLC do LOTE recomendado
 * (Argentina · Pecém), que desembarca em Eusébio; não confundir os dois.
 *
 * `rendimentoPct` = farinha total sobre trigo moído; `extracaoPct` = parcela
 * refinada (patente), sempre menor — o restante sai como farinha segunda.
 *
 * Capacidade instalada total: 100.300 t de trigo/mês (1.203 kt/ano). Com a
 * demanda consolidada de ~84 kt/mês (demanda.ts), sobra folga real para venda
 * externa — as capacidades antigas (85,8 kt/mês) davam 97,9% de ocupação e
 * tornavam fictícia qualquer capacidade ociosa.
 */
export const MOINHOS: Moinho[] = [
  {
    id: 'fortaleza', nome: 'Fortaleza', cidade: 'Fortaleza', uf: 'CE', capacidadeAnualKt: 257,
    portoPreferencialId: 'mucuripe', perfilProduto: ['biscoito', 'massa'],
    coordenadas: { lat: -3.73, lon: -38.52 },
    rendimentoPct: 76.0, extracaoPct: 72.5, capacidadeMensalT: 21_400, utilizacaoPct: 88,
    // Calibrado para o TLC REAL de Fortaleza (Argentina · Mucuripe · FOB =
    // R$ 1.473,4/t pelo motor de TLC): 1.473,4 ÷ 0,76 + 184 + 100,7 + 44 + 48
    // − 215,4 = R$ 2.100,0/t, o custo interno canônico do CLAUDE.md.
    custoConversaoRsT: 184, energiaManutRsT: 100.7, perdasFinanceiroRsT: 44,
    creditoFareloRsT: creditoFareloRsT(76.0), custoMarginalRsT: custoMarginal(184, 100.7, 44),
    depreciacaoRsT: 48,
  },
  {
    id: 'eusebio', nome: 'Eusébio', cidade: 'Eusébio', uf: 'CE', capacidadeAnualKt: 210,
    portoPreferencialId: 'pecem', perfilProduto: ['biscoito', 'cracker'],
    coordenadas: { lat: -3.89, lon: -38.45 },
    rendimentoPct: 76.8, extracaoPct: 73.4, capacidadeMensalT: 17_500, utilizacaoPct: 91,
    custoConversaoRsT: 174, energiaManutRsT: 92, perdasFinanceiroRsT: 39,
    creditoFareloRsT: creditoFareloRsT(76.8), custoMarginalRsT: custoMarginal(174, 92, 39),
    depreciacaoRsT: 44,
  },
  {
    id: 'natal', nome: 'Natal', cidade: 'Natal', uf: 'RN', capacidadeAnualKt: 140,
    portoPreferencialId: 'natal', perfilProduto: ['massa', 'pao'],
    coordenadas: { lat: -5.79, lon: -35.21 },
    rendimentoPct: 74.5, extracaoPct: 70.8, capacidadeMensalT: 11_700, utilizacaoPct: 79,
    custoConversaoRsT: 196, energiaManutRsT: 108, perdasFinanceiroRsT: 48,
    creditoFareloRsT: creditoFareloRsT(74.5), custoMarginalRsT: custoMarginal(196, 108, 48),
    depreciacaoRsT: 54,
  },
  {
    id: 'salvador', nome: 'Salvador', cidade: 'Salvador', uf: 'BA', capacidadeAnualKt: 175,
    portoPreferencialId: 'aratu', perfilProduto: ['massa', 'pao'],
    coordenadas: { lat: -12.97, lon: -38.5 },
    rendimentoPct: 75.6, extracaoPct: 72.0, capacidadeMensalT: 14_600, utilizacaoPct: 84,
    custoConversaoRsT: 186, energiaManutRsT: 101, perdasFinanceiroRsT: 44,
    creditoFareloRsT: creditoFareloRsT(75.6), custoMarginalRsT: custoMarginal(186, 101, 44),
    depreciacaoRsT: 50,
  },
  {
    id: 'cabedelo', nome: 'Cabedelo', cidade: 'Cabedelo', uf: 'PB', capacidadeAnualKt: 128,
    portoPreferencialId: 'cabedelo', perfilProduto: ['biscoito', 'massa'],
    coordenadas: { lat: -6.97, lon: -34.84 },
    rendimentoPct: 75.0, extracaoPct: 71.4, capacidadeMensalT: 10_700, utilizacaoPct: 76,
    custoConversaoRsT: 192, energiaManutRsT: 104, perdasFinanceiroRsT: 46,
    creditoFareloRsT: creditoFareloRsT(75.0), custoMarginalRsT: custoMarginal(192, 104, 46),
    depreciacaoRsT: 52,
  },
  {
    id: 'rolandia', nome: 'Rolândia', cidade: 'Rolândia', uf: 'PR', capacidadeAnualKt: 187,
    portoPreferencialId: 'pecem', perfilProduto: ['massa', 'pao'],
    coordenadas: { lat: -23.31, lon: -51.37 },
    rendimentoPct: 77.2, extracaoPct: 73.9, capacidadeMensalT: 15_600, utilizacaoPct: 86,
    custoConversaoRsT: 168, energiaManutRsT: 88, perdasFinanceiroRsT: 37,
    creditoFareloRsT: creditoFareloRsT(77.2), custoMarginalRsT: custoMarginal(168, 88, 37),
    depreciacaoRsT: 42,
  },
  {
    id: 'bento-goncalves', nome: 'Bento Gonçalves', cidade: 'Bento Gonçalves', uf: 'RS', capacidadeAnualKt: 106,
    portoPreferencialId: 'pecem', perfilProduto: ['massa', 'pao'],
    coordenadas: { lat: -29.17, lon: -51.52 },
    rendimentoPct: 74.0, extracaoPct: 70.2, capacidadeMensalT: 8_800, utilizacaoPct: 71,
    custoConversaoRsT: 204, energiaManutRsT: 114, perdasFinanceiroRsT: 52,
    creditoFareloRsT: creditoFareloRsT(74.0), custoMarginalRsT: custoMarginal(204, 114, 52),
    depreciacaoRsT: 58,
  },
]

export function getMoinho(id: string): Moinho | undefined {
  return MOINHOS.find((m) => m.id === id)
}

export function getPorto(id: string): Porto | undefined {
  return PORTOS.find((p) => p.id === id)
}

export function getOrigem(id: string): Origem | undefined {
  return ORIGENS.find((o) => o.id === id)
}

export function getFornecedor(id: string): Fornecedor | undefined {
  return FORNECEDORES.find((f) => f.id === id)
}
