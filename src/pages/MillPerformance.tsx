import { Factory } from 'lucide-react'
import { Card, EmptyState, SectionTitle } from '../components/ui'

/** Placeholder — elo MOINHOS: o que o trigo comprado vira dentro da fábrica. */
const PERGUNTAS = [
  'Qual o rendimento de extração de cada moinho e quanto ele custa em farinha por tonelada de trigo?',
  'Onde a parada de linha, o consumo específico e o retrabalho estão comendo margem?',
  'Que moinho deveria receber qual trigo, dado o custo landed e a especificação do produto?',
]

export default function MillPerformance() {
  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Moinhos & Farinha"
        title="Performance dos Moinhos"
        subtitle="O elo em que o trigo vira farinha: extração, custo de conversão e disponibilidade — moinho a moinho, na mesma unidade de decisão do resto da Torre."
      />

      <EmptyState
        icon={Factory}
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
