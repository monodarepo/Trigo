import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, CheckCheck, ChevronRight, Inbox } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { EmptyState } from '../ui/EmptyState'
import type { Tone } from '../ui/tones'
import type { Alerta } from '../../data'
import { marcarTodosVistos, marcarVisto, useListaAlertas } from '../../alerts/alertStore'
import {
  ORDEM_SEVERIDADE,
  ativos,
  contagemCritica,
  contagemNaoVistos,
  filaExigeDecisao,
} from '../../alerts/selectors'

const TONE_SEVERIDADE: Record<Alerta['severidade'], Tone> = {
  critico: 'danger',
  alto: 'warning',
  medio: 'info',
  informativo: 'neutral',
}
const ROTULO_SEVERIDADE: Record<Alerta['severidade'], string> = {
  critico: 'Crítico',
  alto: 'Alto',
  medio: 'Médio',
  informativo: 'Info',
}

/** Hora curta relativa à âncora (terça, 12 ago): "05:40" ou "ontem 21:00". */
const horaCurta = (timestamp: string) =>
  `${timestamp.startsWith('2025-08-11') ? 'ontem ' : ''}${timestamp.slice(11, 16)}`

/**
 * Central de notificações no sino da Topbar. Lê e escreve no STORE ÚNICO: o
 * que se marca como visto aqui aparece visto na tela de Alertas, no cockpit e
 * no banner contextual. Antes havia um Set local de "não lidas" que só este
 * componente enxergava — abrir o sino não mudava nada em lugar nenhum.
 */
export function NotificationCenter() {
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)

  const lista = useListaAlertas()
  const alertasOrdenados = [...ativos(lista)].sort(
    (a, b) =>
      ORDEM_SEVERIDADE[a.severidade] - ORDEM_SEVERIDADE[b.severidade] ||
      b.timestamp.localeCompare(a.timestamp),
  )
  /**
   * O badge conta o que EXIGE DECISÃO e ainda não foi tratado — não o que não
   * foi lido. Um alerta lido continua sendo trabalho pendente, e um
   * informativo lido nunca foi trabalho. Assim o número cai quando alguém
   * reconhece, adia ou resolve — responde ao trabalho feito, não ao scroll.
   * Antes era "críticos + altos" fixo na semente: não descia nunca.
   */
  const contagem = filaExigeDecisao(lista).length
  const naoVistos = contagemNaoVistos(lista)
  const temCritico = contagemCritica(lista) > 0

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

  const abrirAlerta = (alerta: Alerta) => {
    marcarVisto(alerta.id)
    setAberto(false)
    navigate(alerta.acaoRota)
  }

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label={`Alertas: ${contagem} exige${contagem === 1 ? '' : 'm'} decisão${temCritico ? ', com alerta crítico' : ''}`}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-edge bg-card-2 text-ink-muted transition-colors hover:text-ink"
      >
        <Bell size={16} aria-hidden="true" />
        {/* Badge dourado = há o que ver; vermelho = há CRÍTICO. A cor carrega
            a severidade, não só a existência — e a sintaxe do resto do produto. */}
        {contagem > 0 && (
          <span
            className={`tnums absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
              temCritico ? 'bg-danger text-ink' : 'bg-gold text-navy'
            }`}
            aria-hidden="true"
          >
            {contagem}
          </span>
        )}
        {/* Sem nada por ver, um crítico ativo ainda pinga: ele não sumiu. */}
        {contagem === 0 && temCritico && (
          <span
            className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-danger ring-2 ring-surface-1"
            aria-hidden="true"
          />
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
                  {contagem} na fila{naoVistos > 0 ? ` · ${naoVistos} não vist${naoVistos === 1 ? 'o' : 'os'}` : ''}
                </span>
              </p>
              {naoVistos > 0 && (
                <button
                  type="button"
                  onClick={marcarTodosVistos}
                  className="flex items-center gap-1 text-11 font-medium text-gold transition-colors hover:text-gold-light"
                >
                  <CheckCheck size={12} aria-hidden="true" /> Marcar todas como vistas
                </button>
              )}
            </div>

            <div className="max-h-[26rem] overflow-y-auto">
              {alertasOrdenados.length === 0 && (
                <EmptyState
                  compact
                  icon={Inbox}
                  tone="positive"
                  title="Nada pendente"
                  description="Nenhum alerta ativo — os resolvidos seguem na tela de Alertas."
                  className="m-3"
                />
              )}
              <ul>
                {alertasOrdenados.map((alerta) => {
                  const visto = alerta.status !== 'novo'
                  return (
                    <li key={alerta.id} className="border-b border-edge/40 last:border-b-0">
                      <button
                        type="button"
                        onClick={() => abrirAlerta(alerta)}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03] ${visto ? 'opacity-55' : ''}`}
                      >
                        <span
                          className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${visto ? 'bg-edge-strong' : 'bg-gold'}`}
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
                            {alerta.acaoLabel} <ChevronRight size={11} aria-hidden="true" />
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
