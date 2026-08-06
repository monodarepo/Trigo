/**
 * DRAWER DE DETALHE DO ALERTA — camada global, montada no AppShell.
 *
 * Era um painel privado da aba `/alertas`. Virou global quando o alerta passou
 * a aparecer NA TELA da decisão: clicar no banner do MV Río Paraná dentro do
 * TLC tem de abrir o mesmo detalhe que a aba abre, sem tirar ninguém do lugar.
 *
 * É aqui que o alerta deixa de ser notificação e vira TRABALHO: reconhecer,
 * adiar com prazo, atribuir a uma área e resolver. As quatro ações existiam no
 * store desde a consolidação sem botão em superfície nenhuma — um alerta
 * entrava e nunca saía. Como as cinco superfícies leem a mesma lista, resolver
 * daqui o remove do banner, da fila, do sino e da faixa crítica de uma vez.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronRight, Clock, RotateCcw, UserPlus, X } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { WhyPopover } from '../components/trust/WhyPopover'
import { abrirObjeto } from '../components/object/objectBus'
import { emitirToast } from '../components/feedback/toastBus'
import { formatDataHoraPt, formatDataPt, getAgente } from '../data'
import type { Alerta } from '../data/types'
import { useLive } from '../live/liveStore'
import { adiar, atribuir, reabrir, reconhecer, resolver, marcarVisto, useListaAlertas } from './alertStore'
import { fecharCentral } from './centralStore'
import { SEVERIDADE_UI } from './severidade'
import { ROTULO_FICHA, categoriaDe, detalhesDoAlerta, impactoFormatado } from './detalhes'
import { AREAS, AREA_SUGERIDA, PERIODOS_ADIAMENTO } from './acoes'
import { registrar } from './registroVro'
import { horaDoCenario, tempoRelativo } from './tempo'

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

const MS_POR_HORA = 60 * 60 * 1000

const btnSecundario =
  'inline-flex items-center gap-1.5 rounded-full border border-edge px-3 py-1.5 text-11 font-semibold text-ink-muted transition-colors hover:border-gold/40 hover:text-ink'

function Conteudo({ alerta }: { alerta: Alerta }) {
  const navigate = useNavigate()
  const segundos = useLive((s) => s.segundos)
  const ui = SEVERIDADE_UI[alerta.severidade]
  const categoria = categoriaDe(alerta.categoria)
  const IconeCategoria = categoria.icone
  const impacto = impactoFormatado(alerta)
  const agente = alerta.agenteId ? getAgente(alerta.agenteId) : undefined
  const dados = detalhesDoAlerta(alerta)
  const [menu, setMenu] = useState<'adiar' | 'atribuir' | null>(null)
  const fechar = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    fechar.current?.focus()
  }, [])

  /** Toda ação deixa rastro na trilha do VRO — valor endereçado, não capturado. */
  const registrarTrilha = (acao: Parameters<typeof registrar>[0]['acao'], nota?: string, area?: string) =>
    registrar({
      alertaId: alerta.id,
      titulo: alerta.titulo,
      acao,
      impactoRs: alerta.impactoRs,
      tipo: alerta.tipo,
      impactoBase: alerta.impactoBase,
      categoria: alerta.categoria,
      area,
      nota,
      horaRotulo: horaDoCenario(segundos),
      emSegundos: segundos,
    })

  const aoReconhecer = () => {
    reconhecer(alerta.id)
    registrarTrilha('reconhecido')
    emitirToast({
      tom: 'info',
      titulo: 'Alerta reconhecido',
      descricao: 'Assumido: sai da fila de decisão e some o realce de novo. O risco continua na tela.',
    })
  }

  const aoAdiar = (periodo: (typeof PERIODOS_ADIAMENTO)[number]) => {
    const ate = new Date(Date.parse(alerta.timestamp) + periodo.horas * MS_POR_HORA).toISOString()
    adiar(alerta.id, ate)
    registrarTrilha('adiado', `até ${formatDataPt(ate)}`)
    setMenu(null)
    emitirToast({
      tom: 'neutro',
      titulo: `Adiado — ${periodo.rotulo.toLowerCase()}`,
      descricao: `Volta à fila em ${formatDataPt(ate)}. Sai do banner e da Central; continua ativo na aba.`,
    })
  }

  const aoAtribuir = (area: string) => {
    atribuir(alerta.id, area)
    registrarTrilha('atribuido', area, area)
    setMenu(null)
    emitirToast({ tom: 'sucesso', titulo: `Atribuído a ${area}`, descricao: 'Aparece com o dono na aba e na Central.' })
  }

  const aoResolver = () => {
    resolver(alerta.id)
    registrarTrilha('resolvido')
    fecharDetalheAlerta()
    emitirToast({
      tom: 'sucesso',
      titulo: 'Alerta resolvido',
      descricao: 'Sai do banner da tela, da fila da Central e da contagem do sino. Entra na trilha do VRO.',
    })
  }

  const aoAgir = () => {
    registrarTrilha('encaminhado', alerta.acaoLabel)
    fecharDetalheAlerta()
    navigate(alerta.acaoRota)
  }

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
        <span className="tnums text-[11px] text-ink-subtle" title={formatDataHoraPt(alerta.timestamp)}>
          {tempoRelativo(alerta, segundos)} · {formatDataHoraPt(alerta.timestamp)}
        </span>
      </div>

      <h3 className="mt-3 font-display text-lg font-semibold leading-snug text-ink">{alerta.titulo}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{alerta.descricao}</p>

      {/* Estado do ciclo de vida — só aparece depois que alguém agiu */}
      {(alerta.status === 'adiado' || alerta.status === 'reconhecido' || alerta.atribuidoA) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-card border border-edge/60 bg-navy/40 px-3 py-2">
          {alerta.status === 'reconhecido' && <Badge kind="status" label="Reconhecido" tone="info" />}
          {alerta.status === 'adiado' && (
            <Badge
              kind="status"
              label={alerta.adiadoAte ? `Adiado até ${formatDataPt(alerta.adiadoAte)}` : 'Adiado'}
              tone="neutral"
            />
          )}
          {alerta.atribuidoA && <span className="text-11 text-ink-muted">Dono: {alerta.atribuidoA}</span>}
        </div>
      )}

      {impacto && (
        <div
          className={`mt-4 rounded-card border px-3 py-2.5 ${
            impacto.positivo ? 'border-positive/30 bg-positive/10' : 'border-danger/30 bg-danger/10'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <p className="eyebrow">{impacto.positivo ? 'Valor a capturar' : 'Perda ou risco'}</p>
            {/* O PORQUÊ do número, na mesma gramática do resto do produto: a
                memória de cálculo é a mesma tabela que o drawer mostra abaixo,
                aqui ligada ao valor que ela explica. */}
            {dados.length > 0 && (
              <WhyPopover
                titulo={`${alerta.titulo} — de onde vem o número`}
                explicacao={`${alerta.impactoNota ? `${alerta.impactoNota[0].toUpperCase()}${alerta.impactoNota.slice(1)}. ` : ''}${alerta.fonte}. Base do impacto: ${
                  alerta.impactoBase === 'mes'
                    ? 'mensal'
                    : alerta.impactoBase === 'trimestre'
                      ? 'trimestral'
                      : 'evento único'
                }.`}
                linhas={dados.map((d) => ({ rotulo: d.rotulo, valor: d.valor }))}
              />
            )}
          </div>
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
            Por quê — dados e fatores
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

      {/* Ação: o CTA leva para a tela onde a decisão acontece; a ficha abre o
          objeto do domínio (navio, moinho, lote) sem sair daqui. */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={aoAgir}
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
          {/* Resolvido não é beco sem saída: a aba lista os resolvidos e daqui
              se reabre, caso o fato volte (o navio atrasa de novo). */}
          {alerta.status === 'resolvido' ? (
            <button
              type="button"
              onClick={() => {
                reabrir(alerta.id)
                /* Reabrir CORRIGE a trilha: sem isto o VRO seguiria contando
                   como endereçado um alerta que voltou para a fila. */
                registrarTrilha('reaberto')
                emitirToast({
                  tom: 'aviso',
                  titulo: 'Alerta reaberto',
                  descricao: 'Volta à fila de decisão, ao banner da tela e à contagem do sino.',
                })
              }}
              className={btnSecundario}
            >
              <RotateCcw size={12} aria-hidden="true" /> Reabrir
            </button>
          ) : (
            <button
              type="button"
              onClick={aoResolver}
              className="inline-flex items-center gap-1.5 rounded-full border border-positive/40 px-3 py-1.5 text-11 font-semibold text-positive transition-colors hover:bg-positive/10"
            >
              <Check size={12} aria-hidden="true" /> Resolver
            </button>
          )}
          <button
            type="button"
            onClick={() => setMenu((m) => (m === 'adiar' ? null : 'adiar'))}
            aria-expanded={menu === 'adiar'}
            className={btnSecundario}
          >
            <Clock size={12} aria-hidden="true" /> Adiar
          </button>
          <button
            type="button"
            onClick={() => setMenu((m) => (m === 'atribuir' ? null : 'atribuir'))}
            aria-expanded={menu === 'atribuir'}
            className={btnSecundario}
          >
            <UserPlus size={12} aria-hidden="true" /> Atribuir
          </button>
          {alerta.status !== 'reconhecido' && (
            <button type="button" onClick={aoReconhecer} className={btnSecundario}>
              Reconhecer
            </button>
          )}
        </div>

        {menu === 'adiar' && (
          <ul className="mt-2 space-y-1 rounded-card border border-edge/60 bg-navy/40 p-2">
            {PERIODOS_ADIAMENTO.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => aoAdiar(p)}
                  className="flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left text-11 text-ink-muted transition-colors hover:bg-white/5 hover:text-ink"
                >
                  {p.rotulo}
                  <span className="tnums font-mono text-11 text-ink-faint">
                    {formatDataPt(new Date(Date.parse(alerta.timestamp) + p.horas * MS_POR_HORA).toISOString())}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {menu === 'atribuir' && (
          <ul className="mt-2 space-y-1 rounded-card border border-edge/60 bg-navy/40 p-2">
            {AREAS.map((area) => {
              const sugerida = area === AREA_SUGERIDA[alerta.categoria]
              return (
                <li key={area}>
                  <button
                    type="button"
                    onClick={() => aoAtribuir(area)}
                    className="flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left text-11 text-ink-muted transition-colors hover:bg-white/5 hover:text-ink"
                  >
                    {area}
                    {/* A sugestão sai da categoria do alerta: câmbio é da
                        Tesouraria, moagem é da Indústria. Um alerta novo já
                        nasce com dono provável, sem ninguém preencher campo. */}
                    {sugerida && <span className="shrink-0 text-11 text-gold">sugerida</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}

export function AlertDetailLayer() {
  const id = useDetalheId()
  const lista = useListaAlertas()
  const alerta = id ? lista.find((a) => a.id === id) : undefined
  const painel = useRef<HTMLElement>(null)

  /** Esc fecha; Tab circula DENTRO do painel; nada vaza para os atalhos globais. */
  useEffect(() => {
    if (!alerta) return
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') return
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        fecharDetalheAlerta()
        return
      }
      e.stopPropagation()
      if (e.key !== 'Tab' || !painel.current) return
      const focaveis = painel.current.querySelectorAll<HTMLElement>(
        'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focaveis.length === 0) return
      const primeiro = focaveis[0]
      const ultimo = focaveis[focaveis.length - 1]
      const ativo = document.activeElement
      if (e.shiftKey && (ativo === primeiro || !painel.current.contains(ativo))) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && ativo === ultimo) {
        e.preventDefault()
        primeiro.focus()
      }
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
            ref={painel}
            className="fixed inset-y-0 right-0 z-[68] w-[400px] max-w-full overflow-y-auto border-l border-edge bg-card p-5 shadow-raised"
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: 420 }}
            transition={{ type: 'tween', duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label={`Detalhe do alerta: ${alerta.titulo}`}
          >
            <Conteudo key={alerta.id} alerta={alerta} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
