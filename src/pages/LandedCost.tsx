import { Card, SectionTitle } from '../components/ui'

export default function LandedCost() {
  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Decisão"
        title="Total Landed Cost"
        subtitle="Decomposição do custo total landed por origem, porto e moinho."
      />
      <Card>
        <p className="text-sm text-ink-muted">
          Em construção — o conteúdo desta tela chega na próxima etapa.
        </p>
      </Card>
    </div>
  )
}
