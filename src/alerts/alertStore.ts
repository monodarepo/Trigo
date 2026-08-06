/**
 * STORE ÚNICO DE ALERTAS — a fonte de verdade que todas as superfícies leem.
 *
 * Antes desta consolidação havia três verdades sobre o mesmo alerta: o
 * catálogo em `src/data/alertas.ts`, um `Set` de "não lidas" que só o sino
 * enxergava, e a contagem do badge derivada da severidade da semente. Abrir o
 * sino marcava algo como lido que a tela de Alertas nunca ficava sabendo.
 * Agora o ciclo de vida vive num lugar só, e sino, central, tela, banner e
 * cockpit leem daqui.
 *
 * Padrão: estado de módulo + `useSyncExternalStore`, o mesmo de
 * `liveStore.ts` e `decisionStore.ts`. Sem Zustand — a casa já tem esta
 * convenção, e uma dependência a mais não compraria nada que o hook nativo já
 * não entregue (inclusive seleção com re-render fatiado).
 */
import { useSyncExternalStore } from 'react'
import { ALERTAS } from '../data/alertas'
import type { Alerta, StatusAlerta } from '../data/types'

/** Cópia da semente: o catálogo é imutável; o que anda é o estado daqui. */
let alertas: readonly Alerta[] = ALERTAS.map((a) => ({ ...a }))

const listeners = new Set<() => void>()

function emitir() {
  for (const l of listeners) l()
}

/** Aplica uma mudança a um alerta, preservando a identidade dos demais. */
function atualizar(id: string, mudanca: (a: Alerta) => Alerta) {
  let mudou = false
  const proximo = alertas.map((a) => {
    if (a.id !== id) return a
    const novo = mudanca(a)
    if (novo !== a) mudou = true
    return novo
  })
  // Sem a guarda, uma ação sem efeito (marcar visto o que já está visto)
  // trocaria a referência do array e re-renderizaria todas as superfícies.
  if (!mudou) return
  alertas = proximo
  emitir()
}

// ---------------------------------------------------------------------------
// Ações
// ---------------------------------------------------------------------------

/**
 * Visto = "passou pelos meus olhos". É o único estado que avança sozinho (ao
 * abrir o sino) e nunca regride o que já foi reconhecido, adiado ou resolvido.
 */
export function marcarVisto(id: string) {
  atualizar(id, (a) => (a.status === 'novo' ? { ...a, status: 'visto' } : a))
}

/** Marca como vistos todos os que ainda estão `novo` — o "marcar todas". */
export function marcarTodosVistos() {
  if (!alertas.some((a) => a.status === 'novo')) return
  alertas = alertas.map((a) => (a.status === 'novo' ? { ...a, status: 'visto' } : a))
  emitir()
}

/** Reconhecer é ato deliberado: "eu vi e assumo". */
export function reconhecer(id: string) {
  atualizar(id, (a) => ({ ...a, status: 'reconhecido' }))
}

/**
 * Adiar tira o alerta da fila até uma data. O alerta continua ATIVO — some da
 * fila de decisão, não da lista: um risco adiado que desaparecesse da tela
 * seria um risco esquecido.
 */
export function adiar(id: string, ate: string) {
  atualizar(id, (a) => ({ ...a, status: 'adiado', adiadoAte: ate }))
}

/** Atribuir não muda o status — só diz de quem é. */
export function atribuir(id: string, area: string) {
  atualizar(id, (a) => ({ ...a, atribuidoA: area }))
}

export function resolver(id: string) {
  atualizar(id, (a) => ({ ...a, status: 'resolvido' }))
}

/** Volta um alerta ao fluxo (desfaz adiar/resolver). */
export function reabrir(id: string) {
  atualizar(id, (a) => ({ ...a, status: 'visto', adiadoAte: undefined }))
}

/**
 * Entrada de alerta novo — é por aqui que a chegada ao vivo publica.
 * Idempotente por id: um feed que reemite o mesmo evento não duplica a linha,
 * apenas atualiza o conteúdo mantendo o status já dado pelo usuário.
 */
export function adicionar(alerta: Alerta) {
  const existente = alertas.find((a) => a.id === alerta.id)
  if (existente) {
    atualizar(alerta.id, (a) => ({ ...alerta, status: a.status, atribuidoA: a.atribuidoA }))
    return
  }
  alertas = [alerta, ...alertas]
  emitir()
}

/** Restaura o catálogo semeado — usado pelo modo apresentação. */
export function reiniciarAlertas() {
  alertas = ALERTAS.map((a) => ({ ...a }))
  emitir()
}

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

export function getAlertas(): readonly Alerta[] {
  return alertas
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Hook com seletor. O seletor precisa devolver valor ESTÁVEL entre renders
 * sem mudança de estado (primitivo, ou array/objeto memoizado a partir da
 * lista) — `useSyncExternalStore` compara por Object.is e um `.filter()` novo
 * a cada chamada entraria em laço infinito. Os seletores de `selectors.ts`
 * são memoizados contra a referência da lista exatamente por isso.
 */
export function useAlertas<T>(selector: (lista: readonly Alerta[]) => T): T {
  return useSyncExternalStore(subscribe, () => selector(alertas))
}

/** Açúcar para quem quer a lista inteira. */
export function useListaAlertas(): readonly Alerta[] {
  return useSyncExternalStore(subscribe, getAlertas)
}

export type { Alerta, StatusAlerta }
