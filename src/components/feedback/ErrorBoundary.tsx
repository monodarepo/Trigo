import { Component, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Nome amigável do que está protegido (ex.: "Visão Executiva"). */
  rotulo?: string
  /** Fallback custom (recebe reset). Sem ele, usa o fallback padrão elegante. */
  fallback?: (reset: () => void, erro: Error) => ReactNode
}

interface ErrorBoundaryState {
  erro: Error | null
}

/**
 * Fronteira de erro por rota/seção: nunca tela branca — sempre um fallback
 * elegante com caminho de recuperação ("tentar de novo" / recarregar).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { erro: null }

  static getDerivedStateFromError(erro: Error): ErrorBoundaryState {
    return { erro }
  }

  reset = () => this.setState({ erro: null })

  render() {
    const { erro } = this.state
    if (!erro) return this.props.children
    if (this.props.fallback) return this.props.fallback(this.reset, erro)
    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center rounded-card-lg border border-danger/30 bg-card px-6 py-14 text-center shadow-card-rose"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/15 text-danger" aria-hidden="true">
          <AlertTriangle size={22} />
        </span>
        <p className="mt-4 font-display text-base font-semibold text-ink">Algo não carregou</p>
        <p className="mt-1 max-w-md text-sm text-ink-subtle">
          {this.props.rotulo ?? 'Esta seção'} encontrou um erro de renderização — os dados não foram afetados.
        </p>
        <p className="mt-2 max-w-md truncate font-mono text-11 text-ink-faint">{erro.message}</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={this.reset}
            className="flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-xs font-semibold text-navy transition-colors hover:bg-gold-light"
          >
            <RotateCcw size={13} aria-hidden="true" /> Recarregar
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full border border-edge px-4 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-edge-strong hover:text-ink"
          >
            Recarregar a página
          </button>
        </div>
      </div>
    )
  }
}

export interface FronteiraVisualProps {
  children: ReactNode
  /** Visualização alternativa exibida se a principal quebrar (ex.: globo 3D → mapa 2D). */
  alternativa: ReactNode
  /** Aviso curto acima da alternativa. */
  aviso?: string
}

/**
 * Fronteira para visualizações pesadas (globo 3D, WebGL): se quebrar,
 * cai com elegância na alternativa 2D — nunca tela branca.
 */
export function FronteiraVisual({ children, alternativa, aviso }: FronteiraVisualProps) {
  return (
    <ErrorBoundary
      fallback={() => (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-11 text-ink-faint">
            <AlertTriangle size={12} className="text-warning" aria-hidden="true" />
            {aviso ?? 'Visualização 3D indisponível neste dispositivo — exibindo o mapa 2D.'}
          </p>
          {alternativa}
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}
