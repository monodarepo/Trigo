import { SourceBadge } from '../trust/SourceBadge'
import { useFrescorRelativo } from '../../live/useLiveData'
import type { FamiliaDado, FonteDado } from '../../data'

/**
 * Selo de fonte reativo dos sinais ao vivo (PRO-5): quando isLive, mostra a
 * fonte REAL com "atualizado há Xs"; em Cenário/falha, o selo encenado da
 * família. PERFORMANCE: o tick de frescor (1s) fica isolado NESTE componente —
 * a página que o usa não re-renderiza a cada segundo (nada de cascata).
 */
export function BadgeFonteAoVivo({
  familia,
  fonte,
  updatedAt,
  isLive,
  posicao,
  className,
}: {
  familia: FamiliaDado
  /** Fonte real exibida quando ao vivo (ex.: FONTE_FRANKFURTER). */
  fonte: FonteDado
  updatedAt: number | null
  isLive: boolean
  posicao?: 'acima' | 'abaixo'
  className?: string
}) {
  const frescor = useFrescorRelativo(isLive ? updatedAt : null)
  if (!isLive) return <SourceBadge familia={familia} posicao={posicao} className={className} />
  return (
    <SourceBadge
      familia={familia}
      fonteOverride={fonte}
      frescorOverride={frescor ?? undefined}
      posicao={posicao}
      className={className}
    />
  )
}
