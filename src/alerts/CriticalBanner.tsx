/**
 * FAIXA CRÍTICA — a linha fina no topo do conteúdo quando algo não pode
 * esperar o próximo olhar no sino.
 *
 * Regras de sobriedade, porque uma faixa permanente vira papel de parede:
 *  - só o crítico do TOPO da fila (nunca uma pilha de faixas);
 *  - dispensável, e a dispensa vale para AQUELE alerta — se outro crítico
 *    chegar, a faixa volta, porque é outro fato;
 *  - some sozinha quando o alerta é reconhecido, adiado ou resolvido, já que
 *    lê a mesma fila do sino e da Central.
 */
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertOctagon, X } from 'lucide-react'
import { marcarVisto, useListaAlertas } from './alertStore'
import { filaExigeDecisao } from './selectors'

export function CriticalBanner() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const lista = useListaAlertas()
  const [dispensados, setDispensados] = useState<string[]>([])
  const criticos = filaExigeDecisao(lista).filter((a) => a.severidade === 'critico')
  /**
   * A faixa mostra o crítico que a TELA AINDA NÃO ESTÁ MOSTRANDO. Se o alerta
   * declara esta rota em `telasRelacionadas`, o banner contextual já o exibe
   * logo abaixo do título — com impacto e CTA —, e a faixa viraria a mesma
   * frase duas vezes na mesma dobra. Crítico sempre encabeça a ordenação do
   * banner, então "declara a rota" equivale a "está visível ali".
   *
   * O efeito colateral é o melhor da mudança: no TLC a faixa passa a anunciar
   * o crítico de Bento Gonçalves, que o banner do TLC não cobre — duas
   * superfícies, dois fatos.
   */
  const critico = criticos.find(
    (a) => !dispensados.includes(a.id) && !a.telasRelacionadas.includes(pathname),
  )
  const quantos = criticos.length

  return (
    <AnimatePresence initial={false}>
      {critico && (
        <motion.div
          key={critico.id}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          className="overflow-hidden"
        >
          <div
            role="status"
            className="flex items-center gap-2.5 border-b border-danger/25 bg-danger/10 px-4 py-2 lg:px-8"
          >
            <AlertOctagon size={14} className="shrink-0 text-danger" aria-hidden="true" />
            <p className="min-w-0 flex-1 truncate text-12 text-ink-muted">
              <span className="font-semibold text-danger">
                {quantos} alerta{quantos === 1 ? '' : 's'} crítico{quantos === 1 ? '' : 's'} exige
                {quantos === 1 ? '' : 'm'} ação
              </span>
              <span className="text-ink-faint"> — </span>
              {critico.titulo}
            </p>
            {/* O CTA leva para onde a ação acontece — é o que o rótulo do
                alerta promete. A fila inteira continua a um clique no sino. */}
            <button
              type="button"
              onClick={() => {
                marcarVisto(critico.id)
                navigate(critico.acaoRota)
              }}
              className="shrink-0 rounded-full border border-danger/40 px-3 py-1 text-11 font-semibold text-danger transition-colors hover:bg-danger/15"
            >
              {critico.acaoLabel}
            </button>
            <button
              type="button"
              onClick={() => setDispensados((d) => [...d, critico.id])}
              aria-label="Dispensar faixa de alerta crítico"
              className="shrink-0 rounded-full p-1 text-ink-faint transition-colors hover:text-ink"
            >
              <X size={13} aria-hidden="true" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
