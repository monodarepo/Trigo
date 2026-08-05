/** Bus de toasts: qualquer componente emite; o ToastLayer (AppShell) exibe. */

export type TomToast = 'sucesso' | 'erro' | 'info'

export interface ToastPayload {
  titulo: string
  descricao?: string
  tom?: TomToast
}

const EVENTO_TOAST = 'torre:toast'

export function emitirToast(payload: ToastPayload) {
  window.dispatchEvent(new CustomEvent<ToastPayload>(EVENTO_TOAST, { detail: payload }))
}

export function aoReceberToast(handler: (payload: ToastPayload) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<ToastPayload>).detail)
  window.addEventListener(EVENTO_TOAST, listener)
  return () => window.removeEventListener(EVENTO_TOAST, listener)
}
