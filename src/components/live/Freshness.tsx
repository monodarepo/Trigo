import { useLive } from '../../live/liveStore'

/** "atualizado há Xs" — ligado ao tick global (sync a cada 30s). */
export function Freshness({ className = '' }: { className?: string }) {
  const segundos = useLive((s) => s.atualizadoHaS)
  return (
    <span
      className={`tnums inline-flex items-center gap-1.5 font-mono text-11 text-ink-faint ${className}`}
    >
      <span className="h-1 w-1 rounded-full bg-positive/70" aria-hidden="true" />
      atualizado há {segundos}s
    </span>
  )
}
