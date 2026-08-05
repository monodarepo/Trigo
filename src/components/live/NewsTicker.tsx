import { Newspaper } from 'lucide-react'
import { Card } from '../ui'
import { SourceBadge } from '../trust/SourceBadge'
import { useFrescorRelativo, useNoticiasAoVivo } from '../../live/useLiveData'
import { FONTE_GDELT } from '../../data'

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

/**
 * Ticker de notícias trigo & geopolítica: manchetes reais (GDELT, filtradas
 * por relevância) com fonte e horário; em Cenário/falha, as manchetes
 * encenadas do snapshot — mesma narrativa das outras telas.
 */
export function NewsTicker({ className = '' }: { className?: string }) {
  const noticias = useNoticiasAoVivo()
  const frescor = useFrescorRelativo(noticias.updatedAt)

  return (
    <Card padding="sm" className={className}>
      <div className="flex items-center gap-4">
        <span className="flex shrink-0 items-center gap-2">
          <Newspaper size={14} className="text-ink-subtle" aria-hidden="true" />
          <span className="eyebrow">Notícias · trigo & geopolítica</span>
          {noticias.isLive ? (
            <SourceBadge familia="alertas" fonteOverride={FONTE_GDELT} frescorOverride={frescor ?? undefined} />
          ) : (
            <span className="font-mono text-11 text-ink-faint">cenário</span>
          )}
        </span>
        <ul className="flex min-w-0 flex-1 items-center gap-6 overflow-x-auto [scrollbar-width:none]">
          {noticias.value.map((noticia) => (
            <li key={`${noticia.fonte}-${noticia.titulo.slice(0, 40)}`} className="flex shrink-0 items-baseline gap-2">
              <span className="max-w-[38ch] truncate text-xs text-ink-muted" title={noticia.titulo}>
                {noticia.titulo}
              </span>
              <span className="tnums shrink-0 font-mono text-11 text-ink-faint">
                {noticia.fonte} · {hora(noticia.horario)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
