/**
 * Regiões de trigo monitoradas pelo painel Clima & Safra:
 * origens de compra + porto de destino do cenário-âncora.
 * A anomalia climática (seca/excesso) vira sinal de risco de safra/qualidade.
 */
import type { Clima } from './providers/weather'

export type PapelRegiao = 'origem' | 'porto'
export type NivelRisco = 'baixo' | 'medio' | 'alto'

export interface RegiaoTrigo {
  id: string
  rotulo: string
  papel: PapelRegiao
  lat: number
  lon: number
  /** Vínculo com a verdade única (origem/porto do snapshot). */
  origemId?: string
  portoId?: string
}

export const REGIOES_TRIGO: readonly RegiaoTrigo[] = [
  { id: 'pampas', rotulo: 'Pampas — Rosário (AR)', papel: 'origem', lat: -32.95, lon: -60.64, origemId: 'argentina' },
  { id: 'planicies', rotulo: 'Planícies — Kansas (EUA)', papel: 'origem', lat: 37.7, lon: -100.0, origemId: 'eua-golfo' },
  { id: 'mar-negro', rotulo: 'Mar Negro — Novorossiysk (RU)', papel: 'origem', lat: 44.7, lon: 37.8, origemId: 'russia' },
  { id: 'pecem', rotulo: 'Porto do Pecém (CE)', papel: 'porto', lat: -3.55, lon: -38.8, portoId: 'pecem' },
]

export interface RiscoClimatico {
  nivel: NivelRisco
  motivo: string
}

/**
 * Anomalia → risco (limiares determinísticos, documentados):
 *  · origem: < 10 mm em 16d = seca (alto) · > 90 mm = excesso, risco de
 *    qualidade FN/DON (médio) · senão regime normal (baixo);
 *  · porto:  > 120 mm em 16d = chuva pode atrasar descarga (médio).
 */
export function avaliarRiscoClimatico(papel: PapelRegiao, clima: Clima): RiscoClimatico {
  const chuva16d = (clima.previsao ?? []).reduce((s, p) => s + p.chuvaMm, 0)
  const mm = Math.round(chuva16d)
  if (papel === 'origem') {
    if (chuva16d < 10) return { nivel: 'alto', motivo: `seca — só ${mm} mm previstos em 16 dias` }
    if (chuva16d > 90) return { nivel: 'medio', motivo: `excesso de chuva (${mm} mm/16d) — risco de qualidade (FN/DON)` }
    return { nivel: 'baixo', motivo: `regime normal (${mm} mm/16d)` }
  }
  if (chuva16d > 120) return { nivel: 'medio', motivo: `chuva forte (${mm} mm/16d) pode atrasar a descarga` }
  return { nivel: 'baixo', motivo: `janela de descarga aberta (${mm} mm/16d)` }
}
