import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Pause, Play, Repeat, SkipBack, SkipForward, X } from 'lucide-react'
import { ROTEIRO } from './roteiro'
import { aoAbrirApresentacao, marcarApresentacao } from './presentStore'

interface RectAlvo {
  top: number
  left: number
  width: number
  height: number
}

const DURACOES_S = [8, 12, 20] as const
const MARGEM_SPOT = 10
const TENTATIVAS_ALVO = 30
const INTERVALO_ALVO_MS = 100

const reduzMovimento = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Modo apresentação: roda a narrativa das 7h em 8 passos, sem operador.
 * Navega para cada tela, converge um spotlight no elemento central
 * (cross-fade + leve zoom, estilo câmera) e narra com uma legenda curta.
 * Reduced-motion: sem spotlight/zoom — só troca de tela + legenda.
 */
export function PresentationMode() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [ativo, setAtivo] = useState(false)
  const [indice, setIndice] = useState(0)
  /** Contador de execução: re-roda o passo mesmo quando o índice não muda (dot do passo atual, reinício). */
  const [execucao, setExecucao] = useState(0)
  const [tocando, setTocando] = useState(true)
  const [loop, setLoop] = useState(false)
  const [duracaoS, setDuracaoS] = useState<number>(12)
  const [progresso, setProgresso] = useState(0)
  const [rect, setRect] = useState<RectAlvo | null>(null)
  const [transicionando, setTransicionando] = useState(false)

  const progressoRef = useRef(0)
  const alvoRef = useRef<HTMLElement | null>(null)
  const buscaRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const rafBuscaRef = useRef(0)
  const botaoPlayRef = useRef<HTMLButtonElement | null>(null)
  /** Rota atual (ref para não entrar nas deps do efeito de passo). */
  const rotaAtualRef = useRef(pathname)
  rotaAtualRef.current = pathname
  /** Já houve navegação nesta sessão de apresentação? (1ª = push, demais = replace) */
  const navegouRef = useRef(false)
  /** Quem tinha o foco antes de abrir — restaurado ao sair. */
  const abridorRef = useRef<HTMLElement | null>(null)

  const limparZoom = useCallback(() => {
    const el = alvoRef.current
    if (!el) return
    el.style.transform = ''
    el.style.transition = ''
    alvoRef.current = null
  }, [])

  const medir = useCallback(() => {
    const el = alvoRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
  }, [])

  const zerarProgresso = useCallback(() => {
    progressoRef.current = 0
    setProgresso(0)
  }, [])

  const sair = useCallback(() => {
    if (buscaRef.current) clearInterval(buscaRef.current)
    limparZoom()
    setAtivo(false)
    setRect(null)
    marcarApresentacao(false)
    abridorRef.current?.focus()
    abridorRef.current = null
  }, [limparZoom])

  const irPara = useCallback(
    (proximo: number) => {
      limparZoom()
      setRect(null)
      zerarProgresso()
      setIndice(proximo)
      setExecucao((e) => e + 1)
    },
    [limparZoom, zerarProgresso],
  )

  const avancar = useCallback(() => {
    if (indice >= ROTEIRO.length - 1) {
      if (loop) irPara(0)
      else sair()
      return
    }
    irPara(indice + 1)
  }, [indice, loop, irPara, sair])

  const voltar = useCallback(() => irPara(Math.max(0, indice - 1)), [indice, irPara])

  // Abertura via bus (Topbar, palette, tecla P)
  useEffect(
    () =>
      aoAbrirApresentacao(() => {
        abridorRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        navegouRef.current = false
        marcarApresentacao(true)
        irPara(0)
        setTocando(true)
        setAtivo(true)
      }),
    [irPara],
  )

  // Foco entra nos controles ao abrir — senão Espaço reativa o botão disparador
  useEffect(() => {
    if (ativo) botaoPlayRef.current?.focus()
  }, [ativo])

  // Executa o passo: navega, espera o alvo (skeleton da 1ª visita), foca a câmera
  useEffect(() => {
    if (!ativo) return
    const passo = ROTEIRO[indice]
    const rm = reduzMovimento()
    setTransicionando(true)
    // Só navega se preciso; 1ª navegação empilha (Voltar retorna ao ponto de
    // partida), as demais substituem — a demo não polui o histórico.
    if (rotaAtualRef.current !== passo.rota) {
      navigate(passo.rota, { replace: navegouRef.current })
      navegouRef.current = true
    }

    let tentativas = 0
    buscaRef.current = setInterval(() => {
      tentativas += 1
      const el = document.querySelector<HTMLElement>(passo.alvo)
      if (el) {
        if (buscaRef.current) clearInterval(buscaRef.current)
        // Referência já no tick: limparZoom acha o alvo mesmo se o rAF for cancelado
        if (!rm) alvoRef.current = el
        el.scrollIntoView({ block: 'center', behavior: 'auto' })
        rafBuscaRef.current = requestAnimationFrame(() => {
          if (!rm) {
            el.style.transition = 'transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1)'
            el.style.transform = 'scale(1.015)'
            medir()
          }
          setTransicionando(false)
        })
      } else if (tentativas >= TENTATIVAS_ALVO) {
        // Alvo indisponível (ex.: visualização 3D caiu no fallback): segue sem spotlight
        if (buscaRef.current) clearInterval(buscaRef.current)
        setTransicionando(false)
      }
    }, INTERVALO_ALVO_MS)

    return () => {
      if (buscaRef.current) clearInterval(buscaRef.current)
      cancelAnimationFrame(rafBuscaRef.current)
    }
    // `navigate` fica fora das deps de propósito: no router declarativo a identidade
    // dele muda a cada troca de pathname e re-executaria o passo (véu duplo).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo, indice, execucao, medir])

  // Câmera acompanha scroll/resize
  useEffect(() => {
    if (!ativo) return
    const acompanhar = () => requestAnimationFrame(medir)
    window.addEventListener('scroll', acompanhar, { passive: true })
    window.addEventListener('resize', acompanhar)
    return () => {
      window.removeEventListener('scroll', acompanhar)
      window.removeEventListener('resize', acompanhar)
    }
  }, [ativo, medir])

  // Auto-avanço com barra de progresso (pausável)
  useEffect(() => {
    if (!ativo || !tocando || transicionando) return
    let raf = 0
    let ultimo = performance.now()
    const passoTempo = (agora: number) => {
      progressoRef.current += (agora - ultimo) / (duracaoS * 1000)
      ultimo = agora
      if (progressoRef.current >= 1) {
        avancar()
        return
      }
      setProgresso(progressoRef.current)
      raf = requestAnimationFrame(passoTempo)
    }
    raf = requestAnimationFrame(passoTempo)
    return () => cancelAnimationFrame(raf)
  }, [ativo, tocando, transicionando, duracaoS, avancar])

  // Teclado: Esc sai, setas navegam, espaço pausa/retoma
  useEffect(() => {
    if (!ativo) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Se um overlay próprio está aberto (ficha, notificações…), o Esc é dele
        if (document.querySelector('[role="dialog"]')) return
        e.preventDefault()
        sair()
        return
      }
      const tag = (e.target as HTMLElement | null)?.tagName ?? ''
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        // Setas não têm ação nativa em BUTTON — só cedem a campos/selects
        if (['SELECT', 'INPUT', 'TEXTAREA'].includes(tag)) return
        e.preventDefault()
        if (e.key === 'ArrowRight') avancar()
        else voltar()
      } else if (e.key === ' ') {
        // Espaço ativa botões nativamente (ex.: play/pause focado) — não duplica
        if (['BUTTON', 'SELECT', 'INPUT', 'TEXTAREA'].includes(tag)) return
        e.preventDefault()
        setTocando((t) => !t)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [ativo, sair, avancar, voltar])

  if (!ativo) return null

  const passo = ROTEIRO[indice]
  const rm = reduzMovimento()
  const btn =
    'flex h-8 w-8 items-center justify-center rounded-full border border-edge text-ink-muted transition-colors hover:border-gold/40 hover:text-ink'

  return (
    <>
      {/* Véu de transição (cross-fade de câmera) */}
      <AnimatePresence>
        {transicionando && !rm && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-[85] bg-base"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.94 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Spotlight: buraco iluminado + resto da tela escurecido */}
      {!rm && rect && !transicionando && (
        <motion.div
          data-apresentacao-spot
          className="pointer-events-none fixed z-[75] rounded-card-lg"
          initial={{
            top: rect.top - MARGEM_SPOT - 60,
            left: rect.left - MARGEM_SPOT - 90,
            width: rect.width + MARGEM_SPOT * 2 + 180,
            height: rect.height + MARGEM_SPOT * 2 + 120,
            opacity: 0,
          }}
          animate={{
            top: rect.top - MARGEM_SPOT,
            left: rect.left - MARGEM_SPOT,
            width: rect.width + MARGEM_SPOT * 2,
            height: rect.height + MARGEM_SPOT * 2,
            opacity: 1,
          }}
          transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
          style={{ boxShadow: '0 0 0 9999px rgba(4, 8, 18, 0.66)', border: '1px solid rgba(245, 166, 35, 0.4)' }}
          aria-hidden="true"
        />
      )}

      {/* Legenda + controles (aria-live no contêiner persistente: cada passo é anunciado) */}
      <div
        role="region"
        aria-label="Modo apresentação"
        aria-live="polite"
        className="fixed inset-x-3 bottom-4 z-[90] mx-auto max-w-2xl"
      >
        <motion.div
          key={indice}
          initial={rm ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
          className="rounded-card-lg border border-edge bg-surface-1/95 p-4 shadow-raised backdrop-blur"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow">
                Apresentação · passo {indice + 1} de {ROTEIRO.length}
              </p>
              <h3 className="mt-0.5 font-display text-base font-semibold text-gold-light">{passo.titulo}</h3>
            </div>
            <button type="button" onClick={sair} aria-label="Sair da apresentação (Esc)" className={btn}>
              <X size={15} aria-hidden="true" />
            </button>
          </div>
          <p className="tnums mt-1.5 text-13 leading-relaxed text-ink-muted">{passo.olhar}</p>

          {/* Progresso do passo */}
          <div className="mt-3 h-0.5 overflow-hidden rounded-full bg-edge/50" aria-hidden="true">
            <div className="h-full rounded-full bg-gold" style={{ width: `${Math.min(100, progresso * 100)}%` }} />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            {/* Pontos dos passos */}
            <div className="flex items-center gap-1.5" role="group" aria-label="Passos da apresentação">
              {ROTEIRO.map((p, i) => (
                <button
                  key={p.rota}
                  type="button"
                  onClick={() => irPara(i)}
                  aria-label={`Ir para o passo ${i + 1}: ${p.titulo}`}
                  aria-current={i === indice ? 'step' : undefined}
                  className={`h-1.5 rounded-full transition-all ${
                    i === indice ? 'w-5 bg-gold' : 'w-1.5 bg-edge-strong hover:bg-ink-faint'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button type="button" onClick={voltar} aria-label="Passo anterior (←)" className={btn} disabled={indice === 0}>
                <SkipBack size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                ref={botaoPlayRef}
                onClick={() => setTocando((t) => !t)}
                aria-label={tocando ? 'Pausar (espaço)' : 'Continuar (espaço)'}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-navy transition-colors hover:bg-gold-light"
              >
                {tocando ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
              </button>
              <button type="button" onClick={avancar} aria-label="Próximo passo (→)" className={btn}>
                <SkipForward size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setLoop((l) => !l)}
                aria-label="Repetir em loop"
                aria-pressed={loop}
                className={`${btn} ${loop ? 'border-gold/50 bg-gold/15 text-gold-light' : ''}`}
              >
                <Repeat size={14} aria-hidden="true" />
              </button>
              <label className="ml-1 flex items-center gap-1.5">
                <span className="text-11 text-ink-faint">Tempo</span>
                <select
                  value={duracaoS}
                  aria-label="Tempo por passo"
                  onChange={(e) => setDuracaoS(Number(e.target.value))}
                  className="rounded-full border border-edge bg-card-2 py-1 pl-2.5 pr-2 text-11 font-medium text-ink-muted hover:text-ink"
                >
                  {DURACOES_S.map((s) => (
                    <option key={s} value={s}>
                      {s}s
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  )
}
