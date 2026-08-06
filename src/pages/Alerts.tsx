import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Badge, Card, EmptyState, KpiTile, SectionTitle } from '../components/ui'
import { useListaAlertas } from '../alerts/alertStore'
import {
  ORDEM_SEVERIDADE,
  ativos,
  contagemNaoVistos,
  filaExigeDecisao,
  impactoTotal,
  porSeveridade,
} from '../alerts/selectors'
import { SEVERIDADE_UI } from '../alerts/severidade'
import { CATEGORIAS, categoriaDe, impactoFormatado } from '../alerts/detalhes'
import { abrirDetalheAlerta } from '../alerts/AlertDetail'
import { formatBRL, formatDataHoraPt, getAgente, type Alerta } from '../data'

type Categoria = Alerta['categoria']
type Severidade = Alerta['severidade']


function FiltroChips<T extends string>({
  rotulo,
  opcoes,
  valor,
  onChange,
}: {
  rotulo: string
  opcoes: ReadonlyArray<{ id: T; rotulo: string }>
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
        </button>
      ))}
    </div>
  )
}

function LinhaAlerta({ alerta, onAbrir }: { alerta: Alerta; onAbrir: () => void }) {
  const cat = categoriaDe(alerta.categoria)
  const agente = alerta.agenteId ? getAgente(alerta.agenteId) : undefined
  const impacto = impactoFormatado(alerta)
  return (
    <li className="flex items-center gap-3 rounded-card border border-edge/60 bg-card p-3 transition-colors hover:border-gold/40">
      <button type="button" onClick={onAbrir} className="flex min-w-0 flex-1 items-start gap-3 text-left">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: cat.cor }}
          aria-label={`Categoria: ${cat.rotulo}`}
        >
          <cat.icone size={16} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <Badge
              kind="status"
              label={SEVERIDADE_UI[alerta.severidade].rotulo}
              tone={SEVERIDADE_UI[alerta.severidade].tone}
            />
            <span className="tnums text-[11px] text-ink-subtle">{formatDataHoraPt(alerta.timestamp)}</span>
            {agente && <span className="text-[11px] text-ink-faint">· {agente.nome}</span>}
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
        <Link
          to={alerta.acaoRota}
          className="flex items-center gap-1 rounded-full border border-edge px-3 py-1.5 text-[11px] font-semibold text-gold transition-colors hover:border-gold/40"
        >
          {alerta.acaoLabel}
          <ChevronRight size={12} aria-hidden="true" />
        </Link>
      </div>
    </li>
  )
}

export default function Alerts() {
  const [categoria, setCategoria] = useState<'todas' | Categoria>('todas')
  const [severidade, setSeveridade] = useState<'todas' | Severidade>('todas')
  const [grupo, setGrupo] = useState<'todos' | 'decisao' | 'informativo'>('todos')

  // TUDO vem do store: a tela não guarda lista própria nem recalcula contagem.
  const lista = useListaAlertas()
  const ordenados = useMemo(
    () =>
      [...ativos(lista)].sort(
        (a, b) =>
          ORDEM_SEVERIDADE[a.severidade] - ORDEM_SEVERIDADE[b.severidade] ||
          b.timestamp.localeCompare(a.timestamp),
      ),
    [lista],
  )
  const severidades = porSeveridade(lista)
  const impacto = impactoTotal(lista)
  const fila = filaExigeDecisao(lista)
  const naoVistos = contagemNaoVistos(lista)

  const filtrados = useMemo(
    () =>
      ordenados.filter(
        (a) =>
          (categoria === 'todas' || a.categoria === categoria) &&
          (severidade === 'todas' || a.severidade === severidade) &&
          (grupo === 'todos' || (grupo === 'decisao' ? a.exigeDecisao : !a.exigeDecisao)),
      ),
    [ordenados, categoria, severidade, grupo],
  )
  const decisao = filtrados.filter((a) => a.exigeDecisao)
  const informativos = filtrados.filter((a) => !a.exigeDecisao)
  const limparFiltros = () => {
    setCategoria('todas')
    setSeveridade('todas')
    setGrupo('todos')
  }

  const secoes: Array<{ titulo: string; itens: Alerta[] }> =
    grupo === 'todos'
      ? [
          { titulo: `Exigem decisão (${decisao.length})`, itens: decisao },
          { titulo: `Informativos (${informativos.length})`, itens: informativos },
        ].filter((s) => s.itens.length > 0)
      : [{ titulo: `${filtrados.length} alerta(s)`, itens: filtrados }]

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Margem & Decisão"
        title="Alertas & Decisões"
        subtitle="Gestão por exceção: o que mudou desde ontem e exige uma decisão hoje."
      />

      {/* 1 · Contadores (clicáveis = filtro de severidade) + o que está em jogo */}
      {/* 4 contadores + o card de impacto (col-span-2) = 6 unidades numa linha */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <button type="button" className="min-w-0 text-left" onClick={limparFiltros} aria-pressed={severidade === 'todas'}>
          <KpiTile
            label="Alertas ativos"
            value={String(ordenados.length)}
            hint={`${naoVistos} ainda não vistos · ${fila.length} na fila de decisão`}
          />
        </button>
        <button
          type="button"
          className="min-w-0 text-left"
          onClick={() => setSeveridade(severidade === 'critico' ? 'todas' : 'critico')}
          aria-pressed={severidade === 'critico'}
        >
          <KpiTile label="Críticos" value={String(severidades.critico)} delta={{ label: 'ação imediata', direction: 'up', tone: 'danger' }} />
        </button>
        <button
          type="button"
          className="min-w-0 text-left"
          onClick={() => setSeveridade(severidade === 'alto' ? 'todas' : 'alto')}
          aria-pressed={severidade === 'alto'}
        >
          <KpiTile label="Altos" value={String(severidades.alto)} delta={{ label: 'decidir hoje', direction: 'up', tone: 'warning' }} />
        </button>
        <button
          type="button"
          className="min-w-0 text-left"
          onClick={() => setSeveridade(severidade === 'medio' ? 'todas' : 'medio')}
          aria-pressed={severidade === 'medio'}
        >
          <KpiTile label="Médios" value={String(severidades.medio)} delta={{ label: 'monitorar', direction: 'flat', tone: 'info' }} />
        </button>
        {/* O número que o CFO lê primeiro: quanto vale agir sobre estes alertas.
            Só entram os de base MENSAL — misturar com o desvio trimestral de
            orçamento daria um total que não é nem mês nem trimestre. */}
        <div className="min-w-0 xl:col-span-2">
          <KpiTile
            label="Em jogo neste mês"
            value={formatBRL(impacto.emJogoRs, { compacto: true })}
            delta={{
              label: `${formatBRL(impacto.oportunidadeRs, { compacto: true })} a capturar · ${formatBRL(impacto.riscoRs, { compacto: true })} a evitar`,
              direction: 'flat',
              tone: 'gold',
            }}
            hint="Só alertas de impacto mensal com ação pendente"
          />
        </div>
      </div>

      {/* 3 · Filtros */}
      <Card padding="sm">
        <div className="flex flex-col gap-3">
          <FiltroChips
            rotulo="Categoria"
            valor={categoria}
            onChange={setCategoria}
            opcoes={[{ id: 'todas' as const, rotulo: 'Todas' }, ...CATEGORIAS.map((c) => ({ id: c.id, rotulo: c.rotulo }))]}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FiltroChips
              rotulo="Severidade"
              valor={severidade}
              onChange={setSeveridade}
              opcoes={[
                { id: 'todas' as const, rotulo: 'Todas' },
                { id: 'critico' as const, rotulo: 'Crítico' },
                { id: 'alto' as const, rotulo: 'Alto' },
                { id: 'medio' as const, rotulo: 'Médio' },
                { id: 'informativo' as const, rotulo: 'Info' },
              ]}
            />
            <FiltroChips
              rotulo="Agrupar"
              valor={grupo}
              onChange={setGrupo}
              opcoes={[
                { id: 'todos' as const, rotulo: 'Todos' },
                { id: 'decisao' as const, rotulo: 'Exige decisão' },
                { id: 'informativo' as const, rotulo: 'Informativo' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* 2 · Lista priorizada / 5 · vazio */}
      {filtrados.length === 0 ? (
        <EmptyState
          title="Nenhum alerta com estes filtros"
          description="Tudo tratado por aqui. Ajuste os filtros ou volte ao conjunto completo do dia."
          action={
            <button
              type="button"
              onClick={limparFiltros}
              className="rounded-full bg-gold px-4 py-2 text-xs font-semibold text-navy transition-colors hover:bg-gold-light"
            >
              Limpar filtros
            </button>
          }
        />
      ) : (
        <div className="space-y-5">
          {secoes.map((secao) => (
            <div key={secao.titulo}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">{secao.titulo}</p>
              <ul className="space-y-2">
                {secao.itens.map((alerta) => (
                  <LinhaAlerta key={alerta.id} alerta={alerta} onAbrir={() => abrirDetalheAlerta(alerta.id)} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
