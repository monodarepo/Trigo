import { Workflow } from 'lucide-react'
import { Card, EmptyState, SectionTitle } from '../components/ui'

/** Placeholder — elo MOINHOS: quanto a integração trigo → farinha → produto rende. */
const PERGUNTAS = [
  'Quanto de margem a verticalização captura em cada etapa: trigo, moagem, massas e biscoitos?',
  'Onde a farinha própria vence a farinha de terceiros — e onde ela deixa de vencer?',
  'Que decisão de compra hoje muda a rentabilidade do produto acabado no trimestre?',
]

export default function Verticalization() {
  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Moinhos & Farinha"
        title="Rentabilidade da Verticalização"
        subtitle="A margem elo a elo: quanto cada etapa da cadeia integrada agrega sobre o custo landed do trigo, até o produto que chega à gôndola."
      />

      <EmptyState
        icon={Workflow}
        tone="gold"
        title="Em construção"
        description="Esta tela entra na próxima rodada, ligada à mesma verdade das demais — sem números provisórios até lá."
      />

      <Card>
        <p className="eyebrow">O que esta tela vai responder</p>
        <ul className="mt-3 space-y-2 text-sm text-ink-muted">
          {PERGUNTAS.map((pergunta) => (
            <li key={pergunta} className="flex gap-2.5">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-gold" aria-hidden="true" />
              <span>{pergunta}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
