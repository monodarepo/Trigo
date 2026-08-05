/**
 * Estado da decisão do dia (client-side, sem backend): a aprovação feita no
 * modal reflete no Cockpit, na Compra, no one-pager e vira linha no VRO.
 */
import { useSyncExternalStore } from 'react'

export type ModoDecisao = 'aprovada' | 'ajustada' | 'encaminhada'

export interface DecisaoDoDia {
  modo: ModoDecisao
  comentario?: string
  /** Área/pessoa de destino quando encaminhada. */
  destino?: string
  /** Momento da decisão sobre a âncora do cenário (ex.: "07:02"). */
  horaRotulo: string
}

let decisao: DecisaoDoDia | null = null
const listeners = new Set<() => void>()

export function registrarDecisao(d: DecisaoDoDia) {
  decisao = d
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useDecisao(): DecisaoDoDia | null {
  return useSyncExternalStore(subscribe, () => decisao)
}

export const ROTULO_DECISAO: Record<ModoDecisao, string> = {
  aprovada: 'Aprovada',
  ajustada: 'Ajustada',
  encaminhada: 'Encaminhada',
}
