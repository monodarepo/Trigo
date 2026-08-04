/**
 * Página temporária de QA: renderiza todos os primitivos de src/components/ui
 * com dados de exemplo (src/data/showcase.ts). Não aparece na sidebar.
 * Acesse em /showcase. Remover quando as telas reais estiverem completas.
 */
import { Anchor, Ship } from 'lucide-react'
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
    </div>
  )
}
