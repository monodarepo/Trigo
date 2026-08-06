/**
 * "há Xs" — UM relógio para o produto inteiro, e só onde ele é necessário.
 *
 * Duas regras, e a segunda é a que importa para os 60fps:
 *
 *  1. O relógio é o tick global do `liveStore` (PRO-1). Nenhum card cria
 *     `setInterval` próprio — vinte cards com timers desalinhados fariam vinte
 *     re-renders espalhados por segundo, cada um num frame diferente.
 *
 *  2. Só assina o relógio quem MUDA com ele. O alerta semeado mede contra a
 *     âncora do cenário (terça, 07:00), que é constante: "há 1h" hoje, "há 1h"
 *     daqui a dez minutos de demo. Assinar o tick nessas linhas custaria 20
 *     re-renders por segundo para reescrever exatamente o mesmo texto. Só as
 *     linhas que chegaram AO VIVO (`recebidoEmS`) contam segundos de verdade —
 *     e são uma ou duas por sessão.
 */
import { memo } from 'react'
import { useLive } from '../live/liveStore'
import type { Alerta } from '../data/types'
import { tempoRelativo } from './tempo'

/** Só esta variante assina o tick — e só ela precisa. */
const TempoAoVivo = memo(function TempoAoVivo({ alerta, className }: { alerta: Alerta; className: string }) {
  const segundos = useLive((s) => s.segundos)
  return <span className={className}>{tempoRelativo(alerta, segundos)}</span>
})

export const TempoRelativo = memo(function TempoRelativo({
  alerta,
  className = 'tnums text-[11px] text-ink-subtle',
}: {
  alerta: Alerta
  className?: string
}) {
  if (alerta.recebidoEmS != null) return <TempoAoVivo alerta={alerta} className={className} />
  // Constante contra a âncora do cenário: não precisa de relógio nenhum.
  return <span className={className}>{tempoRelativo(alerta, 0)}</span>
})
