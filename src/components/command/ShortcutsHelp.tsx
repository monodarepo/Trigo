import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

export interface ShortcutsHelpProps {
  aberto: boolean
  aoFechar: () => void
}

const GRUPOS: Array<{ titulo: string; atalhos: Array<{ teclas: string[]; descricao: string }> }> = [
  {
    titulo: 'Geral',
    atalhos: [
      { teclas: ['⌘', 'K'], descricao: 'Abrir a paleta de comandos' },
      { teclas: ['?'], descricao: 'Este painel de atalhos' },
      { teclas: ['A'], descricao: 'Aprovar a recomendação do dia' },
      { teclas: ['Esc'], descricao: 'Fechar painéis e overlays' },
    ],
  },
  {
    titulo: 'Navegação (G + letra)',
    atalhos: [
      { teclas: ['G', 'C'], descricao: 'Cockpit Executivo' },
      { teclas: ['G', 'P'], descricao: 'Previsão de Preço e Câmbio' },
      { teclas: ['G', 'T'], descricao: 'Total Landed Cost' },
      { teclas: ['G', 'B'], descricao: 'Recomendação de Compra' },
      { teclas: ['G', 'H'], descricao: 'Recomendação de Hedge' },
      { teclas: ['G', 'S'], descricao: 'Simulador de Cenários' },
      { teclas: ['G', 'A'], descricao: 'Alertas Diários' },
      { teclas: ['G', 'I'], descricao: 'Copiloto Gemini' },
    ],
  },
]

export function ShortcutsHelp({ aberto, aoFechar }: ShortcutsHelpProps) {
  return (
    <AnimatePresence>
      {aberto && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onClick={aoFechar}
            aria-hidden="true"
          />
          <motion.div
            className="fixed inset-x-3 top-[18vh] z-[70] mx-auto max-w-md"
            initial={{ opacity: 0, scale: 0.99, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.99, y: -6 }}
            transition={{ duration: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Atalhos de teclado"
            onKeyDown={(e) => e.key === 'Escape' && aoFechar()}
          >
            <div className="rounded-card-lg border border-edge bg-card p-5 shadow-raised">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-16 font-semibold text-ink">Atalhos de teclado</h3>
                <button
                  type="button"
                  autoFocus
                  onClick={aoFechar}
                  aria-label="Fechar atalhos"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-ink-subtle hover:bg-white/5 hover:text-ink"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
              {GRUPOS.map((grupo) => (
                <div key={grupo.titulo} className="mt-4">
                  <p className="eyebrow">{grupo.titulo}</p>
                  <ul className="mt-2 space-y-1.5">
                    {grupo.atalhos.map((atalho) => (
                      <li key={atalho.descricao} className="flex items-center justify-between gap-3 text-13 text-ink-muted">
                        <span>{atalho.descricao}</span>
                        <span className="flex shrink-0 items-center gap-1">
                          {atalho.teclas.map((t) => (
                            <kbd
                              key={t}
                              className="rounded border border-edge bg-surface-1 px-1.5 py-0.5 font-mono text-11 text-ink-subtle"
                            >
                              {t}
                            </kbd>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
