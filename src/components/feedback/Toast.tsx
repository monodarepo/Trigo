import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, X, XCircle, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { aoReceberToast, type TomToast, type ToastPayload } from './toastBus'
import { useLive } from '../../live/liveStore'

const AUTO_DISMISS_MS = 4200
const MAX_VISIVEIS = 4

const TOM: Record<TomToast, { icone: LucideIcon; cor: string; borda: string }> = {
  sucesso: { icone: CheckCircle2, cor: 'text-positive', borda: 'border-positive/40' },
  erro: { icone: XCircle, cor: 'text-danger', borda: 'border-danger/40' },
  info: { icone: Info, cor: 'text-azure', borda: 'border-azure/40' },
}

interface ToastAtivo extends Required<Pick<ToastPayload, 'titulo' | 'tom'>> {
  id: number
  descricao?: string
  /** Toast vindo da camada de tempo real (ícone de raio). */
  aoVivo?: boolean
}

function ToastItem({ toast, aoFechar }: { toast: ToastAtivo; aoFechar: () => void }) {
  useEffect(() => {
    const timer = setTimeout(aoFechar, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const cfg = TOM[toast.tom]
  const Icone = toast.aoVivo ? Zap : cfg.icone
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
      role={toast.tom === 'erro' ? 'alert' : 'status'}
      className={`pointer-events-auto flex items-start gap-3 rounded-card-lg border ${cfg.borda} bg-card-2 px-4 py-3 shadow-raised`}
    >
      <Icone size={18} className={`mt-0.5 shrink-0 ${cfg.cor}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug text-ink">{toast.titulo}</p>
        {toast.descricao && <p className="mt-0.5 text-xs leading-snug text-ink-subtle">{toast.descricao}</p>}
      </div>
      <button
        type="button"
        onClick={aoFechar}
        aria-label="Fechar notificação"
        className="shrink-0 rounded-full p-0.5 text-ink-faint transition-colors hover:text-ink"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </motion.div>
  )
}

/** Um único aviso "ao vivo" por sessão — o resto corre em silêncio no ticker. */
let jaAvisouAoVivo = false

/**
 * Camada global de toasts (montada no AppShell): empilha até 4, entrada/saída
 * suave, auto-dismiss em ~4s. Também anuncia o primeiro update do tempo real.
 */
export function ToastLayer() {
  const [toasts, setToasts] = useState<ToastAtivo[]>([])
  const proximoId = useRef(1)

  const remover = (id: number) => setToasts((atual) => atual.filter((t) => t.id !== id))
  const empilhar = (payload: ToastPayload & { aoVivo?: boolean }) =>
    setToasts((atual) => [
      ...atual.slice(-(MAX_VISIVEIS - 1)),
      { id: proximoId.current++, tom: payload.tom ?? 'info', ...payload },
    ])

  useEffect(() => aoReceberToast(empilhar), [])

  // PRO-1: anuncia a primeira atualização da camada de tempo real
  const ultimoEvento = useLive((s) => s.eventos[s.eventos.length - 1])
  const eventoInicial = useRef<number | null>(null)
  useEffect(() => {
    if (eventoInicial.current === null) {
      eventoInicial.current = ultimoEvento.id
      return
    }
    if (ultimoEvento.id !== eventoInicial.current && !jaAvisouAoVivo) {
      jaAvisouAoVivo = true
      empilhar({ tom: 'info', titulo: 'Atualização em tempo real', descricao: ultimoEvento.texto, aoVivo: true })
    }
  }, [ultimoEvento])

  return (
    <div
      role="region"
      aria-label="Notificações"
      className="pointer-events-none fixed bottom-6 right-6 z-[80] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} aoFechar={() => remover(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  )
}
