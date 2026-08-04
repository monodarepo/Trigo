import { Card, SectionTitle } from '../components/ui'

export default function Copilot() {
  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Operação"
        title="Copiloto Gemini"
        subtitle="Pergunte em linguagem natural sobre a decisão do dia e os porquês."
      />
      <Card>
        <p className="text-sm text-ink-muted">
          Em construção — o conteúdo desta tela chega na próxima etapa.
        </p>
      </Card>
    </div>
  )
}
