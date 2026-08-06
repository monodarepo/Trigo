import { useEffect, useRef } from 'react'

export interface HotkeyHandlers {
  /** ⌘K / Ctrl+K. */
  onPalette: () => void
  /** Tecla "?". */
  onAjuda: () => void
  /** Tecla "a" (aprovação com confirmação). */
  onAprovar: () => void
  /** Tecla "p" (modo apresentação). */
  onApresentar?: () => void
  /**
   * Tecla "n" (Central de Alertas). Não é "a" nem "g a" porque as duas já
   * fazem coisa diferente e útil: "a" aprova a recomendação do dia e "g a"
   * NAVEGA para a aba de Alertas (o mission control). A Central é o oposto de
   * navegar — abre por cima, sem tirar ninguém da tela —, então ganhou tecla
   * própria em vez de roubar uma com significado firmado.
   */
  onCentral?: () => void
  /** Sequências "g + letra" → rota. */
  sequencias: Record<string, () => void>
  /** Suspende tudo enquanto um overlay próprio está aberto. */
  suspenso?: boolean
}

const JANELA_SEQUENCIA_MS = 1200

function digitando(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof HTMLElement)) return false
  const tag = alvo.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || alvo.isContentEditable
}

/**
 * Atalhos globais do app: ⌘K, "?", "a" e sequências estilo Linear ("g c").
 * Ignora eventos enquanto o usuário digita em campos de texto.
 */
export function useHotkeys({
  onPalette,
  onAjuda,
  onAprovar,
  onApresentar,
  onCentral,
  sequencias,
  suspenso = false,
}: HotkeyHandlers) {
  const pendenteG = useRef<number | null>(null)
  const refs = useRef({ onPalette, onAjuda, onAprovar, onApresentar, onCentral, sequencias, suspenso })
  refs.current = { onPalette, onAjuda, onAprovar, onApresentar, onCentral, sequencias, suspenso }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const { onPalette, onAjuda, onAprovar, onApresentar, onCentral, sequencias, suspenso } = refs.current
      const tecla = e.key.toLowerCase()

      // ⌘K/Ctrl+K sempre disponível (abre/fecha o palette)
      if ((e.metaKey || e.ctrlKey) && tecla === 'k') {
        e.preventDefault()
        onPalette()
        return
      }
      if (suspenso || digitando(e.target) || e.metaKey || e.ctrlKey || e.altKey) return

      // Sequência pendente "g …"
      if (pendenteG.current && Date.now() - pendenteG.current < JANELA_SEQUENCIA_MS) {
        pendenteG.current = null
        const acao = sequencias[tecla]
        if (acao) {
          e.preventDefault()
          acao()
          return
        }
      } else {
        pendenteG.current = null
      }

      if (tecla === 'g') {
        pendenteG.current = Date.now()
        return
      }
      if (e.key === '?') {
        e.preventDefault()
        onAjuda()
        return
      }
      if (tecla === 'a' && !e.shiftKey) {
        e.preventDefault()
        onAprovar()
        return
      }
      if (tecla === 'p' && !e.shiftKey && onApresentar) {
        e.preventDefault()
        onApresentar()
        return
      }
      if (tecla === 'n' && !e.shiftKey && onCentral) {
        e.preventDefault()
        onCentral()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
