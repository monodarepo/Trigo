import { Warehouse } from 'lucide-react'
import { Card, EmptyState, SectionTitle } from '../components/ui'

/** Placeholder — elo TRIGO: o estoque físico e o blend que ele permite. */
const PERGUNTAS = [
  'Quantos dias de cobertura cada moinho tem, por origem e por qualidade?',
  'Qual blend é possível hoje com o que já está em silo, sem quebrar a especificação?',
  'Onde o estoque está travando capital ou nos empurrando para uma compra cara?',
]

export default function Inventory() {
  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Trigo"
        title="Estoques & Blends"
        subtitle="A ponte entre a compra e o moinho: cobertura por moinho, qualidade em silo e o blend viável com o trigo que já é nosso."
      />

      <EmptyState
        icon={Warehouse}
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
