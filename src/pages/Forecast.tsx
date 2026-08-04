import { Card, SectionTitle } from '../components/ui'

export default function Forecast() {
  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Sinais & Previsão"
        title="Previsão de Preço e Câmbio"
        subtitle="Trajetórias de trigo CBOT, prêmios FOB e câmbio com bandas de confiança."
      />
      <Card>
        <p className="text-sm text-ink-muted">
          Em construção — o conteúdo desta tela chega na próxima etapa.
        </p>
      </Card>
    </div>
  )
}
