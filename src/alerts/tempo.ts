/**
 * "há Xs" — com DUAS origens de tempo, e isso não é acidente.
 *
 * O alerta semeado mede contra o instante do cenário (terça, 07:00); o que
 * chegou ao vivo mede contra o relógio da sessão. Misturar os dois faria a
 * chegada de 12 segundos atrás aparecer como "em 4 min", porque o timestamp
 * dela (07:04) está adiante da âncora.
 *
 * Vive fora dos componentes porque a Central e o drawer de detalhe precisam
 * dizer exatamente a mesma coisa sobre o mesmo alerta.
 */
import { DEMO_AGORA } from '../data/appContext'
import type { Alerta } from '../data/types'

const MS_POR_MINUTO = 60_000

/**
 * Hora sobre a ÂNCORA DO CENÁRIO, não o relógio da máquina: a trilha do VRO
 * precisa dizer "07:14" numa demo que começa às 07:00, e não a hora local de
 * quem está assistindo.
 */
export function horaDoCenario(segundosDeSessao: number): string {
  const base = new Date(Date.parse(DEMO_AGORA) + segundosDeSessao * 1000)
  return `${String(base.getHours()).padStart(2, '0')}:${String(base.getMinutes()).padStart(2, '0')}`
}

export function tempoRelativo(alerta: Alerta, segundosDeSessao: number): string {
  if (alerta.recebidoEmS != null) {
    const s = Math.max(0, segundosDeSessao - alerta.recebidoEmS)
    if (s < 60) return `há ${s}s`
    return `há ${Math.floor(s / 60)} min`
  }
  const minutos = Math.round((Date.parse(DEMO_AGORA) - Date.parse(alerta.timestamp)) / MS_POR_MINUTO)
  if (minutos < 1) return 'agora'
  if (minutos < 60) return `há ${minutos} min`
  const horas = Math.round(minutos / 60)
  if (horas < 24) return `há ${horas}h`
  return `há ${Math.round(horas / 24)}d`
}
