import { Card, SectionTitle } from '../components/ui'

export default function BuyRecommendation() {
  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Decisão"
        title="Recomendação de Compra"
        subtitle="Quando, quanto, de qual origem e por qual porto — otimizado pelo TLC ajustado ao risco."
      />
      <Card>
        <p className="text-sm text-ink-muted">
          Em construção — o conteúdo desta tela chega na próxima etapa.
        </p>
      </Card>
    </div>
  )
}
