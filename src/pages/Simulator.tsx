import { Card, SectionTitle } from '../components/ui'

export default function Simulator() {
  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Decisão"
        title="Simulador de Cenários"
        subtitle="Cenários de preço, câmbio e logística com impacto em CPV e EBITDA."
      />
      <Card>
        <p className="text-sm text-ink-muted">
          Em construção — o conteúdo desta tela chega na próxima etapa.
        </p>
      </Card>
    </div>
  )
}
