/**
 * Modo de dados: "cenario" (demo encenada, padrão) | "aovivo" (periferia real).
 * Princípio: periferia ao vivo, núcleo encenado — a DECISÃO nunca depende de rede.
 * Persistência: sessionStorage com guarda (o preview single-file pode não tê-lo).
 */
import { useSyncExternalStore } from 'react'

export type DataMode = 'cenario' | 'aovivo'

const CHAVE_SESSAO = 'torre:data-mode'

function lerSessao(): DataMode | null {
  try {
    const v = sessionStorage.getItem(CHAVE_SESSAO)
    return v === 'cenario' || v === 'aovivo' ? v : null
  } catch {
    return null
  }
}

function gravarSessao(modo: DataMode) {
  try {
    sessionStorage.setItem(CHAVE_SESSAO, modo)
  } catch {
    /* preview sem sessionStorage: segue só em memória */
  }
}

let modo: DataMode = lerSessao() ?? 'cenario'
const listeners = new Set<() => void>()

export function definirDataMode(novo: DataMode) {
  modo = novo
  gravarSessao(novo)
  for (const listener of listeners) listener()
}

export function alternarDataMode() {
  definirDataMode(modo === 'cenario' ? 'aovivo' : 'cenario')
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useDataMode(): DataMode {
  return useSyncExternalStore(subscribe, () => modo)
}

export function getDataMode(): DataMode {
  return modo
}
