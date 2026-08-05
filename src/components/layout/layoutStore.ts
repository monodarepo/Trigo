/**
 * Preferências de layout da sessão (sem localStorage — estado em memória):
 *  - densidade: "comfortable" (executivos) | "compact" (operadores) — aplica
 *    CSS vars via data-attribute na raiz (paddings, linhas de tabela, KPIs);
 *  - mural: modo telão/command center — esconde a sidebar e maximiza dados.
 */
import { useSyncExternalStore } from 'react'

export type Densidade = 'comfortable' | 'compact'

interface LayoutState {
  densidade: Densidade
  mural: boolean
}

let state: LayoutState = { densidade: 'comfortable', mural: false }
const listeners = new Set<() => void>()

function aplicarDensidade() {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.densidade = state.densidade
  }
}
aplicarDensidade()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function definirDensidade(densidade: Densidade) {
  state = { ...state, densidade }
  aplicarDensidade()
  emit()
}

export function alternarDensidade() {
  definirDensidade(state.densidade === 'compact' ? 'comfortable' : 'compact')
}

export function alternarMural() {
  state = { ...state, mural: !state.mural }
  emit()
}

export function useDensidade(): Densidade {
  return useSyncExternalStore(subscribe, () => state.densidade)
}

export function useMural(): boolean {
  return useSyncExternalStore(subscribe, () => state.mural)
}
