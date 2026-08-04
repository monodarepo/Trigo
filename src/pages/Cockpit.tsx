import { Card, SectionTitle } from '../components/ui'

export default function Cockpit() {
  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Sinais & Previsão"
        title="Cockpit Executivo"
        subtitle="A mesma verdade para todas as áreas: recomendação do dia, exposição e exceções."
      />
      <Card>
        <p className="text-sm text-ink-muted">
          Em construção — o conteúdo desta tela chega na próxima etapa.
        </p>
      </Card>
    </div>
  )
}
