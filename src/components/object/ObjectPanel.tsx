import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, ChevronRight, Info, X } from 'lucide-react'
import { Badge, Pill, Sparkline, type Tone } from '../ui'
import { Freshness } from '../live/Freshness'
import {
  ROTULO_TIPO,
  resolverObjeto,
  type MiniGraficoObjeto,
  type ObjetoDetalhe,
  type TomObjeto,
} from '../../data/objects'
import { formatDataPt } from '../../data'
import { EVENTO_OBJETO, type AbrirObjetoDetail } from './objectBus'

const TOM_PARA_TONE: Record<TomObjeto, Tone> = {
  neutro: 'neutral',
  positivo: 'positive',
  atencao: 'warning',
  risco: 'danger',
  info: 'info',
}

const TOM_TEXTO: Record<TomObjeto, string> = {
  neutro: 'text-ink',
  positivo: 'text-positive',
  atencao: 'text-warning',
  risco: 'text-danger',
  info: 'text-azure',
}

const TOM_BARRA: Record<TomObjeto, string> = {
  neutro: 'bg-edge-strong',
  positivo: 'bg-positive',
  atencao: 'bg-warning',
  risco: 'bg-danger',
  info: 'bg-azure',
}

function MiniGrafico({ grafico }: { grafico: MiniGraficoObjeto }) {
  if (grafico.tipo === 'progresso' || grafico.tipo === 'medidor') {
    const pct = Math.max(0, Math.min(100, grafico.pct))
    return (
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="eyebrow">{grafico.rotulo}</span>
          <span className={`tnums font-mono text-12 font-semibold ${TOM_TEXTO[grafico.tom]}`}>
            {grafico.tipo === 'medidor' ? grafico.texto : `${grafico.pct}%`}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-edge/40">
          <div className={`h-full rounded-full ${TOM_BARRA[grafico.tom]}`} style={{ width: `${pct}%` }} />
        </div>
        {grafico.tipo === 'progresso' && (
          <div className="mt-1 flex justify-between text-11 text-ink-faint">
            <span>{grafico.esquerda}</span>
            <span>{grafico.direita}</span>
          </div>
        )}
      </div>
    )
  }
  if (grafico.tipo === 'sparkline') {
    return (
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="eyebrow">{grafico.rotulo}</span>
          <span className="tnums font-mono text-12 font-semibold text-gold-light">{grafico.texto}</span>
        </div>
        <div className="mt-2">
          <Sparkline data={grafico.dados} width={360} height={36} tone="gold" />
        </div>
      </div>
    )
  }
  const maximo = Math.max(...grafico.itens.map((i) => i.valor))
  return (
    <div>
      <span className="eyebrow">{grafico.rotulo}</span>
      <ul className="mt-2 space-y-1.5">
        {grafico.itens.map((item) => (
          <li key={item.rotulo} className="flex items-center gap-2">
            <span className="w-28 shrink-0 text-11 text-ink-subtle">{item.rotulo}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-edge/40">
              <span
                className={`block h-full rounded-full ${TOM_BARRA[item.tom]}`}
                style={{ width: `${(item.valor / maximo) * 100}%` }}
              />
            </span>
            <span className="tnums w-20 shrink-0 text-right font-mono text-11 text-ink-muted">{item.texto}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ConteudoObjeto({
  objeto,
  aoAbrirRelacionado,
  aoAgir,
}: {
  objeto: ObjetoDetalhe
  aoAbrirRelacionado: (tipo: AbrirObjetoDetail['tipo'], id: string) => void
  aoAgir: (acao: { rota?: string; toast?: string }) => void
}) {
  return (
    <>
      {/* Atributos-chave */}
      <dl className="mt-4 grid grid-cols-2 gap-2">
        {objeto.atributos.map((attr) => (
          <div key={attr.rotulo} className="rounded-card border border-edge/60 bg-surface-1/60 px-3 py-2">
            <dt className="flex items-center gap-1 text-11 text-ink-faint">
              {attr.rotulo}
              {attr.porque && (
                <span title={attr.porque} className="cursor-help text-ink-subtle">
                  <Info size={11} aria-label={`Por quê: ${attr.porque}`} />
                </span>
              )}
            </dt>
            <dd className={`tnums mt-0.5 font-mono text-13 font-semibold ${attr.tom ? TOM_TEXTO[attr.tom] : 'text-ink'}`}>
              {attr.valor}
            </dd>
          </div>
        ))}
      </dl>

      {objeto.grafico && (
        <div className="mt-4 rounded-card border border-edge/60 bg-surface-1/60 p-3">
          <MiniGrafico grafico={objeto.grafico} />
        </div>
      )}

      {/* Relacionados */}
      {objeto.relacionados
        .filter((g) => g.refs.length > 0)
        .map((grupo) => (
          <div key={grupo.grupo} className="mt-4">
            <p className="eyebrow">{grupo.grupo}</p>
            <ul className="mt-2 space-y-1.5">
              {grupo.refs.map((ref) => (
                <li key={`${ref.tipo}-${ref.id}`}>
                  <button
                    type="button"
                    onClick={() => aoAbrirRelacionado(ref.tipo, ref.id)}
                    className="group flex w-full items-center gap-2.5 rounded-card border border-edge/60 bg-surface-1/40 px-3 py-2 text-left transition-colors hover:border-gold/40 hover:bg-surface-3"
                  >
                    <Pill tone="neutral" className="shrink-0">
                      {ROTULO_TIPO[ref.tipo]}
                    </Pill>
                    <span className="min-w-0 truncate text-13 text-ink-muted group-hover:text-ink">{ref.rotulo}</span>
                    <ChevronRight size={14} className="ml-auto shrink-0 text-ink-faint group-hover:text-gold" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}

      {/* Timeline */}
      {objeto.timeline.length > 0 && (
        <div className="mt-4">
          <p className="eyebrow">Linha do tempo</p>
          <ul className="mt-2 border-l border-edge/60 pl-4">
            {objeto.timeline.map((evento, i) => (
              <li key={`${evento.data}-${i}`} className="relative pb-3 last:pb-0">
                <span
                  className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-card ${TOM_BARRA[evento.tom ?? 'neutro']}`}
                  aria-hidden="true"
                />
                <p className="tnums font-mono text-11 text-ink-faint">{formatDataPt(evento.data)}</p>
                <p className={`text-13 font-medium ${evento.tom ? TOM_TEXTO[evento.tom] : 'text-ink'}`}>{evento.titulo}</p>
                {evento.descricao && <p className="tnums mt-0.5 text-12 leading-snug text-ink-subtle">{evento.descricao}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ações contextuais */}
      {objeto.acoes.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-edge/60 pt-4">
          {objeto.acoes.map((acao, i) => (
            <button
              key={acao.rotulo}
              type="button"
              onClick={() => aoAgir(acao)}
              className={
                i === 0
                  ? 'rounded-full bg-gold px-4 py-2 text-xs font-semibold text-navy transition-colors hover:bg-gold-light'
                  : 'rounded-full border border-edge px-4 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-gold/40 hover:text-ink'
              }
            >
              {acao.rotulo}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

/** Camada global do painel de objeto (estilo Foundry) — montada no AppShell. */
export function ObjectPanelLayer() {
  const navigate = useNavigate()
  const [pilha, setPilha] = useState<AbrirObjetoDetail[]>([])
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const abre = (e: Event) => setPilha([(e as CustomEvent<AbrirObjetoDetail>).detail])
    window.addEventListener(EVENTO_OBJETO, abre)
    return () => window.removeEventListener(EVENTO_OBJETO, abre)
  }, [])

  useEffect(() => {
    if (pilha.length === 0) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPilha([])
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pilha.length])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  const topo = pilha[pilha.length - 1]
  const objeto = topo ? resolverObjeto(topo) : null

  return (
    <>
      <AnimatePresence>
        {topo && objeto && (
          <>
            <motion.div
              className="fixed inset-0 z-[52] bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setPilha([])}
              aria-hidden="true"
            />
            <motion.aside
              className="fixed inset-y-0 right-0 z-[55] w-[420px] max-w-full overflow-y-auto border-l border-edge bg-card shadow-raised"
              initial={{ x: 440 }}
              animate={{ x: 0 }}
              exit={{ x: 440 }}
              transition={{ type: 'tween', duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
              role="dialog"
              aria-modal="true"
              aria-label={`Ficha: ${objeto.ref.rotulo}`}
            >
              <div className="p-5">
                <div className="flex items-center gap-2">
                  {pilha.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setPilha((p) => p.slice(0, -1))}
                      aria-label="Voltar ao objeto anterior"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-subtle hover:bg-white/5 hover:text-ink"
                    >
                      <ArrowLeft size={16} aria-hidden="true" />
                    </button>
                  )}
                  <Pill tone="gold">{ROTULO_TIPO[objeto.ref.tipo]}</Pill>
                  <Badge kind="status" label={objeto.status.rotulo} tone={TOM_PARA_TONE[objeto.status.tom]} />
                  <button
                    type="button"
                    autoFocus
                    onClick={() => setPilha([])}
                    aria-label="Fechar ficha"
                    className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-subtle hover:bg-white/5 hover:text-ink"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>

                <h3 className="mt-3 font-display text-20 font-semibold leading-tight text-ink">{objeto.ref.rotulo}</h3>
                {objeto.subtitulo && <p className="mt-0.5 text-13 text-ink-subtle">{objeto.subtitulo}</p>}
                <Freshness className="mt-1.5" />

                <ConteudoObjeto
                  key={`${topo.tipo}-${topo.id}`}
                  objeto={objeto}
                  aoAbrirRelacionado={(tipo, id) => setPilha((p) => [...p, { tipo, id }])}
                  aoAgir={(acao) => {
                    if (acao.toast) setToast(acao.toast)
                    if (acao.rota) {
                      setPilha([])
                      navigate(acao.rota)
                    }
                  }}
                />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-[80] flex max-w-sm items-center gap-3 rounded-card-lg border border-positive/40 bg-card-2 px-4 py-3 shadow-raised"
        >
          <CheckCircle2 size={18} className="shrink-0 text-positive" aria-hidden="true" />
          <p className="text-sm text-ink">{toast}</p>
        </div>
      )}
    </>
  )
}
