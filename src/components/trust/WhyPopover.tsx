import { useId, useRef, useState, type FocusEvent as EventoFoco, type KeyboardEvent as EventoTecla, type MouseEvent as EventoMouse, type ReactNode } from 'react'
import { HelpCircle } from 'lucide-react'
import { fonteDe, type FamiliaDado } from '../../data'
import { DetalheFonte } from './SourceBadge'

export interface LinhaCalculo {
  /** Rótulo da parcela (ex.: "Trigo ÷ rendimento"). */
  rotulo: string
  /** Valor já formatado (ex.: "R$ 1.926,60/t"). */
  valor: string
  /** Linha de total/resultado — recebe peso visual. */
  destaque?: boolean
}

export interface WhyPopoverProps {
  /** Título do popover (ex.: "Custo da farinha — Fortaleza"). */
  titulo: string
  /** Explicação em texto corrido: a fórmula e o porquê, em português do Brasil. */
  explicacao: string
  /** Memória de cálculo, linha a linha. */
  linhas?: readonly LinhaCalculo[]
  /** Quando presente, habilita a aba "Fonte" reusando DetalheFonte + fonteDe(familia). */
  familia?: FamiliaDado
  /** Gatilho custom. Sem ele, renderiza um ícone de ajuda discreto. */
  children?: ReactNode
  posicao?: 'acima' | 'abaixo'
  className?: string
}

type Aba = 'calculo' | 'fonte'

const ABAS: readonly { readonly id: Aba; readonly rotulo: string }[] = [
  { id: 'calculo', rotulo: 'Cálculo' },
  { id: 'fonte', rotulo: 'Fonte' },
]

/**
 * Neutraliza a moldura própria do DetalheFonte (que é um card completo, pensado
 * para o popover do SourceBadge) para ele herdar a moldura deste painel — sem
 * card dentro de card. Variantes arbitrárias têm especificidade maior que as
 * utilitárias simples do filho, então vencem sem !important e sem editar o
 * SourceBadge. O alvo é a raiz <div> do DetalheFonte.
 */
const FONTE_SEM_MOLDURA =
  '[&>div]:w-full [&>div]:rounded-none [&>div]:border-0 [&>div]:bg-transparent [&>div]:p-0 [&>div]:shadow-none'

/**
 * O "porquê" de um número: fórmula em texto, memória de cálculo linha a linha e —
 * quando a família de dado é informada — a aba de proveniência do SourceBadge.
 * Abre no hover e no foco; fecha no mouseleave, no blur para fora e no Escape.
 */
export function WhyPopover({
  titulo,
  explicacao,
  linhas,
  familia,
  children,
  posicao = 'abaixo',
  className = '',
}: WhyPopoverProps): JSX.Element {
  const [aberto, setAberto] = useState(false)
  const [aba, setAba] = useState<Aba>('calculo')
  const idBase = useId()
  const idPopover = `${idBase}-popover`
  const gatilhoRef = useRef<HTMLButtonElement>(null)
  const abasRef = useRef<Partial<Record<Aba, HTMLButtonElement | null>>>({})
  /** Evita que o foco devolvido ao gatilho pelo Escape reabra o painel. */
  const ignorarProximoFoco = useRef(false)

  const fonte = familia ? fonteDe(familia) : null
  /* Com abas focáveis dentro, role="tooltip" é errado: tooltip não pode conter
     conteúdo interativo e leitores de tela não expõem os controles. Vira um
     agrupamento rotulado. Sem abas o conteúdo é estático e tooltip vale. */
  const temAbas = fonte != null
  const comAbas = fonte !== null
  const abaAtiva: Aba = comAbas ? aba : 'calculo'

  const aoFocar = () => {
    if (ignorarProximoFoco.current) return
    setAberto(true)
  }

  const aoDesfocar = (e: EventoFoco<HTMLSpanElement>) => {
    // Foco que ficou dentro do popover (abas, painel) não fecha nada.
    if (e.currentTarget.contains(e.relatedTarget)) return
    setAberto(false)
  }

  const aoSairMouse = (e: EventoMouse<HTMLSpanElement>) => {
    // Mouse saiu, mas o teclado ainda está lá dentro: mantém aberto.
    if (e.currentTarget.contains(document.activeElement)) return
    setAberto(false)
  }

  const aoTeclar = (e: EventoTecla<HTMLSpanElement>) => {
    if (e.key !== 'Escape' || !aberto) return
    e.stopPropagation()
    ignorarProximoFoco.current = true
    setAberto(false)
    gatilhoRef.current?.focus()
    ignorarProximoFoco.current = false
  }

  const navegarAbas = (e: EventoTecla<HTMLButtonElement>) => {
    const atual = ABAS.findIndex((a) => a.id === abaAtiva)
    let alvo: number
    if (e.key === 'ArrowRight') alvo = (atual + 1) % ABAS.length
    else if (e.key === 'ArrowLeft') alvo = (atual - 1 + ABAS.length) % ABAS.length
    else if (e.key === 'Home') alvo = 0
    else if (e.key === 'End') alvo = ABAS.length - 1
    else return
    e.preventDefault()
    const proxima = ABAS[alvo].id
    setAba(proxima)
    abasRef.current[proxima]?.focus()
  }

  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setAberto(true)}
      onMouseLeave={aoSairMouse}
      onFocus={aoFocar}
      onBlur={aoDesfocar}
      onKeyDown={aoTeclar}
    >
      <button
        ref={gatilhoRef}
        type="button"
        aria-label={children ? undefined : `Por que este número? ${titulo}`}
        aria-expanded={aberto}
        aria-describedby={aberto ? idPopover : undefined}
        onClick={() => setAberto((v) => !v)}
        className={
          children
            ? 'inline-flex cursor-help items-center text-left'
            : 'inline-flex cursor-help items-center rounded-full border border-transparent p-0.5 text-ink-faint transition-colors hover:border-edge hover:bg-white/[0.03] hover:text-ink-subtle focus-visible:border-edge focus-visible:text-ink-subtle'
        }
      >
        {children ?? <HelpCircle size={13} strokeWidth={2} aria-hidden="true" />}
        {children ? <span className="sr-only"> — por quê: {titulo}</span> : null}
      </button>

      {aberto && (
        <div
          id={idPopover}
          role={temAbas ? 'group' : 'tooltip'}
          aria-label={temAbas ? `Por quê: ${titulo}` : undefined}
          className={`absolute left-0 z-40 max-w-[calc(100vw-2rem)] translate-x-0 sm:left-1/2 sm:-translate-x-1/2 ${
            posicao === 'acima'
              ? 'bottom-full pb-2 before:absolute before:inset-x-0 before:top-full before:h-2 before:content-[""]'
              : 'top-full pt-2 before:absolute before:inset-x-0 before:bottom-full before:h-2 before:content-[""]'
          }`}
        >
          <div className="w-72 rounded-card border border-edge bg-card-2 p-3 text-left shadow-raised">
            <p className="eyebrow">Por quê</p>
            <p className="mt-1 text-12 font-medium leading-snug text-ink">{titulo}</p>

            {comAbas && (
              <div
                role="tablist"
                aria-label={`Detalhamento: ${titulo}`}
                className="mt-2.5 flex gap-1 border-t border-edge/60 pt-2.5"
              >
                {ABAS.map((a) => {
                  const ativa = abaAtiva === a.id
                  return (
                    <button
                      key={a.id}
                      ref={(el) => {
                        abasRef.current[a.id] = el
                      }}
                      type="button"
                      role="tab"
                      id={`${idBase}-aba-${a.id}`}
                      aria-selected={ativa}
                      aria-controls={`${idBase}-painel-${a.id}`}
                      tabIndex={ativa ? 0 : -1}
                      onClick={() => setAba(a.id)}
                      onKeyDown={navegarAbas}
                      className={`rounded-full px-2 py-0.5 text-11 font-semibold transition-colors ${
                        ativa ? 'bg-gold/10 text-gold' : 'text-ink-faint hover:bg-white/[0.03] hover:text-ink-subtle'
                      }`}
                    >
                      {a.rotulo}
                    </button>
                  )
                })}
              </div>
            )}

            <div
              role={comAbas ? 'tabpanel' : undefined}
              id={comAbas ? `${idBase}-painel-${abaAtiva}` : undefined}
              aria-labelledby={comAbas ? `${idBase}-aba-${abaAtiva}` : undefined}
              tabIndex={comAbas ? 0 : undefined}
              className="mt-2.5"
            >
              {abaAtiva === 'fonte' && fonte ? (
                <div className={FONTE_SEM_MOLDURA}>
                  <DetalheFonte fonte={fonte} frescor={fonte.frescorRotulo} />
                </div>
              ) : (
                <>
                  <p className="text-11 leading-relaxed text-ink-muted">{explicacao}</p>
                  {linhas && linhas.length > 0 && (
                    <dl className="mt-2.5 space-y-1 border-t border-edge/60 pt-2.5 text-11">
                      {linhas.map((linha, i) => (
                        <div
                          key={`${linha.rotulo}-${i}`}
                          className={`flex items-baseline justify-between gap-3 ${
                            linha.destaque ? 'mt-1.5 border-t border-edge/60 pt-1.5' : ''
                          }`}
                        >
                          <dt className={`min-w-0 leading-snug ${linha.destaque ? 'font-semibold text-ink' : 'text-ink-faint'}`}>
                            {linha.rotulo}
                          </dt>
                          <dd
                            className={`tnums shrink-0 whitespace-nowrap text-right font-mono ${
                              linha.destaque ? 'font-semibold text-ink' : 'text-ink-muted'
                            }`}
                          >
                            {linha.valor}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </span>
  )
}
