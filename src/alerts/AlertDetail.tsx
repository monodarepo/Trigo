/**
 * DRAWER DE DETALHE DO ALERTA — camada global, montada no AppShell.
 *
 * Era um painel privado da aba `/alertas`. Virou global quando o alerta passou
 * a aparecer NA TELA da decisão: clicar no banner do MV Río Paraná dentro do
 * TLC tem de abrir o mesmo detalhe que a aba abre, sem tirar ninguém do lugar.
 * Um segundo detalhe, com outra tabela de dados relacionados, seria a
 * divergência de sempre.
 *
 * É aqui que o ciclo de vida fecha: reconhecer, adiar e resolver existiam no
 * store desde a consolidação, mas não tinham botão em superfície nenhuma — um
 * alerta entrava e nunca saía. Resolvendo daqui, ele some do banner, da fila,
 * do sino e da faixa crítica de uma vez, porque as cinco leem a mesma lista.
 */
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronRight, Clock, X } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { abrirObjeto } from '../components/object/objectBus'
import { emitirToast } from '../components/feedback/toastBus'
import { formatDataHoraPt, getAgente } from '../data'
import type { Alerta } from '../data/types'
import { adiar, reconhecer, resolver, marcarVisto, useListaAlertas } from './alertStore'
import { fecharCentral } from './centralStore'
import { SEVERIDADE_UI } from './severidade'

import { ROTULO_FICHA, categoriaDe, detalhesDoAlerta, impactoFormatado } from './detalhes'

// ---------------------------------------------------------------------------
// Bus de abertura (mesmo padrão de centralStore/objectBus)
// ---------------------------------------------------------------------------

let abertoId: string | null = null
const listeners = new Set<() => void>()

function definir(id: string | null) {
  if (abertoId === id) return
  abertoId = id
  for (const l of listeners) l()
}

/** Abre o detalhe de um alerta a partir de qualquer superfície. */
export function abrirDetalheAlerta(id: string) {
  // Dois painéis empilhados à direita seriam duas conversas ao mesmo tempo: a
  // Central sai de cena quando o detalhe entra.
  fecharCentral()
  marcarVisto(id)
  definir(id)
}

export function fecharDetalheAlerta() {
  definir(null)
}

function useDetalheId(): string | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => abertoId,
    () => null,
  )
}

/** Adiar por um dia — a unidade em que a mesa de fato reavalia. */
const UM_DIA_MS = 24 * 60 * 60 * 1000

function Conteudo({ alerta }: { alerta: Alerta }) {
  const navigate = useNavigate()
  const ui = SEVERIDADE_UI[alerta.severidade]
  const categoria = categoriaDe(alerta.categoria)
  const IconeCategoria = categoria.icone
  const impacto = impactoFormatado(alerta)
  const agente = alerta.agenteId ? getAgente(alerta.agenteId) : undefined
  const dados = detalhesDoAlerta(alerta)
  const fechar = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    fechar.current?.focus()
  }, [])

  const btnSecundario =
    'rounded-full border border-edge px-3 py-1.5 text-11 font-semibold text-ink-muted transition-colors hover:border-gold/40 hover:text-ink'

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: categoria.cor }}
          aria-hidden="true"
        >
          <IconeCategoria size={18} />
        </span>
        <button
          ref={fechar}
          type="button"
          onClick={fecharDetalheAlerta}
          aria-label="Fechar detalhe"
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-subtle hover:bg-white/5 hover:text-ink"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge kind="status" label={ui.rotulo} tone={ui.tone} />
        <Badge kind="status" label={categoria.rotulo} tone="neutral" />
        <span className="tnums text-[11px] text-ink-subtle">{formatDataHoraPt(alerta.timestamp)}</span>
        {alerta.status === 'adiado' && <Badge kind="status" label="Adiado" tone="neutral" />}
        {alerta.status === 'reconhecido' && <Badge kind="status" label="Reconhecido" tone="info" />}
      </div>

      <h3 className="mt-3 font-display text-lg font-semibold leading-snug text-ink">{alerta.titulo}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{alerta.descricao}</p>

      {impacto && (
        <div
          className={`mt-4 rounded-card border px-3 py-2.5 ${
            impacto.positivo ? 'border-positive/30 bg-positive/10' : 'border-danger/30 bg-danger/10'
          }`}
        >
          <p className="eyebrow">{impacto.positivo ? 'Valor a capturar' : 'Perda ou risco'}</p>
          <p
            className={`tnums mt-1 font-display text-2xl font-semibold ${
              impacto.positivo ? 'text-positive' : 'text-danger'
            }`}
          >
            {impacto.texto}
          </p>
          {alerta.impactoNota && <p className="mt-1 text-[11px] leading-snug text-ink-subtle">{alerta.impactoNota}</p>}
        </div>
      )}

      {agente && (
        <div className="mt-4 rounded-card border border-edge/60 bg-navy/40 px-3 py-2.5">
          <p className="eyebrow">Quem levantou</p>
          <p className="mt-1 text-sm font-semibold text-ink">{agente.nome}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-ink-subtle">{agente.pergunta}</p>
        </div>
      )}

      {dados.length > 0 && (
        <>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
            Dados relacionados
          </p>
          <dl className="mt-2 space-y-2 rounded-card border border-edge/60 bg-navy/40 p-3">
            {dados.map((d) => (
              <div key={d.rotulo} className="flex items-start justify-between gap-3 text-xs">
                <dt className="text-ink-subtle">{d.rotulo}</dt>
                <dd className="tnums text-right font-semibold text-ink">{d.valor}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      <p className="mt-4 text-[11px] leading-snug text-ink-faint">{alerta.fonte}</p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            fecharDetalheAlerta()
            navigate(alerta.acaoRota)
          }}
          className="inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-xs font-semibold text-navy transition-colors hover:bg-gold-light"
        >
          {alerta.acaoLabel}
          <ChevronRight size={14} aria-hidden="true" />
        </button>
        {alerta.entidade && (
          <button
            type="button"
            onClick={() => {
              const entidade = alerta.entidade!
              fecharDetalheAlerta()
              abrirObjeto(entidade.tipo, entidade.id)
            }}
            className="rounded-full border border-edge px-4 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-gold/40 hover:text-ink"
          >
            {ROTULO_FICHA[alerta.entidade.tipo] ?? 'Abrir ficha'}
          </button>
        )}
      </div>

      {/* Ciclo de vida — o que faz o alerta sair das superfícies */}
      <div className="mt-4 border-t border-edge/60 pt-3">
        <p className="eyebrow">Tratar</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              resolver(alerta.id)
              fecharDetalheAlerta()
              emitirToast({
                tom: 'sucesso',
                titulo: 'Alerta resolvido',
                descricao: 'Sai do banner da tela, da fila da Central e da contagem do sino.',
              })
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-positive/40 px-3 py-1.5 text-11 font-semibold text-positive transition-colors hover:bg-positive/10"
          >
            <Check size={12} aria-hidden="true" /> Resolver
          </button>
          <button
            type="button"
            onClick={() => {
              adiar(alerta.id, new Date(Date.parse(alerta.timestamp) + UM_DIA_MS).toISOString())
              fecharDetalheAlerta()
              emitirToast({ tom: 'neutro', titulo: 'Adiado por 24h', descricao: 'Sai da fila de decisão e continua ativo na aba.' })
            }}
            className={`inline-flex items-center gap-1.5 ${btnSecundario}`}
          >
            <Clock size={12} aria-hidden="true" /> Adiar 24h
          </button>
          <button
            type="button"
            onClick={() => {
              reconhecer(alerta.id)
              emitirToast({ tom: 'info', titulo: 'Reconhecido', descricao: 'Assumido: sai da fila, o risco continua na tela.' })
            }}
            className={btnSecundario}
          >
            Reconhecer
          </button>
        </div>
      </div>
    </>
  )
}

export function AlertDetailLayer() {
  const id = useDetalheId()
  const lista = useListaAlertas()
  const alerta = id ? lista.find((a) => a.id === id) : undefined

  useEffect(() => {
    if (!alerta) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation()
      fecharDetalheAlerta()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [alerta])

  return (
    <AnimatePresence>
      {alerta && (
        <>
          <motion.div
            className="fixed inset-0 z-[66] bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={fecharDetalheAlerta}
            aria-hidden="true"
          />
          <motion.aside
            className="fixed inset-y-0 right-0 z-[68] w-[400px] max-w-full overflow-y-auto border-l border-edge bg-card p-5 shadow-raised"
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: 420 }}
            transition={{ type: 'tween', duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label={`Detalhe do alerta: ${alerta.titulo}`}
          >
            {/* A Central some ao abrir o detalhe: dois painéis empilhados à
                direita seriam duas conversas ao mesmo tempo. */}
            <Conteudo key={alerta.id} alerta={alerta} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
