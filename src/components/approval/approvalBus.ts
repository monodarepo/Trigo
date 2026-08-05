/** Bus do fluxo de aprovação: páginas pedem, o CommandLayer monta o modal. */
import type { ModoDecisao } from './decisionStore'

const EVENTO_APROVACAO = 'torre:abrir-aprovacao'

export function abrirAprovacao(modo?: ModoDecisao) {
  window.dispatchEvent(new CustomEvent<{ modo?: ModoDecisao }>(EVENTO_APROVACAO, { detail: { modo } }))
}

export function aoAbrirAprovacao(handler: (modo?: ModoDecisao) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<{ modo?: ModoDecisao }>).detail?.modo)
  window.addEventListener(EVENTO_APROVACAO, listener)
  return () => window.removeEventListener(EVENTO_APROVACAO, listener)
}
