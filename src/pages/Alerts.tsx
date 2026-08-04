import { Card, SectionTitle } from '../components/ui'

export default function Alerts() {
  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Operação"
        title="Alertas Diários"
        subtitle="Exceções e gatilhos do dia, priorizados por impacto."
      />
      <Card>
        <p className="text-sm text-ink-muted">
          Em construção — o conteúdo desta tela chega na próxima etapa.
        </p>
      </Card>
    </div>
  )
}
