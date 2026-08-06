import { memo, useCallback, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, Layers, Search, UserPlus, X } from 'lucide-react'
import { Badge, Card, EmptyState, KpiTile, SectionTitle } from '../components/ui'
import { AnimatedNumber } from '../components/live/AnimatedNumber'
import { emitirToast } from '../components/feedback/toastBus'
import { getLiveState } from '../live/liveStore'
import { atribuir, reconhecer, resolver, useListaAlertas } from '../alerts/alertStore'
import {
  ativos,
  ativosOrdenados,
  contagemNaoVistos,
  filaExigeDecisao,
  impactoTotal,
  porSeveridade,
  porUrgencia,
} from '../alerts/selectors'
import { SEVERIDADE_UI, SEVERIDADES } from '../alerts/severidade'
import { CATEGORIAS, categoriaDe, impactoFormatado } from '../alerts/detalhes'
import { abrirDetalheAlerta } from '../alerts/AlertDetail'
import { AREAS, AREA_SUGERIDA } from '../alerts/acoes'
import { registrar } from '../alerts/registroVro'
import { horaDoCenario } from '../alerts/tempo'
import { TempoRelativo } from '../alerts/TempoRelativo'
import { agruparEmClusters, impactoDoCluster, type ClusterAlertas } from '../alerts/clusters'
import { DEMO_AGORA } from '../data/appContext'
import { formatBRL, formatDataPt, getAgente, getMoinho, type Alerta } from '../data'

type Categoria = Alerta['categoria']
type Severidade = Alerta['severidade']
type Agrupamento = 'prioridade' | 'categoria' | 'entidade'

/**
 * ABA DE ALERTAS — o mission control.
 *
 * As outras superfícies são recortes: o sino conta, a Central mostra a fila do
 * momento, o banner mostra o alerta DAQUELA tela. Aqui está o conjunto inteiro
 * — com o que já foi resolvido, com busca, com agrupamento e com ação em massa.
 * Nada disso é lista própria: tudo sai do store por `selectors.ts`, e uma ação
 * daqui reflete no sino, na Central, nos banners e na faixa crítica no mesmo
 * frame.
 */

/** Escalonamento com teto: 20 linhas a 60ms cada seriam 1,2s de espera. */
const atrasoEntrada = (i: number) => Math.min(i * 0.028, 0.36)

function FiltroChips<T extends string>({
  rotulo,
  opcoes,
  valor,
  onChange,
}: {
  rotulo: string
  opcoes: ReadonlyArray<{ id: T; rotulo: string; contagem?: number }>
  valor: T
  onChange: (v: T) => void
}) {
  return (
    <div role="group" aria-label={rotulo} className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">{rotulo}</span>
      {opcoes.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={o.id === valor}
          onClick={() => onChange(o.id)}
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
            o.id === valor
              ? 'border-gold/50 bg-gold/15 text-gold-light'
              : 'border-edge bg-card-2 text-ink-muted hover:border-gold/40 hover:text-ink'
          }`}
        >
          {o.rotulo}
          {o.contagem != null && <span className="tnums ml-1 font-mono text-ink-subtle">{o.contagem}</span>}
        </button>
      ))}
    </div>
  )
}

/**
 * HEAT STRIP DE DISPARO — quando cada categoria acendeu, hora a hora.
 *
 * É o que dá a sensação de vigilância contínua: o alerta de safra nasceu ontem
 * às 18h, o do navio às 5h40, o de fila do porto agora há pouco. Uma lista
 * ordenada por severidade não conta essa história — ela achata 14 horas de
 * monitoramento numa pilha sem tempo.
 *
 * A faixa cresce durante a demo: a chegada ao vivo entra no balde da hora
 * corrente, porque lê a mesma lista do store.
 */
function HeatStrip({
  lista,
  categoriaAtiva,
  onCategoria,
}: {
  lista: readonly Alerta[]
  categoriaAtiva: 'todas' | Categoria
  onCategoria: (c: Categoria) => void
}) {
  const { horas, porCategoria, maximo } = useMemo(() => {
    const hora = (iso: string) => new Date(Date.parse(iso)).setMinutes(0, 0, 0)
    const fim = Math.max(hora(DEMO_AGORA), ...lista.map((a) => hora(a.timestamp)))
    const inicio = Math.min(...lista.map((a) => hora(a.timestamp)))
    const horas: number[] = []
    for (let t = inicio; t <= fim; t += 3_600_000) horas.push(t)

    const porCategoria = new Map<Categoria, number[]>()
    let maximo = 1
    for (const a of lista) {
      const linha = porCategoria.get(a.categoria) ?? horas.map(() => 0)
      const i = horas.indexOf(hora(a.timestamp))
      if (i >= 0) {
        linha[i]++
        maximo = Math.max(maximo, linha[i])
      }
      porCategoria.set(a.categoria, linha)
    }
    return { horas, porCategoria, maximo }
  }, [lista])

  if (horas.length === 0) return null
  const rotuloHora = (t: number) => String(new Date(t).getHours()).padStart(2, '0')

  return (
    <Card padding="sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-sm font-semibold text-ink">Quando cada frente acendeu</h3>
        <p className="tnums text-11 text-ink-subtle">
          {horas.length}h de vigilância · {rotuloHora(horas[0])}h de ontem até {rotuloHora(horas[horas.length - 1])}h de
          hoje
        </p>
      </div>

      <div className="mt-3 space-y-1">
        {[...porCategoria.entries()]
          .sort((a, b) => b[1].reduce((s, n) => s + n, 0) - a[1].reduce((s, n) => s + n, 0))
          .map(([id, linha]) => {
            const cat = categoriaDe(id)
            const total = linha.reduce((s, n) => s + n, 0)
            return (
              <button
                key={id}
                type="button"
                onClick={() => onCategoria(id)}
                aria-pressed={categoriaAtiva === id}
                title={`Filtrar por ${cat.rotulo} (${total} alerta${total === 1 ? '' : 's'})`}
                className={`flex w-full items-center gap-2 rounded px-1 py-0.5 transition-colors hover:bg-white/[0.03] ${
                  categoriaAtiva === id ? 'bg-white/[0.05]' : ''
                }`}
              >
                <span className="w-20 shrink-0 truncate text-left text-11 text-ink-subtle">{cat.rotulo}</span>
                <span className="flex flex-1 gap-px">
                  {linha.map((n, i) => (
                    <span
                      key={i}
                      className="h-3 flex-1 rounded-[2px]"
                      style={
                        n === 0
                          ? { backgroundColor: 'rgba(255,255,255,.04)' }
                          : { backgroundColor: cat.cor, opacity: 0.35 + 0.65 * (n / maximo) }
                      }
                      title={`${rotuloHora(horas[i])}h · ${n} alerta${n === 1 ? '' : 's'}`}
                    />
                  ))}
                </span>
                <span className="tnums w-5 shrink-0 text-right font-mono text-11 text-ink-subtle">{total}</span>
              </button>
            )
          })}
      </div>

      <div className="mt-1.5 flex items-center gap-2 pl-[5.5rem] pr-7">
        <span className="flex flex-1 justify-between text-[10px] text-ink-subtle">
          {horas.map((t, i) => (
            <span key={t} className="tnums">
              {i % 3 === 0 ? `${rotuloHora(t)}h` : ''}
            </span>
          ))}
        </span>
      </div>
    </Card>
  )
}

const LinhaAlerta = memo(function LinhaAlerta({
  alerta,
  indice,
  selecionado,
  onSelecionar,
  recuado = false,
}: {
  alerta: Alerta
  indice: number
  selecionado: boolean
  onSelecionar: (id: string, marcado: boolean) => void
  /** Sinal de dentro de um cluster: recuado, porque é consequência. */
  recuado?: boolean
}) {
  const cat = categoriaDe(alerta.categoria)
  const ui = SEVERIDADE_UI[alerta.severidade]
  const agente = alerta.agenteId ? getAgente(alerta.agenteId) : undefined
  const impacto = impactoFormatado(alerta)

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: { delay: atrasoEntrada(indice), duration: 0.2 } }}
      exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
      transition={{ type: 'tween', duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
      className={`flex items-center gap-3 rounded-card border border-l-2 bg-card p-3 transition-colors hover:border-gold/40 ${
        selecionado ? 'border-gold/50 bg-gold/[0.06]' : 'border-edge/60'
      } ${ui.fio} ${recuado ? 'ml-6' : ''}`}
    >
      <input
        type="checkbox"
        checked={selecionado}
        onChange={(e) => onSelecionar(alerta.id, e.target.checked)}
        aria-label={`Selecionar: ${alerta.titulo}`}
        className="h-4 w-4 shrink-0 accent-gold"
      />
      <button
        type="button"
        onClick={() => abrirDetalheAlerta(alerta.id)}
        className="flex min-w-0 flex-1 items-start gap-3 text-left"
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: cat.cor }}
          aria-label={`Categoria: ${cat.rotulo}`}
        >
          <cat.icone size={16} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <Badge kind="status" label={ui.rotulo} tone={ui.tone} />
            <span className="text-[11px] text-ink-subtle">{cat.rotulo}</span>
            <TempoRelativo alerta={alerta} />
            {agente && <span className="text-[11px] text-ink-subtle">· {agente.nome}</span>}
            {/* Estado do ciclo de vida: quem pegou, até quando esperou. */}
            {alerta.atribuidoA && <Badge kind="status" label={`→ ${alerta.atribuidoA}`} tone="info" />}
            {alerta.status === 'adiado' && (
              <Badge
                kind="status"
                label={alerta.adiadoAte ? `Adiado até ${formatDataPt(alerta.adiadoAte)}` : 'Adiado'}
                tone="neutral"
              />
            )}
            {alerta.status === 'reconhecido' && <Badge kind="status" label="Reconhecido" tone="neutral" />}
            {alerta.status === 'resolvido' && <Badge kind="status" label="Resolvido" tone="positive" />}
          </span>
          <span className="mt-1 block truncate text-sm font-medium text-ink">{alerta.titulo}</span>
          <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-ink-subtle">{alerta.descricao}</span>
        </span>
      </button>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {impacto && (
          <span
            className={`tnums font-mono text-sm font-semibold ${impacto.positivo ? 'text-positive' : 'text-danger'}`}
            title={alerta.impactoNota}
          >
            {impacto.texto}
          </span>
        )}
        {/* O CTA faz o que o rótulo promete — abre o detalhe, de onde se
            navega ou se trata. Um <Link> direto pularia o "por quê". */}
        <button
          type="button"
          onClick={() => abrirDetalheAlerta(alerta.id)}
          className="flex items-center gap-1 rounded-full border border-edge px-3 py-1.5 text-[11px] font-semibold text-gold transition-colors hover:border-gold/40"
        >
          {alerta.acaoLabel}
          <ChevronRight size={12} aria-hidden="true" />
        </button>
      </div>
    </motion.li>
  )
})

/**
 * Cluster na aba: o sinal principal e, atrás de um botão, os do mesmo fato.
 * Fechado por padrão — a fila é para varrer, não para explorar. A contagem e o
 * total do grupo ficam visíveis para que ninguém precise abrir só para saber
 * que há mais.
 */
function GrupoCluster({
  cluster,
  indice,
  selecao,
  onSelecionar,
}: {
  cluster: ClusterAlertas
  indice: number
  selecao: readonly string[]
  onSelecionar: (id: string, marcado: boolean) => void
}) {
  const [aberto, setAberto] = useState(false)
  const soma = impactoDoCluster(cluster)
  return (
    <motion.li layout="position" className="list-none space-y-2">
      <ul className="space-y-2">
        <LinhaAlerta
          alerta={cluster.principal}
          indice={indice}
          selecionado={selecao.includes(cluster.principal.id)}
          onSelecionar={onSelecionar}
        />
        <AnimatePresence initial={false}>
          {aberto &&
            cluster.relacionados.map((a, i) => (
              <LinhaAlerta
                key={a.id}
                alerta={a}
                indice={i}
                selecionado={selecao.includes(a.id)}
                onSelecionar={onSelecionar}
                recuado
              />
            ))}
        </AnimatePresence>
      </ul>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="ml-6 flex items-center gap-1.5 text-[11px] font-semibold text-ink-subtle transition-colors hover:text-gold"
      >
        <Layers size={11} aria-hidden="true" />
        {aberto ? 'Ocultar' : `+${cluster.relacionados.length}`} {cluster.rotulo}
        {soma && (
          <span className="tnums font-mono text-ink-subtle">
            · {cluster.principal.tipo === 'oportunidade' ? '+' : '−'}
            {formatBRL(soma.rs, { compacto: true })} no grupo
          </span>
        )}
      </button>
    </motion.li>
  )
}

/** Barra de ação em massa — só existe com algo selecionado. */
function BarraSelecao({
  selecionados,
  aoLimpar,
}: {
  selecionados: readonly Alerta[]
  aoLimpar: () => void
}) {
  const [menuArea, setMenuArea] = useState(false)
  const n = selecionados.length

  /** Uma linha por alerta na trilha do VRO, como no drawer. */
  const registrarLote = (acao: 'resolvido' | 'reconhecido' | 'atribuido', area?: string) => {
    for (const a of selecionados) {
      registrar({
        alertaId: a.id,
        titulo: a.titulo,
        acao,
        impactoRs: a.impactoRs,
        tipo: a.tipo,
        impactoBase: a.impactoBase,
        categoria: a.categoria,
        area,
        nota: area,
        // Leitura pontual: a barra não precisa re-renderizar a cada segundo.
        horaRotulo: horaDoCenario(getLiveState().segundos),
        emSegundos: getLiveState().segundos,
      })
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.16 }}
      className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-card border border-gold/40 bg-card-2 px-3 py-2 shadow-raised"
    >
      <span className="tnums text-12 font-semibold text-ink">
        {n} selecionado{n === 1 ? '' : 's'}
      </span>
      <span className="text-11 text-ink-subtle">
        {formatBRL(
          selecionados.reduce((s, a) => s + (a.impactoBase === 'mes' ? (a.impactoRs ?? 0) : 0), 0),
          { compacto: true },
        )}
        /mês em jogo
      </span>

      <span className="ml-auto flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            selecionados.forEach((a) => resolver(a.id))
            registrarLote('resolvido')
            aoLimpar()
            emitirToast({
              tom: 'sucesso',
              titulo: `${n} alerta${n === 1 ? '' : 's'} resolvido${n === 1 ? '' : 's'}`,
              descricao: 'Saem do sino, da Central e dos banners. Ficam listados no chip “Resolvidos”.',
            })
          }}
          className="rounded-full border border-positive/40 px-3 py-1.5 text-11 font-semibold text-positive transition-colors hover:bg-positive/10"
        >
          Resolver
        </button>
        <button
          type="button"
          onClick={() => {
            selecionados.forEach((a) => reconhecer(a.id))
            registrarLote('reconhecido')
            aoLimpar()
            emitirToast({
              tom: 'info',
              titulo: `${n} alerta${n === 1 ? '' : 's'} reconhecido${n === 1 ? '' : 's'}`,
              descricao: 'Saem da fila de decisão; o risco continua nas telas.',
            })
          }}
          className="rounded-full border border-edge px-3 py-1.5 text-11 font-semibold text-ink-muted transition-colors hover:border-gold/40 hover:text-ink"
        >
          Reconhecer
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuArea((v) => !v)}
            aria-expanded={menuArea}
            className="flex items-center gap-1.5 rounded-full border border-edge px-3 py-1.5 text-11 font-semibold text-ink-muted transition-colors hover:border-gold/40 hover:text-ink"
          >
            <UserPlus size={12} aria-hidden="true" /> Atribuir
          </button>
          {menuArea && (
            <ul className="absolute right-0 top-full z-30 mt-1 w-56 space-y-0.5 rounded-card border border-edge bg-card p-1.5 shadow-raised">
              {AREAS.map((area) => (
                <li key={area}>
                  <button
                    type="button"
                    onClick={() => {
                      selecionados.forEach((a) => atribuir(a.id, area))
                      registrarLote('atribuido', area)
                      setMenuArea(false)
                      aoLimpar()
                      emitirToast({ tom: 'sucesso', titulo: `${n} alerta${n === 1 ? '' : 's'} para ${area}` })
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-11 text-ink-muted transition-colors hover:bg-white/5 hover:text-ink"
                  >
                    {area}
                    {/* Sugestão só quando o lote é homogêneo: com categorias
                        misturadas não existe uma área certa para todos. */}
                    {selecionados.every((a) => AREA_SUGERIDA[a.categoria] === area) && (
                      <span className="shrink-0 text-11 text-gold">sugerida</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={aoLimpar}
          aria-label="Limpar seleção"
          className="rounded-full p-1 text-ink-subtle transition-colors hover:text-ink"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </span>
    </motion.div>
  )
}

export default function Alerts() {
  const [categoria, setCategoria] = useState<'todas' | Categoria>('todas')
  const [severidade, setSeveridade] = useState<'todas' | Severidade>('todas')
  const [agrupamento, setAgrupamento] = useState<Agrupamento>('prioridade')
  const [busca, setBusca] = useState('')
  const [selecao, setSelecao] = useState<readonly string[]>([])
  /**
   * A aba é o mission control: é a ÚNICA superfície onde o resolvido continua
   * existindo. Sem esta chave, resolver faria o alerta desaparecer do produto
   * inteiro — e a Central prometeria, no seu estado vazio, um histórico que
   * não existia em lugar nenhum.
   */
  const [mostrarResolvidos, setMostrarResolvidos] = useState(false)

  // TUDO vem do store: a tela não guarda lista própria nem recalcula contagem.
  const lista = useListaAlertas()
  const resolvidos = useMemo(() => lista.filter((a) => a.status === 'resolvido'), [lista])
  const severidades = porSeveridade(lista)
  const impacto = impactoTotal(lista)
  const fila = filaExigeDecisao(lista)
  const naoVistos = contagemNaoVistos(lista)

  /**
   * A ordem é a MESMA função de urgência que a Central, o banner e o chip
   * usam (`porUrgencia`: exige-decisão → severidade → impacto → recência). A
   * aba não ordena por conta própria: se priorizasse diferente, o "primeiro da
   * fila" seria outro em cada tela.
   */
  const base = mostrarResolvidos ? resolvidos : ativos(lista)
  const ordenados = useMemo(
    () => (mostrarResolvidos ? [...resolvidos].sort(porUrgencia) : ativosOrdenados(lista)),
    [lista, resolvidos, mostrarResolvidos],
  )

  const termo = busca.trim().toLowerCase()
  const filtrados = useMemo(
    () =>
      ordenados.filter((a) => {
        if (categoria !== 'todas' && a.categoria !== categoria) return false
        if (severidade !== 'todas' && a.severidade !== severidade) return false
        if (!termo) return true
        const agente = a.agenteId ? getAgente(a.agenteId)?.nome ?? '' : ''
        return `${a.titulo} ${a.descricao} ${a.fonte} ${agente} ${a.atribuidoA ?? ''}`.toLowerCase().includes(termo)
      }),
    [ordenados, categoria, severidade, termo],
  )

  const contagemPorCategoria = useMemo(() => {
    const c = {} as Record<Categoria, number>
    for (const a of base) c[a.categoria] = (c[a.categoria] ?? 0) + 1
    return c
  }, [base])

  const limparFiltros = () => {
    setCategoria('todas')
    setSeveridade('todas')
    setBusca('')
  }
  const temFiltro = categoria !== 'todas' || severidade !== 'todas' || termo !== ''

  /** Rótulo da entidade — o objeto do domínio a que o alerta se prende. */
  const rotuloEntidade = (a: Alerta) => {
    if (!a.entidade) return 'Sem objeto vinculado'
    if (a.entidade.tipo === 'moinho') return `Moinho ${getMoinho(a.entidade.id as never)?.nome ?? a.entidade.id}`
    const nome = a.entidade.id.replace(/-/g, ' ')
    return `${a.entidade.tipo[0].toUpperCase()}${a.entidade.tipo.slice(1)} · ${nome}`
  }

  const nomeMoinho = useCallback((id: string) => getMoinho(id as never)?.nome ?? id, [])

  const secoes: Array<{ id: string; titulo: string; itens: Alerta[]; clusters: ClusterAlertas[] }> = useMemo(() => {
    /* Agrupar por OBJETO já é o próprio cluster: reagrupar ali criaria uma
       moldura dentro da moldura. Nas outras visões o cluster evita ler o mesmo
       fato três vezes. */
    const comCluster = (itens: Alerta[]) =>
      agrupamento === 'entidade'
        ? itens.map((a) => ({ chave: a.id, principal: a, relacionados: [], total: 1, rotulo: '' }))
        : agruparEmClusters(itens, nomeMoinho)

    if (agrupamento === 'categoria') {
      const mapa = new Map<Categoria, Alerta[]>()
      for (const a of filtrados) mapa.set(a.categoria, [...(mapa.get(a.categoria) ?? []), a])
      return [...mapa.entries()].map(([id, itens]) => ({
        id,
        titulo: `${categoriaDe(id).rotulo} (${itens.length})`,
        itens,
        clusters: comCluster(itens),
      }))
    }
    if (agrupamento === 'entidade') {
      const mapa = new Map<string, Alerta[]>()
      for (const a of filtrados) {
        const k = rotuloEntidade(a)
        mapa.set(k, [...(mapa.get(k) ?? []), a])
      }
      // "Sem objeto vinculado" por último: é o balde, não um agrupamento.
      return [...mapa.entries()]
        .sort((a, b) => Number(a[0].startsWith('Sem')) - Number(b[0].startsWith('Sem')))
        .map(([k, itens]) => ({ id: k, titulo: `${k} (${itens.length})`, itens, clusters: comCluster(itens) }))
    }
    /* PRIORIDADE: o split que a tela existe para mostrar — o que exige decisão
       humana hoje, separado do que é contexto. */
    const decisao = filtrados.filter((a) => a.exigeDecisao)
    const informativos = filtrados.filter((a) => !a.exigeDecisao)
    return [
      { id: 'decisao', titulo: `Exigem decisão (${decisao.length})`, itens: decisao, clusters: comCluster(decisao) },
      {
        id: 'informativo',
        titulo: `Informativos (${informativos.length})`,
        itens: informativos,
        clusters: comCluster(informativos),
      },
    ].filter((s) => s.itens.length > 0)
  }, [filtrados, agrupamento, nomeMoinho])

  /* A seleção vive contra a lista VISÍVEL: resolver em massa some com as
     linhas, e ids órfãos fariam a barra anunciar "3 selecionados" sobre
     alertas que já saíram da tela. */
  const idsVisiveis = useMemo(() => new Set(filtrados.map((a) => a.id)), [filtrados])
  const selecionados = useMemo(
    () => filtrados.filter((a) => selecao.includes(a.id)),
    [filtrados, selecao],
  )
  /* Identidade estável: com `onSelecionar` novo a cada render, o memo() das
     linhas nunca acertaria e mudar UM alerta re-renderizaria as vinte. */
  const alternarSelecao = useCallback(
    (id: string, marcado: boolean) => setSelecao((s) => (marcado ? [...s, id] : s.filter((x) => x !== id))),
    [],
  )
  const selecionarTudo = () =>
    setSelecao(selecionados.length === filtrados.length ? [] : filtrados.map((a) => a.id))

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Margem & Decisão"
        title="Alertas & Decisões"
        subtitle="Gestão por exceção: o que mudou desde ontem, quanto vale e quem decide hoje."
      />

      {/* 1 · Resumo: quantos exigem decisão, de que gravidade e quanto está em jogo */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {/* h-full em todos os tiles: sem isto, o card com dica fica mais alto
            que os vizinhos e a linha de resumo perde a régua. */}
        <div className="min-w-0">
          <KpiTile
            className="h-full"
            label="Exigem decisão"
            value={<AnimatedNumber valor={fila.length} formatar={(v) => String(Math.round(v))} />}
            hint={`de ${ativos(lista).length} ativos · ${naoVistos} não vistos`}
            delta={{ label: 'fila de hoje', direction: 'flat', tone: 'gold' }}
          />
        </div>
        {SEVERIDADES.filter((s) => s !== 'informativo').map((s) => {
          const ui = SEVERIDADE_UI[s]
          return (
            <button
              key={s}
              type="button"
              className="min-w-0 text-left"
              onClick={() => setSeveridade(severidade === s ? 'todas' : s)}
              aria-pressed={severidade === s}
            >
              <KpiTile
                className="h-full"
                label={`${ui.rotulo}s`}
                value={<AnimatedNumber valor={severidades[s]} formatar={(v) => String(Math.round(v))} />}
                delta={{
                  label:
                    s === 'critico' ? 'ação imediata' : s === 'alto' ? 'decidir hoje' : 'monitorar',
                  direction: s === 'medio' ? 'flat' : 'up',
                  tone: ui.tone,
                }}
              />
            </button>
          )
        })}
        {/* Risco e oportunidade separados: R$ 1 a evitar e R$ 1 a capturar
            exigem times, prazos e decisões diferentes — o líquido esconderia
            isso. Só entram os de base MENSAL. */}
        <div className="min-w-0">
          <KpiTile
            className="h-full"
            label="Em risco / mês"
            value={<AnimatedNumber valor={impacto.riscoRs} formatar={(v) => formatBRL(v, { compacto: true })} />}
            delta={{ label: 'a evitar', direction: 'down', tone: 'danger' }}
            hint="Só alertas de impacto mensal com ação pendente"
          />
        </div>
        <div className="min-w-0">
          <KpiTile
            className="h-full"
            label="Oportunidade / mês"
            value={<AnimatedNumber valor={impacto.oportunidadeRs} formatar={(v) => formatBRL(v, { compacto: true })} />}
            delta={{ label: 'a capturar', direction: 'up', tone: 'positive' }}
            hint={
              impacto.foraDaBaseMensal.length > 0
                ? `+ ${impacto.foraDaBaseMensal.length} de base trimestral ou por evento`
                : undefined
            }
          />
        </div>
      </div>

      {/* 2 · Quando cada frente acendeu */}
      <HeatStrip
        lista={base}
        categoriaAtiva={categoria}
        onCategoria={(c) => setCategoria(categoria === c ? 'todas' : c)}
      />

      {/* 3 · Filtros e busca */}
      <Card padding="sm">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative min-w-[16rem] flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
                aria-hidden="true"
              />
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por título, descrição, fonte, agente ou dono…"
                aria-label="Buscar alertas"
                className="w-full rounded-full border border-edge bg-card-2 py-1.5 pl-9 pr-3 text-xs text-ink placeholder:text-ink-subtle focus:border-gold/40 focus:outline-none"
              />
            </label>
            <FiltroChips
              rotulo="Agrupar"
              valor={agrupamento}
              onChange={setAgrupamento}
              opcoes={[
                { id: 'prioridade' as const, rotulo: 'Prioridade' },
                { id: 'categoria' as const, rotulo: 'Categoria' },
                { id: 'entidade' as const, rotulo: 'Objeto' },
              ]}
            />
            <button
              type="button"
              aria-pressed={mostrarResolvidos}
              onClick={() => {
                setMostrarResolvidos((v) => !v)
                setSelecao([])
              }}
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
                mostrarResolvidos
                  ? 'border-positive/50 bg-positive/15 text-positive'
                  : 'border-edge bg-card-2 text-ink-muted hover:border-gold/40 hover:text-ink'
              }`}
            >
              Resolvidos ({resolvidos.length})
            </button>
          </div>
          <FiltroChips
            rotulo="Categoria"
            valor={categoria}
            onChange={setCategoria}
            opcoes={[
              { id: 'todas' as const, rotulo: 'Todas' },
              ...CATEGORIAS.filter((c) => (contagemPorCategoria[c.id] ?? 0) > 0).map((c) => ({
                id: c.id,
                rotulo: c.rotulo,
                contagem: contagemPorCategoria[c.id],
              })),
            ]}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FiltroChips
              rotulo="Severidade"
              valor={severidade}
              onChange={setSeveridade}
              opcoes={[
                { id: 'todas' as const, rotulo: 'Todas' },
                ...SEVERIDADES.map((s) => ({ id: s, rotulo: SEVERIDADE_UI[s].rotulo, contagem: severidades[s] })),
              ]}
            />
            <div className="flex items-center gap-3">
              {filtrados.length > 0 && (
                <button
                  type="button"
                  onClick={selecionarTudo}
                  className="text-[11px] font-semibold text-ink-subtle transition-colors hover:text-gold"
                >
                  {selecionados.length === filtrados.length ? 'Limpar seleção' : `Selecionar os ${filtrados.length}`}
                </button>
              )}
              {temFiltro && (
                <button
                  type="button"
                  onClick={limparFiltros}
                  className="text-[11px] font-semibold text-gold transition-colors hover:text-gold-light"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* 4 · Ações em massa */}
      <AnimatePresence>
        {selecionados.length > 0 && (
          <BarraSelecao
            selecionados={selecionados}
            aoLimpar={() => setSelecao((s) => s.filter((id) => !idsVisiveis.has(id)))}
          />
        )}
      </AnimatePresence>

      {/* 5 · Fila priorizada, com o split que a tela existe para mostrar */}
      {filtrados.length === 0 ? (
        <EmptyState
          title={
            mostrarResolvidos
              ? 'Nenhum alerta resolvido ainda'
              : temFiltro
                ? 'Nenhum alerta com estes filtros'
                : 'Fila limpa'
          }
          description={
            mostrarResolvidos
              ? 'Resolva um alerta pelo drawer de detalhe — ele sai das superfícies ativas e passa a ser listado aqui.'
              : temFiltro
                ? `${termo ? `Nada encontrado para “${busca.trim()}”. ` : ''}Ajuste os filtros ou volte ao conjunto completo do dia.`
                : 'Nada exige decisão agora. Os alertas tratados seguem no chip “Resolvidos” e na trilha do VRO.'
          }
          tone={temFiltro || mostrarResolvidos ? 'neutral' : 'positive'}
          action={
            temFiltro ? (
              <button
                type="button"
                onClick={limparFiltros}
                className="rounded-full bg-gold px-4 py-2 text-xs font-semibold text-navy transition-colors hover:bg-gold-light"
              >
                Limpar filtros
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-5">
          {secoes.map((secao) => (
            <motion.div layout="position" key={secao.id}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                {secao.titulo}
              </p>
              <ul className="space-y-2">
                <AnimatePresence initial={false} mode="popLayout">
                  {secao.clusters.map((c, i) =>
                    c.total > 1 ? (
                      <GrupoCluster
                        key={c.chave}
                        cluster={c}
                        indice={i}
                        selecao={selecao}
                        onSelecionar={alternarSelecao}
                      />
                    ) : (
                      <LinhaAlerta
                        key={c.chave}
                        alerta={c.principal}
                        indice={i}
                        selecionado={selecao.includes(c.principal.id)}
                        onSelecionar={alternarSelecao}
                      />
                    ),
                  )}
                </AnimatePresence>
              </ul>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
