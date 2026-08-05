/**
 * Página temporária de QA: renderiza todos os primitivos de src/components/ui
 * com dados de exemplo (src/data/showcase.ts). Não aparece na sidebar.
 * Acesse em /showcase. Remover quando as telas reais estiverem completas.
 */
import { useState } from 'react'
import { Anchor, Ship } from 'lucide-react'
import { ErrorBoundary, FronteiraVisual } from '../components/feedback/ErrorBoundary'
import { emitirToast } from '../components/feedback/toastBus'
import {
  Badge,
  Card,
  ConfidenceMeter,
  DataTable,
  EmptyState,
  KpiTile,
  Pill,
  RecommendationCard,
  SectionTitle,
  Sparkline,
  TrendArrow,
  type DataTableColumn,
} from '../components/ui'
import { SHOWCASE, type ShowcaseTlcRow } from '../data/showcase'

const tlcColumns: DataTableColumn<ShowcaseTlcRow>[] = [
  { key: 'origem', header: 'Origem', render: (row) => row.origem },
  { key: 'porto', header: 'Porto', render: (row) => row.porto },
  { key: 'volume', header: 'Volume', align: 'right', render: (row) => row.volume },
  { key: 'tlc', header: 'TLC (R$/t)', align: 'right', render: (row) => row.tlc },
  { key: 'risco', header: 'Risco', render: (row) => <Badge kind="risco" level={row.risco} /> },
]

export default function Showcase() {
  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="QA interno"
        title="Showcase de primitivos"
        subtitle="Todos os componentes de src/components/ui renderizados com dados de exemplo."
        actions={<Badge kind="status" label="Temporário" tone="info" />}
      />

      {/* KpiTile */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SHOWCASE.kpis.map((kpi) => (
          <KpiTile key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* RecommendationCard com Badges e ações */}
      <RecommendationCard
        {...SHOWCASE.recommendation}
        badges={
          <>
            <Badge kind="acao" action="comprar" />
            <Badge kind="confianca" value={SHOWCASE.confidence} />
          </>
        }
        actions={
          <>
            <button
              type="button"
              className="rounded-full bg-gold px-4 py-2 text-xs font-semibold text-navy transition-colors hover:bg-gold-light"
            >
              Aprovar recomendação
            </button>
            <button
              type="button"
              className="rounded-full border border-edge px-4 py-2 text-xs font-semibold text-ink-muted transition-colors hover:text-ink"
            >
              Ver racional completo
            </button>
          </>
        }
      />

      {/* Variantes de Card + ConfidenceMeter + Sparkline + TrendArrow */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">Card default</p>
          <ConfidenceMeter value={SHOWCASE.confidence} className="mt-3" />
        </Card>
        <Card variant="gold">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
            Card destaque-dourado
          </p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <p className="tnums font-display text-2xl font-semibold text-ink">US$ 226/t</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-warning">
                <TrendArrow direction="up" tone="warning" size={14} /> CBOT em alta
              </p>
            </div>
            <Sparkline data={SHOWCASE.sparklines.cbot} tone="gold" />
          </div>
        </Card>
        <Card variant="alert">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">Card alerta</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">MV Río Paraná +6 dias</p>
              <p className="mt-1 text-xs text-ink-subtle">Risco de demurrage em Pecém</p>
            </div>
            <Sparkline data={SHOWCASE.sparklines.cambio} tone="danger" />
          </div>
        </Card>
      </div>

      {/* Badge (todas as variantes) e Pill */}
      <Card>
        <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">Badges e Pills</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge kind="acao" action="comprar" />
          <Badge kind="acao" action="aguardar" />
          <Badge kind="acao" action="proteger" />
          <Badge kind="risco" level="baixo" />
          <Badge kind="risco" level="medio" />
          <Badge kind="risco" level="alto" />
          <Badge kind="confianca" value={82} />
          <Badge kind="status" label="Nova janela" tone="info" />
          <Pill icon={Ship} tone="neutral">
            FOB Argentina
          </Pill>
          <Pill icon={Anchor} tone="gold">
            Porto Pecém
          </Pill>
        </div>
      </Card>

      {/* DataTable */}
      <DataTable
        caption="Comparativo de TLC por origem e porto"
        columns={tlcColumns}
        rows={SHOWCASE.tlcTable}
        rowKey={(row) => `${row.origem}-${row.porto}`}
      />

      {/* EmptyState */}
      <EmptyState
        title="Sem exceções no momento"
        description="Quando houver desvios de rota, atraso de navio ou quebra de política de estoque, eles aparecem aqui."
      />

      {/* Matriz de feedback: toasts, fronteiras de erro e empty states v2 */}
      <SectionTitle
        eyebrow="QA interno"
        title="Sistema de feedback"
        subtitle="Toasts por tom, fronteiras de erro (nunca tela branca) e empty states v2."
      />
      <Card>
        <p className="eyebrow">Toasts</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-full border border-positive/40 px-4 py-2 text-xs font-semibold text-positive transition-colors hover:bg-positive/10"
            onClick={() => emitirToast({ tom: 'sucesso', titulo: 'Ação concluída com sucesso', descricao: 'Exemplo de toast de sucesso (esmeralda).' })}
          >
            Toast de sucesso
          </button>
          <button
            type="button"
            className="rounded-full border border-danger/40 px-4 py-2 text-xs font-semibold text-danger transition-colors hover:bg-danger/10"
            onClick={() => emitirToast({ tom: 'erro', titulo: 'Algo deu errado', descricao: 'Exemplo de toast de erro (rosa).' })}
          >
            Toast de erro
          </button>
          <button
            type="button"
            className="rounded-full border border-azure/40 px-4 py-2 text-xs font-semibold text-azure transition-colors hover:bg-azure/10"
            onClick={() => emitirToast({ tom: 'info', titulo: 'Informação do sistema', descricao: 'Exemplo de toast informativo (azure).' })}
          >
            Toast de info
          </button>
        </div>
      </Card>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <p className="eyebrow">Fronteira de erro por rota</p>
          <div className="mt-3">
            <ErrorBoundary rotulo="a seção de demonstração">
              <ComponenteInstavel />
            </ErrorBoundary>
          </div>
        </Card>
        <Card>
          <p className="eyebrow">Fronteira visual (globo 3D → mapa 2D)</p>
          <div className="mt-3">
            <FronteiraVisual
              alternativa={
                <div className="flex h-40 items-center justify-center rounded-card border border-edge/60 bg-navy/40 text-xs text-ink-subtle">
                  [ Mapa 2D de rotas — fallback estável ]
                </div>
              }
            >
              <GloboQueQuebra />
            </FronteiraVisual>
          </div>
        </Card>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <EmptyState
          tone="positive"
          title="Tudo em dia"
          description="EmptyState v2 com selo tonal (positivo) — usado na central de notificações."
        />
        <EmptyState
          compact
          tone="gold"
          icon={Ship}
          title="Nenhum resultado com estes filtros"
          description="Variante compacta com ação de recuperação."
          action={
            <button type="button" className="rounded-full border border-edge px-4 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink">
              Limpar filtros
            </button>
          }
        />
      </div>
    </div>
  )
}

/** Quebra sob demanda — prova a fronteira de erro sem tela branca. */
function ComponenteInstavel() {
  const [quebrar, setQuebrar] = useState(false)
  if (quebrar) throw new Error('Falha simulada de renderização (demo)')
  return (
    <button
      type="button"
      onClick={() => setQuebrar(true)}
      className="rounded-full border border-danger/40 px-4 py-2 text-xs font-semibold text-danger transition-colors hover:bg-danger/10"
    >
      Simular falha de renderização
    </button>
  )
}

/** Sempre quebra na montagem — simula o globo 3D indisponível (WebGL). */
function GloboQueQuebra(): never {
  throw new Error('WebGL indisponível (demo do globo 3D)')
}
