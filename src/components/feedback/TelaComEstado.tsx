import { Suspense, useEffect, useState, type ReactNode } from 'react'
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
 *
 * O mesmo esqueleto serve de fallback do Suspense: com as telas carregadas sob
 * demanda (React.lazy), o download do chunk e a espera encenada mostram
 * exatamente a mesma coisa. Sem isto, o code-split introduziria um segundo
 * estado de carregamento visualmente diferente do primeiro — o usuário veria
 * duas transições onde antes havia uma.
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

  const carregando = (
    <div role="status" aria-busy="true" aria-label={`Carregando ${titulo}…`}>
      {esqueleto}
    </div>
  )

  if (!pronto) return carregando
  return (
    <ErrorBoundary rotulo={titulo}>
      <Suspense fallback={carregando}>{children}</Suspense>
    </ErrorBoundary>
  )
}
