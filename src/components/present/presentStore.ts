/**
 * Estado global do modo apresentação: o CommandLayer suspende os atalhos
 * enquanto a apresentação roda; Topbar/palette disparam pelo bus.
 */
import { useSyncExternalStore } from 'react'

let ativo = false
const listeners = new Set<() => void>()

export function marcarApresentacao(valor: boolean) {
  ativo = valor
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useApresentacaoAtiva(): boolean {
  return useSyncExternalStore(subscribe, () => ativo)
}

const EVENTO_APRESENTACAO = 'torre:apresentar'

export function abrirApresentacao() {
  window.dispatchEvent(new Event(EVENTO_APRESENTACAO))
}

export function aoAbrirApresentacao(handler: () => void) {
  window.addEventListener(EVENTO_APRESENTACAO, handler)
  return () => window.removeEventListener(EVENTO_APRESENTACAO, handler)
}
