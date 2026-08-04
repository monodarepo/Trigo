import { Card, SectionTitle } from '../components/ui'

export default function Hedge() {
  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Decisão"
        title="Recomendação de Hedge"
        subtitle="Qual parcela da exposição proteger, em qual janela e por quê."
      />
      <Card>
        <p className="text-sm text-ink-muted">
          Em construção — o conteúdo desta tela chega na próxima etapa.
        </p>
      </Card>
    </div>
  )
}
