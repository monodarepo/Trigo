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

export const MOINHOS: Moinho[] = [
  { id: 'fortaleza', nome: 'Fortaleza', cidade: 'Fortaleza', uf: 'CE', capacidadeAnualKt: 220, portoPreferencialId: 'mucuripe', perfilProduto: ['biscoito', 'massa'], coordenadas: { lat: -3.73, lon: -38.52 } },
  { id: 'eusebio', nome: 'Eusébio', cidade: 'Eusébio', uf: 'CE', capacidadeAnualKt: 180, portoPreferencialId: 'pecem', perfilProduto: ['biscoito', 'cracker'], coordenadas: { lat: -3.89, lon: -38.45 } },
  { id: 'natal', nome: 'Natal', cidade: 'Natal', uf: 'RN', capacidadeAnualKt: 120, portoPreferencialId: 'natal', perfilProduto: ['massa', 'pao'], coordenadas: { lat: -5.79, lon: -35.21 } },
  { id: 'salvador', nome: 'Salvador', cidade: 'Salvador', uf: 'BA', capacidadeAnualKt: 150, portoPreferencialId: 'aratu', perfilProduto: ['massa', 'pao'], coordenadas: { lat: -12.97, lon: -38.5 } },
  { id: 'cabedelo', nome: 'Cabedelo', cidade: 'Cabedelo', uf: 'PB', capacidadeAnualKt: 110, portoPreferencialId: 'cabedelo', perfilProduto: ['biscoito', 'massa'], coordenadas: { lat: -6.97, lon: -34.84 } },
  { id: 'rolandia', nome: 'Rolândia', cidade: 'Rolândia', uf: 'PR', capacidadeAnualKt: 160, portoPreferencialId: 'pecem', perfilProduto: ['massa', 'pao'], coordenadas: { lat: -23.31, lon: -51.37 } },
  { id: 'bento-goncalves', nome: 'Bento Gonçalves', cidade: 'Bento Gonçalves', uf: 'RS', capacidadeAnualKt: 90, portoPreferencialId: 'pecem', perfilProduto: ['massa', 'pao'], coordenadas: { lat: -29.17, lon: -51.52 } },
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
