/**
 * SINO ELEVADO — o único ponto de entrada para a fila, em toda tela.
 *
 * Ele não tem mais lista própria: clicar abre a CENTRAL (painel lateral), não
 * a aba `/alertas`. O dropdown anterior era uma terceira superfície mostrando
 * os mesmos alertas com regras próprias de ordenação; agora o sino carrega só
 * o que um sino deve carregar — quantos e quão graves.
 *
 * O que o badge conta: o que EXIGE DECISÃO e ainda não foi tratado. Não o que
 * não foi lido — um alerta lido continua sendo trabalho pendente, e um
 * informativo lido nunca foi trabalho. Assim o número cai quando alguém
 * reconhece, adia ou resolve.
 */
import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { useListaAlertas } from './alertStore'
import { abrirCentral } from './centralStore'
import { contagemCritica, filaExigeDecisao } from './selectors'

export function AlertBell() {
  const lista = useListaAlertas()
  const contagem = filaExigeDecisao(lista).length
  const temCritico = contagemCritica(lista) > 0

  /**
   * Pulso na CHEGADA, não na severidade: um informativo não move o badge (não
   * exige decisão), mas o sino precisa registrar que algo entrou — senão o
   * toast anuncia uma novidade que a topbar nega.
   */
  const [chegou, setChegou] = useState(false)
  const quantosAntes = useRef(lista.length)
  useEffect(() => {
    if (lista.length <= quantosAntes.current) {
      quantosAntes.current = lista.length
      return
    }
    quantosAntes.current = lista.length
    setChegou(true)
    const t = setTimeout(() => setChegou(false), 2400)
    return () => clearTimeout(t)
  }, [lista])

  return (
    <button
      type="button"
      onClick={abrirCentral}
      aria-label={`Central de Alertas: ${contagem} exige${contagem === 1 ? '' : 'm'} decisão${
        temCritico ? ', com alerta crítico' : ''
      }`}
      aria-haspopup="dialog"
      title="Central de Alertas (N)"
      className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-card-2 transition-colors ${
        temCritico
          ? 'border-danger/50 text-danger hover:text-danger'
          : 'border-edge text-ink-muted hover:text-ink'
      } ${chegou ? 'ring-2 ring-gold/50' : ''}`}
    >
      <Bell size={16} aria-hidden="true" />

      {/* Ponto de severidade: rosa pulsante enquanto houver crítico ativo.
          O pulso é animação CSS — o bloco global de prefers-reduced-motion
          (index.css) o congela sem que este componente precise saber. */}
      {temCritico && (
        <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-70" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger ring-2 ring-surface-1" />
        </span>
      )}

      {/* Badge dourado quando não há crítico; com crítico, o ponto rosa manda
          e a contagem desce para não competir com ele. */}
      {contagem > 0 && (
        <span
          className={`tnums absolute flex items-center justify-center rounded-full font-semibold ${
            temCritico
              ? '-bottom-1 -right-1 h-4 min-w-4 bg-danger px-1 text-[10px] text-ink ring-2 ring-surface-1'
              : '-right-0.5 -top-0.5 h-4 min-w-4 bg-gold px-1 text-[10px] text-navy'
          }`}
          aria-hidden="true"
        >
          {contagem}
        </span>
      )}
    </button>
  )
}
