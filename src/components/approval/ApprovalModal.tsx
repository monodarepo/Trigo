import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, ChevronDown, PenLine } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { emitirToast } from '../feedback/toastBus'
import { registrarDecisao, type ModoDecisao } from './decisionStore'
import { getLiveState } from '../../live/liveStore'
import { snapshot, formatBRL, formatPct, formatTon, formatUSD } from '../../data'

const rec = snapshot.recomendacaoDoDia
const fmtCambio = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`
const origemNome = (id: string) => snapshot.dominio.origens.find((o) => o.id === id)?.nome ?? id
const valorLoteRs = rec.compra.volumeToneladas * rec.compra.tlcRs

/** Áreas/pessoas de alçada para o encaminhamento (mock coerente com a demo). */
const DESTINOS = [
  'Finanças — Ana Duarte (CFO)',
  'Supply — Bruno Sales (diretor)',
  'Tesouraria — Carla Nunes (gerente)',
  'Comitê S&OP (reunião de quinta)',
] as const

const MODOS: Array<{ id: ModoDecisao; rotulo: string }> = [
  { id: 'aprovada', rotulo: 'Aprovar' },
  { id: 'ajustada', rotulo: 'Ajustar' },
  { id: 'encaminhada', rotulo: 'Encaminhar para…' },
]

const BOTAO_CONFIRMA: Record<ModoDecisao, string> = {
  aprovada: 'Confirmar aprovação',
  ajustada: 'Confirmar ajuste',
  encaminhada: 'Confirmar encaminhamento',
}

/** Hora da decisão sobre a âncora 07:00 (relógio da sessão). */
const horaDecisao = () => {
  const minutos = Math.floor(getLiveState().segundos / 60)
  return `07:${String(Math.min(59, minutos)).padStart(2, '0')}`
}

export interface ApprovalModalProps {
  aberto: boolean
  modoInicial?: ModoDecisao
  aoFechar: () => void
}

/**
 * Fluxo de aprovação crível: resumo da decisão, alçada/materialidade,
 * comentário, Aprovar/Ajustar/Encaminhar e confirmação tipo assinatura.
 * Ao confirmar: registro no VRO + toast + micro-animação.
 */
export function ApprovalModal({ aberto, modoInicial, aoFechar }: ApprovalModalProps) {
  const [modo, setModo] = useState<ModoDecisao>('aprovada')
  const [comentario, setComentario] = useState('')
  const [destino, setDestino] = useState<string>(DESTINOS[0])
  const [assinado, setAssinado] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const timerFechar = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Layout effect: o reset acontece ANTES do paint — na reabertura o formulário
  // (com o autoFocus) monta já no primeiro frame, senão o Esc cai no body.
  useLayoutEffect(() => {
    if (!aberto) return
    setModo(modoInicial ?? 'aprovada')
    setComentario('')
    setDestino(DESTINOS[0])
    setAssinado(false)
    setSucesso(false)
  }, [aberto, modoInicial])

  useEffect(() => () => {
    if (timerFechar.current) clearTimeout(timerFechar.current)
  }, [])

  const confirmar = () => {
    const hora = horaDecisao()
    registrarDecisao({
      modo,
      comentario: comentario.trim() || undefined,
      destino: modo === 'encaminhada' ? destino : undefined,
      horaRotulo: hora,
    })
    setSucesso(true)
    timerFechar.current = setTimeout(() => {
      aoFechar()
      if (modo === 'aprovada') {
        emitirToast({ tom: 'sucesso', titulo: 'Recomendação aprovada — encaminhada para execução' })
      } else if (modo === 'ajustada') {
        emitirToast({ tom: 'info', titulo: 'Ajuste registrado', descricao: 'A mesa executa com o delta registrado no VRO.' })
      } else {
        emitirToast({ tom: 'info', titulo: `Encaminhada para ${destino}`, descricao: 'Aguardando a alçada — trilha registrada no VRO.' })
      }
    }, 950)
  }

  return (
    <AnimatePresence>
      {aberto && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onClick={aoFechar}
            aria-hidden="true"
          />
          <motion.div
            className="fixed inset-x-3 top-[8vh] z-[70] mx-auto max-h-[84vh] max-w-xl overflow-y-auto"
            initial={{ opacity: 0, scale: 0.99, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.99, y: -8 }}
            transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Aprovação da recomendação do dia"
            onKeyDown={(e) => e.key === 'Escape' && aoFechar()}
          >
            <div className="rounded-card-lg border border-gold/30 bg-card p-5 shadow-card-gold">
              {sucesso ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <motion.span
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-positive/15 text-positive"
                    aria-hidden="true"
                  >
                    <CheckCircle2 size={28} />
                  </motion.span>
                  <p className="mt-4 font-display text-base font-semibold text-ink">Decisão registrada</p>
                  <p className="mt-1 text-xs text-ink-subtle">
                    Entrou como linha no placar do VRO — recomendação × decisão × resultado.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="font-display text-16 font-semibold text-ink">Aprovar recomendação do dia</h3>
                    <Badge kind="confianca" value={rec.compra.confiancaPct} />
                  </div>
                  <p className="mt-1 text-13 leading-relaxed text-ink-muted">{rec.resumo}</p>

                  {/* Resumo da decisão */}
                  <dl className="tnums mt-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded-card border border-edge/60 bg-navy/40 p-3 text-xs sm:grid-cols-3">
                    <div>
                      <dt className="text-ink-faint">Volume</dt>
                      <dd className="mt-0.5 font-semibold text-ink">{formatTon(rec.compra.volumeToneladas)}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-faint">Origem · Porto</dt>
                      <dd className="mt-0.5 font-semibold text-ink">Argentina · Pecém</dd>
                    </div>
                    <div>
                      <dt className="text-ink-faint">Blend</dt>
                      <dd className="mt-0.5 font-semibold text-ink">
                        {rec.compra.blend.map((b) => b.pct).join('/')} ·{' '}
                        {rec.compra.blend.map((b) => origemNome(b.origemId).split(' ')[0]).join(' + ')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-faint">TLC</dt>
                      <dd className="mt-0.5 font-semibold text-gold-light">
                        {formatBRL(rec.compra.tlcRs)}/t <span className="font-normal text-ink-faint">vs {formatBRL(rec.compra.baselineRs)}</span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-faint">Hedge</dt>
                      <dd className="mt-0.5 font-semibold text-ink">
                        {formatPct(rec.hedge.coberturaAlvoPct)} · {formatUSD(rec.hedge.notionalNovoUsd, { compacto: true })} a{' '}
                        {fmtCambio(rec.hedge.taxaForwardMedia)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-faint">Impacto protegido</dt>
                      <dd className="mt-0.5 font-semibold text-positive">{formatBRL(rec.impactoProtegidoRs, { compacto: true })}</dd>
                    </div>
                  </dl>

                  {/* Alçada e materialidade */}
                  <p className="mt-3 rounded-card border border-warning/30 bg-warning/10 px-3 py-2 text-11 leading-snug text-ink-muted">
                    <span className="font-semibold text-warning">Alçada:</span> lote de{' '}
                    {formatBRL(valorLoteRs, { compacto: true })} · economia de{' '}
                    {formatBRL(rec.impactoProtegidoRs, { compacto: true })} — acima de R$ 1M → requer Finanças + Supply.
                  </p>

                  {/* Opções de decisão */}
                  <div role="group" aria-label="Tipo de decisão" className="mt-4 flex flex-wrap gap-2">
                    {MODOS.map((m, i) => (
                      <button
                        key={m.id}
                        type="button"
                        autoFocus={i === 0}
                        aria-pressed={modo === m.id}
                        onClick={() => setModo(m.id)}
                        className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                          modo === m.id
                            ? 'bg-gold text-navy'
                            : 'border border-edge text-ink-muted hover:border-gold/40 hover:text-ink'
                        }`}
                      >
                        {m.rotulo}
                      </button>
                    ))}
                  </div>
                  {modo === 'ajustada' && (
                    <p className="mt-2 text-11 text-ink-subtle">
                      Descreva o ajuste no comentário — a mesa executa e o delta fica registrado no VRO.
                    </p>
                  )}
                  {modo === 'encaminhada' && (
                    <label className="mt-3 flex flex-col gap-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">Encaminhar para</span>
                      <span className="relative flex items-center">
                        <select
                          value={destino}
                          aria-label="Encaminhar para"
                          onChange={(e) => setDestino(e.target.value)}
                          className="w-full appearance-none rounded-card border border-edge bg-card-2 py-2 pl-3 pr-8 text-sm text-ink transition-colors hover:border-gold/40"
                        >
                          {DESTINOS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 text-ink-subtle" aria-hidden="true" />
                      </span>
                    </label>
                  )}

                  {/* Comentário */}
                  <label className="mt-3 flex flex-col gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
                      Comentário (vai para a trilha de decisão)
                    </span>
                    <textarea
                      value={comentario}
                      onChange={(e) => setComentario(e.target.value)}
                      rows={2}
                      placeholder="Ex.: priorizar descarga em Pecém; reavaliar hedge se NDF passar de R$ 5,30"
                      className="w-full resize-none rounded-card border border-edge bg-card-2 px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-gold/40 focus:outline-none"
                    />
                  </label>

                  {/* Assinatura */}
                  <div className="mt-4 rounded-card border border-edge/60 bg-surface-1/60 p-3">
                    <label className="flex cursor-pointer items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={assinado}
                        onChange={(e) => setAssinado(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[#F5A623]"
                      />
                      <span className="text-xs leading-snug text-ink-muted">
                        <span className="font-semibold text-ink">Confirmo esta decisão</span> e seu registro na trilha de
                        auditoria (VRO) em meu nome — {snapshot.agora.slice(0, 10).split('-').reverse().join('/')},{' '}
                        {horaDecisao()}.
                      </span>
                    </label>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={aoFechar}
                      className="rounded-full border border-edge px-4 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-edge-strong hover:text-ink"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={!assinado}
                      onClick={confirmar}
                      className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                        assinado
                          ? 'bg-gold text-navy hover:bg-gold-light'
                          : 'cursor-not-allowed border border-edge bg-card-2 text-ink-faint'
                      }`}
                    >
                      <PenLine size={13} aria-hidden="true" />
                      {BOTAO_CONFIRMA[modo]}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
