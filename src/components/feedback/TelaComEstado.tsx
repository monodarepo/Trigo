import { useEffect, useState, type ReactNode } from 'react'
import { ErrorBoundary } from './ErrorBoundary'

/** Rotas já carregadas nesta sessão — o skeleton só aparece na primeira visita. */
const rotasCarregadas = new Set<string>()

const DURACAO_SKELETON_MS = 400

export interface TelaComEstadoProps {
  rota: string
  titulo: string
  esqueleto: ReactNode
  children: ReactNode
}

/**
 * Estados de rota: skeleton por layout (~400ms na primeira carga) +
 * fronteira de erro com fallback elegante. Nunca tela branca.
 */
export function TelaComEstado({ rota, titulo, esqueleto, children }: TelaComEstadoProps) {
  const [pronto, setPronto] = useState(() => rotasCarregadas.has(rota))

  useEffect(() => {
    if (pronto) return
    const timer = setTimeout(() => {
      rotasCarregadas.add(rota)
      setPronto(true)
    }, DURACAO_SKELETON_MS)
    return () => clearTimeout(timer)
  }, [pronto, rota])

  if (!pronto) {
    return (
      <div role="status" aria-busy="true" aria-label={`Carregando ${titulo}…`}>
        {esqueleto}
      </div>
    )
  }
  return <ErrorBoundary rotulo={titulo}>{children}</ErrorBoundary>
}
