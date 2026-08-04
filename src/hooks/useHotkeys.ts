import { useEffect, useRef } from 'react'

export interface HotkeyHandlers {
  /** ⌘K / Ctrl+K. */
  onPalette: () => void
  /** Tecla "?". */
  onAjuda: () => void
  /** Tecla "a" (aprovação com confirmação). */
  onAprovar: () => void
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
export function useHotkeys({ onPalette, onAjuda, onAprovar, sequencias, suspenso = false }: HotkeyHandlers) {
  const pendenteG = useRef<number | null>(null)
  const refs = useRef({ onPalette, onAjuda, onAprovar, sequencias, suspenso })
  refs.current = { onPalette, onAjuda, onAprovar, sequencias, suspenso }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const { onPalette, onAjuda, onAprovar, sequencias, suspenso } = refs.current
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
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
