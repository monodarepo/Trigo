/**
 * Elo 3 — DEMANDA: do plano de vendas do produto acabado à tonelada de trigo.
 *
 * É a ponte que faz Marketing, Indústria e Suprimentos falarem a mesma língua:
 * t de biscoito vendido → t de farinha necessária → t de trigo a comprar. O
 * total fecha em ~84 kt de trigo/mês (~1 Mt/ano), a âncora de volume do
 * CLAUDE.md, e alimenta o volume do trimestre da tela de Compra.
 */
import type { DemandaFarinha, FamiliaProduto, FarinhaId, MoinhoId, PontoCalendarioDemanda } from './types'
import { rendimentoEfetivoPct } from './economics'

/** Meses do horizonte de planejamento (a partir do cenário-âncora de ago/25). */
const MESES = ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02']

interface EntradaFamilia {
  familia: FamiliaProduto
  rotulo: string
  farinhaId: FarinhaId
  /** Plano de vendas do produto acabado (t/mês). */
  planoVendasT: number
  /** t de farinha por t de produto acabado (receita média da família). */
  fatorFarinha: number
  estoqueSegurancaDias: number
  /** O primeiro moinho é o principal — define o rendimento da conversão. */
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
    moinhosAtendem: ['natal', 'salvador', 'rolandia'],
    sazonalidade: [1.0, 1.02, 1.04, 1.03, 0.97, 0.99],
  },
  {
    familia: 'bolos',
    rotulo: 'Bolos e misturas',
    farinhaId: 'bolo',
    planoVendasT: 16_400,
    fatorFarinha: 0.55,
    estoqueSegurancaDias: 10,
    moinhosAtendem: ['eusebio', 'cabedelo'],
    sazonalidade: [1.0, 1.08, 1.18, 1.1, 0.9, 0.94],
  },
  {
    familia: 'torradas',
    rotulo: 'Torradas e snacks',
    farinhaId: 'cracker',
    planoVendasT: 8_100,
    fatorFarinha: 0.86,
    estoqueSegurancaDias: 10,
    moinhosAtendem: ['fortaleza', 'salvador'],
    sazonalidade: [1.0, 1.01, 1.03, 1.02, 0.98, 1.0],
  },
]

function montarDemanda(e: EntradaFamilia): DemandaFarinha {
  const necessidadeFarinhaT = Math.round(e.planoVendasT * e.fatorFarinha)
  // O rendimento do moinho principal converte farinha em trigo equivalente.
  const rendimento = rendimentoEfetivoPct(e.moinhosAtendem[0], e.farinhaId)
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

/** Necessidade consolidada de farinha (t/mês) das 4 famílias. */
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

/** Calendário consolidado das 4 famílias, mês a mês. */
export const CALENDARIO_DEMANDA: PontoCalendarioDemanda[] = MESES.map((mes, i) => ({
  mes,
  farinhaT: DEMANDA_FARINHA.reduce((soma, d) => soma + d.calendario[i].farinhaT, 0),
  trigoT: DEMANDA_FARINHA.reduce((soma, d) => soma + d.calendario[i].trigoT, 0),
}))
