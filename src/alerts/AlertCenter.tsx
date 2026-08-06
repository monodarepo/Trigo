/**
 * CENTRAL DE ALERTAS — o painel lateral que torna a fila alcançável de
 * QUALQUER tela, sem sair dela.
 *
 * Por que um slide-over e não a aba: quem está no meio de um blend, de um
 * hedge ou de um Make/Buy/Sell não pode perder o contexto para ver por que o
 * sino subiu. A aba `/alertas` continua sendo o mission control — lista
 * completa, filtros, resolvidos —, e o botão "Ver todos" leva até lá. O painel
 * responde outra pergunta: "o que exige decisão AGORA e quanto vale?".
 *
 * Tudo que ele mostra vem do STORE ÚNICO (`alertStore` + `selectors`): o
 * mesmo navio, o mesmo impacto e o mesmo status que a aba, o cockpit e o
 * banner contextual leem. Nenhuma lista própria.
 */
import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, ChevronRight, Inbox, X } from 'lucide-react'
import { EmptyState } from '../components/ui/EmptyState'
import { formatBRL } from '../data/format'
import type { Alerta } from '../data/types'
import { useLive } from '../live/liveStore'
import { marcarVisto, useListaAlertas } from './alertStore'
import { fecharCentral, useCentralAberta } from './centralStore'
import { abrirDetalheAlerta } from './AlertDetail'
import { ativos, filaExigeDecisao, impactoTotal } from './selectors'
import { SEVERIDADE_UI, SEVERIDADES } from './severidade'
import { tempoRelativo } from './tempo'

/** Quanto o realce "novo" fica de pé depois de o painel abrir. */
const MS_ATE_MARCAR_VISTO = 2600

/** R$ 1,2M / R$ 180 mil — magnitude legível num item de lista. */
const impactoCurto = (valor: number) => formatBRL(valor, { compacto: true })

function ItemAlerta({
  alerta,
  segundos,
  aoAgir,
  aoAbrirDetalhe,
}: {
  alerta: Alerta
  segundos: number
  aoAgir: (alerta: Alerta) => void
  aoAbrirDetalhe: (alerta: Alerta) => void
}) {
  const ui = SEVERIDADE_UI[alerta.severidade]
  const Icone = ui.icone
  const novo = alerta.status === 'novo'
  /**
   * Dois graus de "novo", e a diferença importa: no primeiro acesso do dia
   * TODOS os alertas estão sem ver, e marcar os 18 com selo dourado transforma
   * o realce em papel de parede. O fio lateral basta para dizer "ainda não
   * olhei". O selo e o fundo ficam para o que chegou ENQUANTO a pessoa estava
   * em outra tela — esse sim é um fato novo.
   */
  const chegouAgora = novo && alerta.recebidoEmS != null

  return (
    <li
      className={`border-b border-edge/40 border-l-2 last:border-b-0 ${chegouAgora ? ui.fundo : ''} ${
        novo ? ui.fio : 'border-l-transparent'
      }`}
    >
      <div className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]">
        <Icone size={15} className={`mt-0.5 shrink-0 ${ui.texto}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className={`eyebrow ${ui.texto}`}>{ui.rotulo}</span>
            {chegouAgora && (
              <span className="rounded-full bg-gold/20 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-gold-light">
                novo
              </span>
            )}
            {alerta.atribuidoA && <span className="truncate text-11 text-ink-faint">→ {alerta.atribuidoA}</span>}
            <span className="tnums ml-auto shrink-0 font-mono text-11 text-ink-faint">
              {tempoRelativo(alerta, segundos)}
            </span>
          </div>
          {/* O título abre o DETALHE (tratar sem sair da tela); o CTA executa a
              ação. Um botão só para as duas coisas faria o rótulo "Ver janela
              de descarga" entregar um painel de detalhe. */}
          <button
            type="button"
            onClick={() => aoAbrirDetalhe(alerta)}
            className="mt-1 block w-full text-left text-13 font-medium leading-snug text-ink transition-colors hover:text-gold-light"
          >
            {alerta.titulo}
          </button>
          <div className="mt-1 flex items-center gap-2">
            {alerta.impactoRs != null && (
              <span
                className={`tnums font-mono text-12 font-semibold ${
                  alerta.tipo === 'oportunidade' ? 'text-positive' : 'text-danger'
                }`}
                title={alerta.impactoNota}
              >
                {alerta.tipo === 'oportunidade' ? '+' : '−'}
                {impactoCurto(alerta.impactoRs)}
              </span>
            )}
            <button
              type="button"
              onClick={() => aoAgir(alerta)}
              className="ml-auto flex items-center gap-0.5 text-11 font-semibold text-gold transition-colors hover:text-gold-light"
            >
              {alerta.acaoLabel} <ChevronRight size={11} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </li>
  )
}

function Painel() {
  const navigate = useNavigate()
  const lista = useListaAlertas()
  const segundos = useLive((s) => s.segundos)
  const fila = filaExigeDecisao(lista)
  const impacto = impactoTotal(lista)
  /**
   * Os chips decompõem a FILA, não a lista de ativos. Contar ativos aqui daria
   * chips somando 21 embaixo de um título de 18 — o leitor atento vê a
   * contradição e para de confiar nos dois números. O total de ativos aparece
   * no rodapé, junto do link que leva a eles.
   */
  const porSeveridadeNaFila = fila.reduce(
    (acc, a) => ({ ...acc, [a.severidade]: (acc[a.severidade] ?? 0) + 1 }),
    {} as Partial<Record<Alerta['severidade'], number>>,
  )
  const ativosTotal = ativos(lista).length
  const painel = useRef<HTMLDivElement>(null)
  const fechar = useRef<HTMLButtonElement>(null)

  /**
   * O realce "novo" precisa ser VISTO antes de sumir. Marcar no instante da
   * abertura apagaria o destaque no mesmo frame em que ele apareceu — o
   * usuário veria a lista já lida e nunca saberia o que chegou enquanto
   * estava em outra tela.
   */
  const novosAoAbrir = useRef<string[] | null>(null)
  if (novosAoAbrir.current === null) {
    novosAoAbrir.current = lista.filter((a) => a.status === 'novo').map((a) => a.id)
  }
  useEffect(() => {
    const ids = novosAoAbrir.current ?? []
    if (ids.length === 0) return
    const t = setTimeout(() => ids.forEach(marcarVisto), MS_ATE_MARCAR_VISTO)
    return () => clearTimeout(t)
  }, [])

  /**
   * Teclado do painel: Esc e "n" fecham; Tab circula DENTRO (foco preso); o
   * resto NÃO vaza para os atalhos globais.
   *
   * O `stopPropagation` é o detalhe que faz o "n" funcionar como alternador.
   * Este listener está em `document` e o de atalhos globais em `window`; entre
   * um e outro o navegador roda um checkpoint de microtasks, e o React já
   * aplicou o fechamento — o handler global veria a Central fechada e a
   * reabriria no mesmo pressionar de tecla. Barrando a propagação aqui, a
   * Central é dona das próprias teclas enquanto estiver aberta. ⌘K passa de
   * propósito: a paleta é a saída universal.
   */
  useEffect(() => {
    fechar.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') return
      if (e.key === 'Escape' || (e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey)) {
        e.preventDefault()
        e.stopPropagation()
        fecharCentral()
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
  }, [])

  const irPara = useCallback(
    (rota: string) => {
      fecharCentral()
      navigate(rota)
    },
    [navigate],
  )

  const aoAgir = useCallback(
    (alerta: Alerta) => {
      marcarVisto(alerta.id)
      irPara(alerta.acaoRota)
    },
    [irPara],
  )

  /** O detalhe fecha a Central por dentro (`abrirDetalheAlerta`). */
  const aoAbrirDetalhe = useCallback((alerta: Alerta) => abrirDetalheAlerta(alerta.id), [])

  return (
    <motion.div
      ref={painel}
      className="fixed inset-y-0 right-0 z-[65] flex w-[400px] max-w-full flex-col border-l border-edge bg-card shadow-raised"
      initial={{ x: 420 }}
      animate={{ x: 0 }}
      exit={{ x: 420 }}
      transition={{ type: 'tween', duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
      role="dialog"
      aria-modal="true"
      aria-label="Central de Alertas"
    >
      {/* Topo: quantos, de que gravidade e quanto está em jogo */}
      <div className="shrink-0 border-b border-edge/60 px-5 pb-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Central de Alertas</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="tnums font-display text-28 font-semibold leading-none text-ink">{fila.length}</span>
              <span className="text-13 text-ink-subtle">
                exige{fila.length === 1 ? '' : 'm'} decisão
              </span>
            </p>
          </div>
          <button
            ref={fechar}
            type="button"
            onClick={fecharCentral}
            aria-label="Fechar Central de Alertas"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-subtle transition-colors hover:bg-white/5 hover:text-ink"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Contagem por severidade — a mesma sintaxe de cor do sino */}
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {SEVERIDADES.filter((s) => (porSeveridadeNaFila[s] ?? 0) > 0).map((s) => {
            const ui = SEVERIDADE_UI[s]
            return (
              <li
                key={s}
                className="flex items-center gap-1.5 rounded-full border border-edge bg-surface-1/60 px-2.5 py-1"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${ui.ponto}`} aria-hidden="true" />
                <span className="text-11 text-ink-muted">{ui.rotulo}</span>
                <span className={`tnums font-mono text-11 font-semibold ${ui.texto}`}>{porSeveridadeNaFila[s]}</span>
              </li>
            )
          })}
        </ul>

        {/* Impacto total: risco e oportunidade separados — R$ 1 a evitar e R$ 1
            a capturar exigem times e prazos diferentes; o líquido esconderia isso. */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-card border border-edge/60 bg-surface-1/60 px-3 py-2">
            <p className="text-11 text-ink-faint">Risco a evitar / mês</p>
            <p className="tnums mt-0.5 font-mono text-14 font-semibold text-danger">
              {impactoCurto(impacto.riscoRs)}
            </p>
          </div>
          <div className="rounded-card border border-edge/60 bg-surface-1/60 px-3 py-2">
            <p className="text-11 text-ink-faint">Oportunidade / mês</p>
            <p className="tnums mt-0.5 font-mono text-14 font-semibold text-positive">
              {impactoCurto(impacto.oportunidadeRs)}
            </p>
          </div>
        </div>
        {impacto.foraDaBaseMensal.length > 0 && (
          <p className="mt-2 text-11 leading-snug text-ink-faint">
            + {impacto.foraDaBaseMensal.length} alerta{impacto.foraDaBaseMensal.length === 1 ? '' : 's'} de base
            trimestral ou por evento, fora deste total.
          </p>
        )}
      </div>

      {/* Fila */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {fila.length === 0 ? (
          <EmptyState
            compact
            icon={Inbox}
            tone="positive"
            title="Fila limpa"
            description="Nada exige decisão agora. O histórico e os informativos seguem na tela de Alertas."
            className="m-4"
          />
        ) : (
          <ul>
            {fila.map((alerta) => (
              <ItemAlerta
                key={alerta.id}
                alerta={alerta}
                segundos={segundos}
                aoAgir={aoAgir}
                aoAbrirDetalhe={aoAbrirDetalhe}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Ponte para o mission control */}
      <button
        type="button"
        onClick={() => irPara('/alertas')}
        className="flex shrink-0 items-center justify-center gap-1.5 border-t border-edge/60 px-5 py-3 text-xs font-semibold text-gold transition-colors hover:bg-white/[0.03] hover:text-gold-light"
      >
        Ver todos os alertas
        <span className="tnums font-mono text-11 text-ink-faint">· {ativosTotal} ativos</span>
        <ArrowUpRight size={13} aria-hidden="true" />
      </button>
    </motion.div>
  )
}

/**
 * Camada global (montada no AppShell). O conteúdo só monta quando abre — assim
 * o `useLive` de segundo a segundo não roda a sessão inteira por causa de um
 * painel fechado.
 */
export function AlertCenter() {
  const aberta = useCentralAberta()
  return (
    <AnimatePresence>
      {aberta && (
        <>
          <motion.div
            className="fixed inset-0 z-[62] bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={fecharCentral}
            aria-hidden="true"
          />
          <Painel />
        </>
      )}
    </AnimatePresence>
  )
}
