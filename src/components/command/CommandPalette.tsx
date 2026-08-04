import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CornerDownLeft, Search, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface Comando {
  id: string
  grupo: 'Navegar' | 'Ações' | 'Perguntar à IA'
  rotulo: string
  icone: LucideIcon
  atalho?: string
  executar: () => void
}

export interface CommandPaletteProps {
  aberto: boolean
  comandos: Comando[]
  /** Pergunta livre → Copiloto. */
  aoPerguntar: (pergunta: string) => void
  aoFechar: () => void
}

const ORDEM_GRUPOS: Comando['grupo'][] = ['Navegar', 'Ações', 'Perguntar à IA']

const norm = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')

/** Fuzzy leve: prefixo > substring > subsequência. −1 = não combina. */
function pontuacao(rotulo: string, consulta: string): number {
  if (!consulta) return 0
  const a = norm(rotulo)
  const b = norm(consulta)
  if (a.startsWith(b)) return 3
  if (a.includes(b)) return 2
  let i = 0
  for (const ch of a) {
    if (ch === b[i]) i += 1
    if (i === b.length) return 1
  }
  return -1
}

function Atalho({ valor }: { valor: string }) {
  return (
    <span className="ml-auto flex shrink-0 items-center gap-1">
      {valor.split(' ').map((parte, i) => (
        <kbd
          key={i}
          className="rounded border border-edge bg-surface-1 px-1.5 py-0.5 font-mono text-11 text-ink-subtle"
        >
          {parte}
        </kbd>
      ))}
    </span>
  )
}

export function CommandPalette({ aberto, comandos, aoPerguntar, aoFechar }: CommandPaletteProps) {
  const [consulta, setConsulta] = useState('')
  const [ativo, setAtivo] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listaRef = useRef<HTMLUListElement>(null)

  const visiveis = useMemo(() => {
    const filtrados = comandos
      .map((c) => ({ c, p: pontuacao(c.rotulo, consulta) }))
      .filter(({ p }) => p >= 0)
      .sort((x, y) => y.p - x.p)
      .map(({ c }) => c)
    if (consulta.trim()) {
      filtrados.push({
        id: 'perguntar-livre',
        grupo: 'Perguntar à IA',
        rotulo: `Perguntar ao Copiloto: “${consulta.trim()}”`,
        icone: Sparkles,
        executar: () => aoPerguntar(consulta.trim()),
      })
    }
    return ORDEM_GRUPOS.flatMap((grupo) => filtrados.filter((c) => c.grupo === grupo))
  }, [comandos, consulta, aoPerguntar])

  useEffect(() => {
    if (aberto) {
      setConsulta('')
      setAtivo(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [aberto])

  useEffect(() => setAtivo(0), [consulta])

  useEffect(() => {
    listaRef.current
      ?.querySelector(`[data-indice="${ativo}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [ativo])

  const executa = (comando: Comando) => {
    aoFechar()
    comando.executar()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      aoFechar()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAtivo((a) => Math.min(a + 1, visiveis.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAtivo((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const comando = visiveis[ativo]
      if (comando) executa(comando)
    } else if (e.key === 'Tab') {
      e.preventDefault()
    }
  }

  let indice = -1

  return (
    <AnimatePresence>
      {aberto && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onClick={aoFechar}
            aria-hidden="true"
          />
          <motion.div
            className="fixed inset-x-3 top-[14vh] z-[70] mx-auto max-w-xl"
            initial={{ opacity: 0, scale: 0.99, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.99, y: -6 }}
            transition={{ duration: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Paleta de comandos"
            onKeyDown={onKeyDown}
          >
            <div className="overflow-hidden rounded-card-lg border border-edge bg-card shadow-raised">
              <div className="flex items-center gap-2.5 border-b border-edge/60 px-4 py-3">
                <Search size={15} className="shrink-0 text-ink-subtle" aria-hidden="true" />
                <input
                  ref={inputRef}
                  value={consulta}
                  onChange={(e) => setConsulta(e.target.value)}
                  placeholder="Buscar telas, ações ou perguntar à IA…"
                  role="combobox"
                  aria-expanded="true"
                  aria-controls="palette-lista"
                  aria-activedescendant={visiveis[ativo] ? `palette-item-${ativo}` : undefined}
                  className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
                />
                <kbd className="rounded border border-edge bg-surface-1 px-1.5 py-0.5 font-mono text-11 text-ink-faint">
                  esc
                </kbd>
              </div>

              <ul id="palette-lista" ref={listaRef} role="listbox" className="max-h-[46vh] overflow-y-auto p-2">
                {visiveis.length === 0 && (
                  <li className="px-3 py-8 text-center text-sm text-ink-subtle">
                    Nenhum resultado para “{consulta}”.
                  </li>
                )}
                {ORDEM_GRUPOS.map((grupo) => {
                  const doGrupo = visiveis.filter((c) => c.grupo === grupo)
                  if (doGrupo.length === 0) return null
                  return (
                    <li key={grupo}>
                      <p className="eyebrow px-3 pb-1 pt-2">{grupo}</p>
                      <ul>
                        {doGrupo.map((comando) => {
                          indice += 1
                          const i = indice
                          const ehAtivo = i === ativo
                          return (
                            <li key={comando.id}>
                              <button
                                type="button"
                                id={`palette-item-${i}`}
                                data-indice={i}
                                role="option"
                                aria-selected={ehAtivo}
                                onMouseEnter={() => setAtivo(i)}
                                onClick={() => executa(comando)}
                                className={`flex w-full items-center gap-3 rounded-card px-3 py-2 text-left text-sm transition-colors ${
                                  ehAtivo ? 'bg-surface-3 text-ink' : 'text-ink-muted'
                                }`}
                              >
                                <comando.icone
                                  size={15}
                                  className={ehAtivo ? 'shrink-0 text-gold' : 'shrink-0 text-ink-subtle'}
                                  aria-hidden="true"
                                />
                                <span className="min-w-0 truncate">{comando.rotulo}</span>
                                {comando.atalho && <Atalho valor={comando.atalho} />}
                                {ehAtivo && !comando.atalho && (
                                  <CornerDownLeft size={13} className="ml-auto shrink-0 text-ink-faint" aria-hidden="true" />
                                )}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </li>
                  )
                })}
              </ul>

              <div className="flex items-center gap-3 border-t border-edge/60 px-4 py-2 text-11 text-ink-faint">
                <span className="font-mono">↑↓ navegar</span>
                <span className="font-mono">↵ executar</span>
                <span className="ml-auto font-mono">g + letra = ir direto</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
