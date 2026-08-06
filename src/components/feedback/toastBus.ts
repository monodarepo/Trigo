/** Bus de toasts: qualquer componente emite; o ToastLayer (AppShell) exibe. */

/**
 * Os tons cobrem a SINTAXE DE COR do produto inteiro, não só sucesso/erro:
 * 'aviso' (dourado) e 'neutro' (cinza) entraram para que um alerta que chega
 * ao vivo apareça na cor da sua severidade — alto em dourado, informativo em
 * cinza —, em vez de tudo virar "info" azul no caminho até a tela.
 */
export type TomToast = 'sucesso' | 'erro' | 'aviso' | 'info' | 'neutro'

export interface ToastPayload {
  titulo: string
  descricao?: string
  tom?: TomToast
  /** Ícone de raio: veio da camada de tempo real, não de um clique. */
  aoVivo?: boolean
  /**
   * Ação opcional no próprio toast. O callback é entregue em processo (o bus é
   * um CustomEvent na mesma janela), então pode fechar sobre o que precisar —
   * abrir a Central, navegar, reverter.
   */
  acao?: { rotulo: string; executar: () => void }
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
