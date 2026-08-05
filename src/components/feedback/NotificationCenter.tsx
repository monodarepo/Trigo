import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, CheckCheck, ChevronRight, Inbox } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { EmptyState } from '../ui/EmptyState'
import type { Tone } from '../ui/tones'
import { snapshot, type Alerta } from '../../data'

const ORDEM_SEVERIDADE: Record<Alerta['severidade'], number> = { critico: 0, alto: 1, medio: 2, info: 3 }
const TONE_SEVERIDADE: Record<Alerta['severidade'], Tone> = {
  critico: 'danger',
  alto: 'warning',
  medio: 'info',
  info: 'neutral',
}
const ROTULO_SEVERIDADE: Record<Alerta['severidade'], string> = {
  critico: 'Crítico',
  alto: 'Alto',
  medio: 'Médio',
  info: 'Info',
}

/** Hora curta relativa à âncora (terça, 12 ago): "05:40" ou "ontem 21:00". */
const horaCurta = (timestamp: string) =>
  `${timestamp.startsWith('2025-08-11') ? 'ontem ' : ''}${timestamp.slice(11, 16)}`

const alertasOrdenados = [...snapshot.alertas].sort(
  (a, b) => ORDEM_SEVERIDADE[a.severidade] - ORDEM_SEVERIDADE[b.severidade] || b.timestamp.localeCompare(a.timestamp),
)

/** Não lidas iniciais = críticos + altos (o mesmo recorte do sino/CONTAGEM). */
const NAO_LIDAS_INICIAIS = snapshot.alertas
  .filter((a) => a.severidade === 'critico' || a.severidade === 'alto')
  .map((a) => a.id)

/**
 * Central de notificações no sino da Topbar: reusa os MESMOS alertas do
 * snapshot (coerência), com marcar-como-lida e contador consistente.
 */
export function NotificationCenter() {
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const [naoLidas, setNaoLidas] = useState<ReadonlySet<string>>(new Set(NAO_LIDAS_INICIAIS))
  const raiz = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    const fechaFora = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false)
    }
    const fechaEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false)
    }
    document.addEventListener('mousedown', fechaFora)
    document.addEventListener('keydown', fechaEsc)
    return () => {
      document.removeEventListener('mousedown', fechaFora)
      document.removeEventListener('keydown', fechaEsc)
    }
  }, [aberto])

  const marcarLida = (id: string) =>
    setNaoLidas((atual) => {
      const proximo = new Set(atual)
      proximo.delete(id)
      return proximo
    })

  const abrirAlerta = (alerta: Alerta) => {
    marcarLida(alerta.id)
    setAberto(false)
    navigate(alerta.acaoRota)
  }

  const contagem = naoLidas.size

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label={`Alertas: ${contagem} não lidas`}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-edge bg-card-2 text-ink-muted transition-colors hover:text-ink"
      >
        <Bell size={16} aria-hidden="true" />
        {contagem > 0 && (
          <span
            className="tnums absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-ink"
            aria-hidden="true"
          >
            {contagem}
          </span>
        )}
      </button>

      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.99 }}
            transition={{ duration: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
            role="dialog"
            aria-label="Central de notificações"
            className="absolute right-0 top-full z-50 mt-2 w-[380px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-card-lg border border-edge bg-card shadow-raised"
          >
            <div className="flex items-center justify-between gap-3 border-b border-edge/60 px-4 py-3">
              <p className="font-display text-sm font-semibold text-ink">
                Notificações{' '}
                <span className="tnums ml-1 font-mono text-11 font-normal text-ink-faint">
                  {contagem} não lida{contagem === 1 ? '' : 's'}
                </span>
              </p>
              {contagem > 0 && (
                <button
                  type="button"
                  onClick={() => setNaoLidas(new Set())}
                  className="flex items-center gap-1 text-11 font-medium text-gold transition-colors hover:text-gold-light"
                >
                  <CheckCheck size={12} aria-hidden="true" /> Marcar todas como lidas
                </button>
              )}
            </div>

            <div className="max-h-[26rem] overflow-y-auto">
              {contagem === 0 && (
                <EmptyState
                  compact
                  icon={Inbox}
                  tone="positive"
                  title="Tudo em dia"
                  description="Nenhuma notificação não lida — os alertas seguem disponíveis abaixo e na tela de Alertas."
                  className="m-3"
                />
              )}
              <ul>
                {alertasOrdenados.map((alerta) => {
                  const lida = !naoLidas.has(alerta.id)
                  return (
                    <li key={alerta.id} className="border-b border-edge/40 last:border-b-0">
                      <button
                        type="button"
                        onClick={() => abrirAlerta(alerta)}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03] ${lida ? 'opacity-55' : ''}`}
                      >
                        <span
                          className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${lida ? 'bg-edge-strong' : 'bg-gold'}`}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <Badge
                              kind="status"
                              label={ROTULO_SEVERIDADE[alerta.severidade]}
                              tone={TONE_SEVERIDADE[alerta.severidade]}
                            />
                            <span className="tnums shrink-0 font-mono text-11 text-ink-faint">
                              {horaCurta(alerta.timestamp)}
                            </span>
                          </span>
                          <span className="mt-1 block text-13 font-medium leading-snug text-ink">{alerta.titulo}</span>
                          <span className="mt-0.5 flex items-center gap-0.5 text-11 text-gold">
                            {alerta.acaoRotulo} <ChevronRight size={11} aria-hidden="true" />
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => {
                setAberto(false)
                navigate('/alertas')
              }}
              className="block w-full border-t border-edge/60 px-4 py-2.5 text-center text-xs font-semibold text-gold transition-colors hover:bg-white/[0.03] hover:text-gold-light"
            >
              Ver todos os alertas do dia
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
