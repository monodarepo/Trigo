import { Handshake } from 'lucide-react'
import { Card, EmptyState, SectionTitle } from '../components/ui'

/** Placeholder — elo MARGEM: a ponta comercial que fecha o ciclo trigo → farinha → margem. */
const PERGUNTAS = [
  'Que oportunidades de venda de farinha e farelo aparecem quando sobra capacidade de moagem?',
  'Quais clientes e canais pagam pelo trigo certo — e quais destroem margem no preço atual?',
  'Qual proposta comercial vale a pena aceitar hoje, dado o custo landed já contratado?',
]

export default function Opportunities() {
  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Margem & Decisão"
        title="Oportunidades Comerciais"
        subtitle="O fim da cadeia de volta ao começo: onde vender farinha, farelo e produto acabado com a melhor margem sobre o trigo que já compramos."
      />

      <EmptyState
        icon={Handshake}
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
