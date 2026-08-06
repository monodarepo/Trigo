/**
 * O VOCABULÁRIO DAS AÇÕES: para quem se atribui e por quanto tempo se adia.
 *
 * A área sugerida sai da CATEGORIA do alerta, não de um campo digitado no
 * catálogo: um alerta de câmbio é da Tesouraria e um de moagem é da Indústria
 * por definição do domínio, e manter isso derivado significa que um alerta
 * novo já nasce com dono certo — sem ninguém lembrar de preencher.
 */
import type { CategoriaAlerta } from '../data/types'

export const AREAS = [
  'Suprimentos',
  'Tesouraria/CFO',
  'Logística',
  'Indústria (Moagem)',
  'Comercial de Farinha',
  'Qualidade',
  'Planejamento de Demanda',
] as const

export type Area = (typeof AREAS)[number]

export const AREA_SUGERIDA: Record<CategoriaAlerta, Area> = {
  mercado: 'Suprimentos',
  cambio: 'Tesouraria/CFO',
  hedge: 'Tesouraria/CFO',
  safra: 'Suprimentos',
  logistica: 'Logística',
  estoque: 'Suprimentos',
  qualidade: 'Qualidade',
  moagem: 'Indústria (Moagem)',
  farinha: 'Comercial de Farinha',
  comercial: 'Comercial de Farinha',
}

/**
 * Períodos de adiamento na unidade em que a mesa de fato reavalia — pregão,
 * dia, semana. "Adiar 30 minutos" existiria só para o alerta voltar antes de
 * qualquer dado ter mudado.
 */
export const PERIODOS_ADIAMENTO = [
  { id: 'pregao', rotulo: 'Até o próximo pregão', horas: 18 },
  { id: 'dia', rotulo: '24 horas', horas: 24 },
  { id: 'tres-dias', rotulo: '3 dias', horas: 72 },
  { id: 'semana', rotulo: '1 semana', horas: 168 },
] as const

export type PeriodoAdiamento = (typeof PERIODOS_ADIAMENTO)[number]
