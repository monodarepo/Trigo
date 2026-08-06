/**
 * Abertura da Central de Alertas — store mínimo, separado do painel.
 *
 * Fica fora de `AlertCenter.tsx` de propósito: o sino, a faixa crítica, a
 * paleta de comandos e o atalho de teclado precisam ABRIR a Central sem
 * importar o painel (e, com ele, framer-motion e a árvore inteira). Quem só
 * dispara importa este arquivo; quem desenha importa o painel.
 */
import { useSyncExternalStore } from 'react'

let aberta = false
const listeners = new Set<() => void>()

function emitir() {
  for (const l of listeners) l()
}

function definir(valor: boolean) {
  if (aberta === valor) return
  aberta = valor
  emitir()
}

export function abrirCentral() {
  definir(true)
}

export function fecharCentral() {
  definir(false)
}

export function alternarCentral() {
  definir(!aberta)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useCentralAberta(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => aberta,
    () => false,
  )
}

export function centralEstaAberta(): boolean {
  return aberta
}
